use starknet::ContractAddress;

#[starknet::interface]
trait IAssetRegistry<TContractState> {
    fn is_whitelisted(self: @TContractState, asset: ContractAddress) -> bool;
}

#[starknet::interface]
trait IIntentRegistry<TContractState> {
    fn commit_intent(
        ref self: TContractState,
        intent_id: felt252,
        user: ContractAddress,
        intent_hash: felt252,
        nonce: felt252,
        asset_in: ContractAddress,
        asset_out: ContractAddress,
        amount_commitment: felt252,
        min_output: u256,
        max_fee_bps: u16,
        deadline: u64,
        privacy_mode: u8,
        user_signature: Span<felt252>
    ) -> bool;

    fn cancel_intent(
        ref self: TContractState,
        intent_id: felt252,
        user_signature: Span<felt252>
    ) -> bool;

    fn get_intent(self: @TContractState, intent_id: felt252) -> Intent;

    fn get_intent_status(self: @TContractState, intent_id: felt252) -> IntentStatus;

    fn is_nonce_used(self: @TContractState, user: ContractAddress, nonce: felt252) -> bool;

    fn mark_settled(ref self: TContractState, intent_id: felt252) -> bool;

    fn mark_expired(ref self: TContractState, intent_id: felt252) -> bool;

    fn get_batch_intent_count(self: @TContractState, batch_id: felt252) -> u32;

    fn get_batch_intent_at(self: @TContractState, batch_id: felt252, index: u32) -> felt252;

    fn pause(ref self: TContractState) -> bool;

    fn unpause(ref self: TContractState) -> bool;

    fn set_batch_settlement_contract(
        ref self: TContractState,
        batch_settlement_contract: ContractAddress
    ) -> bool;
}

#[derive(Drop, Serde, starknet::Store)]
struct Intent {
    intent_id: felt252,
    user: ContractAddress,
    asset_in: ContractAddress,
    asset_out: ContractAddress,
    amount_commitment: felt252,
    min_output: u256,
    max_fee_bps: u16,
    deadline: u64,
    privacy_mode: u8,
    status: IntentStatus,
}

#[derive(Drop, Serde, starknet::Store, PartialEq, Default)]
enum IntentStatus {
    #[default]
    NONE: (),
    PENDING: (),
    SETTLED: (),
    CANCELED: (),
    EXPIRED: (),
}

#[starknet::contract]
mod IntentRegistry {
    use super::{Intent, IntentStatus, IIntentRegistry};
    use super::{IAssetRegistryDispatcher, IAssetRegistryDispatcherTrait};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::Map;
    use starknet::storage::{
        StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess
    };
    use core::pedersen::pedersen;
    use core::traits::Into;

