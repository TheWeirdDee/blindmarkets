use starknet::ContractAddress;

#[starknet::interface]
trait IMockIntentRegistry<TContractState> {
    fn get_intent(self: @TContractState, intent_id: felt252) -> Intent;
    fn mark_settled(ref self: TContractState, intent_id: felt252) -> bool;
    fn get_batch_intent_count(self: @TContractState, batch_id: felt252) -> u32;
    fn get_batch_intent_at(self: @TContractState, batch_id: felt252, index: u32) -> felt252;
    fn set_intent(
        ref self: TContractState,
        intent_id: felt252,
        user: ContractAddress,
        asset_in: ContractAddress,
        asset_out: ContractAddress,
        amount_commitment: felt252,
        min_output: u256,
        max_fee_bps: u16,
        deadline: u64,
        privacy_mode: u8,
        status: IntentStatus
    ) -> bool;
    fn add_intent_to_batch(ref self: TContractState, batch_id: felt252, intent_id: felt252) -> bool;
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
mod MockIntentRegistry {
    use super::{IMockIntentRegistry, Intent, IntentStatus};
    use starknet::ContractAddress;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

    #[storage]
    struct Storage {
        intent_by_id: Map<felt252, Intent>,
        batch_intents: Map<(felt252, u32), felt252>,
        batch_intent_count: Map<felt252, u32>,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {}

    #[abi(embed_v0)]
    impl MockIntentRegistryImpl of IMockIntentRegistry<ContractState> {
        fn get_intent(self: @ContractState, intent_id: felt252) -> Intent {
            self.intent_by_id.read(intent_id)
        }

        fn mark_settled(ref self: ContractState, intent_id: felt252) -> bool {
            let intent = self.intent_by_id.read(intent_id);
            let updated_intent = Intent {
                status: IntentStatus::SETTLED(()),
                ..intent
            };
            self.intent_by_id.write(intent_id, updated_intent);
            true
        }

        fn get_batch_intent_count(self: @ContractState, batch_id: felt252) -> u32 {
            self.batch_intent_count.read(batch_id)
        }

        fn get_batch_intent_at(self: @ContractState, batch_id: felt252, index: u32) -> felt252 {
            self.batch_intents.read((batch_id, index))
        }

        fn set_intent(
            ref self: ContractState,
            intent_id: felt252,
            user: ContractAddress,
            asset_in: ContractAddress,
            asset_out: ContractAddress,
            amount_commitment: felt252,
            min_output: u256,
            max_fee_bps: u16,
            deadline: u64,
            privacy_mode: u8,
            status: IntentStatus
        ) -> bool {
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
                status,
            };
            self.intent_by_id.write(intent_id, intent);
            true
        }

        fn add_intent_to_batch(ref self: ContractState, batch_id: felt252, intent_id: felt252) -> bool {
            let count = self.batch_intent_count.read(batch_id);
            self.batch_intents.write((batch_id, count), intent_id);
            self.batch_intent_count.write(batch_id, count + 1);
            true
        }
    }
}