    #[storage]
    struct Storage {
        intent_by_id: Map<felt252, Intent>,
        user_nonces: Map<(ContractAddress, felt252), bool>,
        batch_intents: Map<(felt252, u32), felt252>,
        batch_intent_count: Map<felt252, u32>,
        batch_settlement_contract: ContractAddress,
        asset_registry_contract: ContractAddress,
        admin: ContractAddress,
        paused: bool,
        batch_window_seconds: u64,
        genesis_timestamp: u64,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        IntentCommitted: IntentCommitted,
        IntentCanceled: IntentCanceled,
        IntentSettled: IntentSettled,
        IntentExpired: IntentExpired,
        BatchSettlementContractUpdated: BatchSettlementContractUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct IntentCommitted {
        intent_id: felt252,
        intent_hash: felt252,
        batch_id: felt252,
        user: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct IntentCanceled {
        intent_id: felt252,
        batch_id: felt252,
        user: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct IntentSettled {
        intent_id: felt252,
        batch_id: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct IntentExpired {
        intent_id: felt252,
        batch_id: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct BatchSettlementContractUpdated {
        previous: ContractAddress,
        updated: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        batch_settlement_contract: ContractAddress,
        asset_registry_contract: ContractAddress,
        batch_window_seconds: u64,
        genesis_timestamp: u64
    ) {
        self.admin.write(admin);
        self.batch_settlement_contract.write(batch_settlement_contract);
        self.asset_registry_contract.write(asset_registry_contract);
        self.paused.write(false);
        self.batch_window_seconds.write(batch_window_seconds);
        self.genesis_timestamp.write(genesis_timestamp);
    }

    #[abi(embed_v0)]
    impl IntentRegistryImpl of IIntentRegistry<ContractState> {
        fn commit_intent(
            ref self: ContractState,
            intent_id: felt252,
            user: ContractAddress,
            intent_hash: felt252,
            nonce: felt252,
            asset_in: ContractAddress,
            asset_out: ContractAddress,
            amount_commitment: felt252,
            min_output: u256,
            max_fee_bps: u16,
            deadline: u64,
            privacy_mode: u8,
            user_signature: Span<felt252>
        ) -> bool {
            assert(!self.paused.read(), 'Contract is paused');

            let current_time = get_block_timestamp();
            assert(deadline > current_time, 'DEADLINE_PASSED');

            assert(!self.user_nonces.read((user, nonce)), 'NONCE_ALREADY_USED');

            assert(privacy_mode <= 2, 'INVALID_PRIVACY_MODE');

            self._verify_signature(user, intent_hash, user_signature);

            self._validate_assets(asset_in, asset_out);

            let computed_intent_hash = self._compute_intent_hash(
                user,
                asset_in,
                asset_out,
                amount_commitment,
                min_output,
                max_fee_bps,
                deadline,
                privacy_mode,
                nonce
            );
            assert(computed_intent_hash == intent_hash, 'INTENT_HASH_MISMATCH');

            let computed_intent_id = self._compute_intent_id(user, nonce, intent_hash);
            assert(computed_intent_id == intent_id, 'INTENT_ID_MISMATCH');

            let existing = self.intent_by_id.read(intent_id);
            assert(existing.status == IntentStatus::NONE(()), 'INTENT_ALREADY_EXISTS');

            self.user_nonces.write((user, nonce), true);

            let intent = Intent {
                intent_id,
                user,
                asset_in,
                asset_out,
                amount_commitment,
                min_output,
                max_fee_bps,
                deadline,
                privacy_mode,
                status: IntentStatus::PENDING(()),
            };

            self.intent_by_id.write(intent_id, intent);

            let batch_id = self._compute_batch_id(current_time);

            let count = self.batch_intent_count.read(batch_id);
            self.batch_intents.write((batch_id, count), intent_id);
            self.batch_intent_count.write(batch_id, count + 1);

            self.emit(IntentCommitted {
                intent_id,
                intent_hash,
                batch_id,
                user,
            });

            true
        }

        fn cancel_intent(
            ref self: ContractState,
            intent_id: felt252,
            user_signature: Span<felt252>
        ) -> bool {
            let intent = self.intent_by_id.read(intent_id);
            let intent_user = intent.user;
            
            assert(intent.status == IntentStatus::PENDING(()), 'Intent not pending');

            let current_time = get_block_timestamp();
            assert(current_time < intent.deadline, 'Intent expired');

            self._verify_signature(intent_user, intent_id, user_signature);

            let updated_intent = Intent {
                status: IntentStatus::CANCELED(()),
                ..intent
            };
            self.intent_by_id.write(intent_id, updated_intent);

            let batch_id = self._compute_batch_id(current_time);

            self.emit(IntentCanceled {
                intent_id,
                batch_id,
                user: intent_user,
            });

            true
        }

        fn get_intent(self: @ContractState, intent_id: felt252) -> Intent {
            self.intent_by_id.read(intent_id)
        }

        fn get_intent_status(self: @ContractState, intent_id: felt252) -> IntentStatus {
            let intent = self.intent_by_id.read(intent_id);
            intent.status
        }

        fn is_nonce_used(self: @ContractState, user: ContractAddress, nonce: felt252) -> bool {
            self.user_nonces.read((user, nonce))
        }

        fn mark_settled(ref self: ContractState, intent_id: felt252) -> bool {
            let caller = get_caller_address();
            assert(caller == self.batch_settlement_contract.read(), 'Unauthorized caller');

            let intent = self.intent_by_id.read(intent_id);
            assert(intent.status == IntentStatus::PENDING(()), 'Intent not pending');

            let updated_intent = Intent {
                status: IntentStatus::SETTLED(()),
                ..intent
            };
            self.intent_by_id.write(intent_id, updated_intent);

            let batch_id = self._compute_batch_id(get_block_timestamp());

            self.emit(IntentSettled {
                intent_id,
                batch_id,
            });

            true
        }

        fn mark_expired(ref self: ContractState, intent_id: felt252) -> bool {
            let intent = self.intent_by_id.read(intent_id);
            assert(intent.status == IntentStatus::PENDING(()), 'Intent not pending');

            let current_time = get_block_timestamp();
            assert(current_time >= intent.deadline, 'Intent not expired');

            let updated_intent = Intent {
                status: IntentStatus::EXPIRED(()),
                ..intent
            };
            self.intent_by_id.write(intent_id, updated_intent);

            let batch_id = self._compute_batch_id(current_time);

            self.emit(IntentExpired {
                intent_id,
                batch_id,
            });

            true
        }

        fn get_batch_intent_count(self: @ContractState, batch_id: felt252) -> u32 {
            self.batch_intent_count.read(batch_id)
        }

        fn get_batch_intent_at(self: @ContractState, batch_id: felt252, index: u32) -> felt252 {
            self.batch_intents.read((batch_id, index))
        }

        fn pause(ref self: ContractState) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.paused.write(true);
            true
        }

        fn unpause(ref self: ContractState) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.paused.write(false);
            true
        }

        fn set_batch_settlement_contract(
            ref self: ContractState,
            batch_settlement_contract: ContractAddress
        ) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');

            let current = self.batch_settlement_contract.read();
            assert(current == zero_address(), 'BATCH_SETTLEMENT_ALREADY_SET');
            assert(batch_settlement_contract != zero_address(), 'INVALID_BATCH_SETTLEMENT');

            self.batch_settlement_contract.write(batch_settlement_contract);
            self.emit(BatchSettlementContractUpdated {
                previous: current,
                updated: batch_settlement_contract,
            });
            true
        }
    }

    fn zero_address() -> ContractAddress {
        0.try_into().unwrap()
    }

    #[starknet::interface]
    trait IAccount<TContractState> {
        fn is_valid_signature(
            self: @TContractState,
            message_hash: felt252,
            signature: Span<felt252>
        ) -> bool;
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn _verify_signature(
            self: @ContractState,
            user: ContractAddress,
            message_hash: felt252,
            signature: Span<felt252>
        ) {
            assert(signature.len() == 2, 'Invalid signature length');
            let account = IAccountDispatcher { contract_address: user };
            let is_valid = account.is_valid_signature(message_hash, signature);
            assert(is_valid, 'INVALID_SIGNATURE');
        }

        fn _validate_assets(
            self: @ContractState,
            asset_in: ContractAddress,
            asset_out: ContractAddress
        ) {
            let asset_registry = self.asset_registry_contract.read();

            let asset_registry_dispatcher = IAssetRegistryDispatcher {
                contract_address: asset_registry
            };

            let asset_in_valid = asset_registry_dispatcher.is_whitelisted(asset_in);
            assert(asset_in_valid, 'ASSET_IN_NOT_WHITELISTED');

            let asset_out_valid = asset_registry_dispatcher.is_whitelisted(asset_out);
            assert(asset_out_valid, 'ASSET_OUT_NOT_WHITELISTED');
        }

        fn _compute_batch_id(self: @ContractState, timestamp: u64) -> felt252 {
            let genesis_timestamp = self.genesis_timestamp.read();
            assert(timestamp >= genesis_timestamp, 'INVALID_TIMESTAMP');
            let batch_window = self.batch_window_seconds.read();
            assert(batch_window > 0, 'INVALID_BATCH_WINDOW');
            let batch_number = (timestamp - genesis_timestamp) / batch_window;
            batch_number.into()
        }

        fn _compute_intent_hash(
            self: @ContractState,
            user: ContractAddress,
            asset_in: ContractAddress,
            asset_out: ContractAddress,
            amount_commitment: felt252,
            min_output: u256,
            max_fee_bps: u16,
            deadline: u64,
            privacy_mode: u8,
            nonce: felt252
        ) -> felt252 {
            let mut hash = pedersen(user.into(), asset_in.into());
            hash = pedersen(hash, asset_out.into());
            hash = pedersen(hash, amount_commitment);
            let min_output_hash = pedersen(min_output.low.into(), min_output.high.into());
            hash = pedersen(hash, min_output_hash);
            hash = pedersen(hash, max_fee_bps.into());
            hash = pedersen(hash, deadline.into());
            hash = pedersen(hash, privacy_mode.into());
            hash = pedersen(hash, nonce);
            hash
        }

        fn _compute_intent_id(
            self: @ContractState,
            user: ContractAddress,
            nonce: felt252,
            intent_hash: felt252
        ) -> felt252 {
            let inner = pedersen(user.into(), nonce);
            pedersen(inner, intent_hash)
        }
    }
}
