use starknet::ContractAddress;

#[derive(Drop, Serde)]
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

#[derive(Drop, Serde, PartialEq)]
enum IntentStatus {
    NONE: (),
    PENDING: (),
    SETTLED: (),
    CANCELED: (),
    EXPIRED: (),
}

#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256
    ) -> bool;

    fn transfer(
        ref self: TContractState,
        recipient: ContractAddress,
        amount: u256
    ) -> bool;

    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
}

#[starknet::interface]
trait IIntentRegistry<TContractState> {
    fn get_intent(self: @TContractState, intent_id: felt252) -> Intent;
    fn mark_settled(ref self: TContractState, intent_id: felt252) -> bool;
    fn get_batch_intent_count(self: @TContractState, batch_id: felt252) -> u32;
    fn get_batch_intent_at(self: @TContractState, batch_id: felt252, index: u32) -> felt252;
}

#[starknet::interface]
trait IBatchSettlement<TContractState> {
    fn settle_batch(
        ref self: TContractState,
        batch_id: felt252,
        solver: ContractAddress,
        execution_plan: Span<Transfer>,
        proofs: Span<felt252>
    ) -> bool;

    fn verify_constraints(
        self: @TContractState,
        intent_id: felt252,
        output_amount: u256,
        proof: felt252
    ) -> bool;

    fn get_settlement(self: @TContractState, batch_id: felt252) -> Settlement;

    fn set_intent_registry_contract(
        ref self: TContractState,
        intent_registry_contract: ContractAddress
    ) -> bool;

    fn set_batch_auction_contract(
        ref self: TContractState,
        batch_auction_contract: ContractAddress
    ) -> bool;

    fn set_solver_bond_contract(
        ref self: TContractState,
        solver_bond_contract: ContractAddress
    ) -> bool;

    fn set_proof_verifier_contract(
        ref self: TContractState,
        proof_verifier_contract: ContractAddress
    ) -> bool;
}

#[starknet::interface]
trait IBatchAuction<TContractState> {
    fn get_winning_solver(self: @TContractState, batch_id: felt252) -> ContractAddress;
    fn get_solution_count(self: @TContractState, batch_id: felt252) -> u32;
    fn get_solution_details(self: @TContractState, batch_id: felt252, solution_index: u32) -> Solution;
}

#[derive(Drop, Serde, starknet::Store, Copy)]
struct Solution {
    batch_id: felt252,
    solver: ContractAddress,
    solution_commitment: felt252,
    estimated_surplus: u256,
    solver_fee_bps: u16,
    submission_time: u64,
}

#[starknet::interface]
trait ISolverBond<TContractState> {
    fn slash(
        ref self: TContractState,
        solver: ContractAddress,
        amount: u256,
        reason: felt252,
        recipients: Span<ContractAddress>
    ) -> bool;
    fn get_solver_info(self: @TContractState, solver: ContractAddress) -> SolverInfo;
    fn record_settlement_success(ref self: TContractState, solver: ContractAddress) -> bool;
    fn record_settlement_failure(ref self: TContractState, solver: ContractAddress) -> bool;
    fn set_locked(ref self: TContractState, solver: ContractAddress, locked: bool) -> bool;
}

#[derive(Drop, Serde)]
struct SolverInfo {
    solver: ContractAddress,
    bond_amount: u256,
    locked: bool,
    successful_settlements: u32,
    failed_settlements: u32,
    slash_count_30d: u8,
    last_slash_timestamp: u64,
    withdrawal_request_time: u64,
    withdrawal_request_amount: u256,
    blacklisted: bool,
}

#[starknet::interface]
trait IProofVerifier<TContractState> {
    fn verify_proof(
        self: @TContractState,
        intent_id: felt252,
        output_amount: u256,
        proof: felt252
    ) -> bool;
}

#[derive(Drop, Serde, starknet::Store, Copy)]
struct Transfer {
    from: ContractAddress,
    to: ContractAddress,
    asset: ContractAddress,
    amount: u256,
}

#[derive(Drop, Serde, starknet::Store)]
struct Settlement {
    batch_id: felt252,
    solver: ContractAddress,
    settlement_hash: felt252,
    executed: bool,
    transfer_count: u32,
}

#[starknet::contract]
mod BatchSettlement {
    use super::{IBatchSettlement, Transfer, Settlement};
    use super::{
        IERC20Dispatcher,
        IERC20DispatcherTrait,
        ISolverBondDispatcher,
        ISolverBondDispatcherTrait,
        IBatchAuctionDispatcher,
        IBatchAuctionDispatcherTrait,
        IIntentRegistryDispatcher,
        IIntentRegistryDispatcherTrait,
        IProofVerifierDispatcher,
        IProofVerifierDispatcherTrait
    };
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess
    };
    use core::pedersen::pedersen;
    use core::array::ArrayTrait;

    #[storage]
    struct Storage {
        settlements: Map<felt252, Settlement>,
        settlement_transfers: Map<(felt252, u32), Transfer>,
        intent_registry_contract: ContractAddress,
        batch_auction_contract: ContractAddress,
        solver_bond_contract: ContractAddress,
        coordinator: ContractAddress,
        admin: ContractAddress,
        treasury: ContractAddress,
        slashing_user_pool: ContractAddress,
        slashing_whistleblower_pool: ContractAddress,
        proof_verifier_contract: ContractAddress,
        slash_bps_constraint: u16,
        slash_bps_commitment_mismatch: u16,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        BatchSettled: BatchSettled,
        BatchSettlementFailed: BatchSettlementFailed,
        TransferExecuted: TransferExecuted,
        IntentRegistryContractUpdated: IntentRegistryContractUpdated,
        BatchAuctionContractUpdated: BatchAuctionContractUpdated,
        SolverBondContractUpdated: SolverBondContractUpdated,
        ProofVerifierContractUpdated: ProofVerifierContractUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct BatchSettled {
        batch_id: felt252,
        settlement_hash: felt252,
        solver: ContractAddress,
        transfer_count: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct BatchSettlementFailed {
        batch_id: felt252,
        failure_reason: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct TransferExecuted {
        from: ContractAddress,
        to: ContractAddress,
        asset: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct IntentRegistryContractUpdated {
        previous: ContractAddress,
        updated: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct BatchAuctionContractUpdated {
        previous: ContractAddress,
        updated: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct SolverBondContractUpdated {
        previous: ContractAddress,
        updated: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct ProofVerifierContractUpdated {
        previous: ContractAddress,
        updated: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        intent_registry_contract: ContractAddress,
        batch_auction_contract: ContractAddress,
        solver_bond_contract: ContractAddress,
        coordinator: ContractAddress,
        treasury: ContractAddress,
        slashing_user_pool: ContractAddress,
        slashing_whistleblower_pool: ContractAddress,
        proof_verifier_contract: ContractAddress,
        slash_bps_constraint: u16,
        slash_bps_commitment_mismatch: u16
    ) {
        self.admin.write(admin);
        self.intent_registry_contract.write(intent_registry_contract);
        self.batch_auction_contract.write(batch_auction_contract);
        self.solver_bond_contract.write(solver_bond_contract);
        self.coordinator.write(coordinator);
        self.treasury.write(treasury);
        self.slashing_user_pool.write(slashing_user_pool);
        self.slashing_whistleblower_pool.write(slashing_whistleblower_pool);
        self.proof_verifier_contract.write(proof_verifier_contract);
        self.slash_bps_constraint.write(slash_bps_constraint);
        self.slash_bps_commitment_mismatch.write(slash_bps_commitment_mismatch);
    }

    #[abi(embed_v0)]
    impl BatchSettlementImpl of IBatchSettlement<ContractState> {
        fn settle_batch(
            ref self: ContractState,
            batch_id: felt252,
            solver: ContractAddress,
            execution_plan: Span<Transfer>,
            proofs: Span<felt252>
        ) -> bool {
            let caller = get_caller_address();
            let winning_solver = self._get_winning_solver(batch_id);
            assert(solver == winning_solver, 'SOLVER_NOT_WINNER');
            assert(
                caller == self.coordinator.read() || caller == winning_solver,
                'UNAUTHORIZED_CALLER'
            );

            let existing_settlement = self.settlements.read(batch_id);
            assert(!existing_settlement.executed, 'Batch already settled');

            let transfer_count = execution_plan.len();
            assert(transfer_count > 0, 'Empty execution plan');

            let commitment = self._get_solution_commitment(batch_id, winning_solver);
            let plan_hash = self._compute_settlement_hash(batch_id, execution_plan);
            if plan_hash != commitment {
                self._slash_solver(
                    winning_solver,
                    self.slash_bps_commitment_mismatch.read(),
                    'COMMITMENT_MISMATCH'
                );
                let bond = ISolverBondDispatcher {
                    contract_address: self.solver_bond_contract.read()
                };
                let _ = bond.record_settlement_failure(winning_solver);
                let _ = bond.set_locked(winning_solver, false);
                self.emit(BatchSettlementFailed {
                    batch_id,
                    failure_reason: 'COMMITMENT_MISMATCH',
                });
                return false;
            }

            let (ok, failure_reason) = self._verify_intent_constraints(
                batch_id,
                winning_solver,
                execution_plan,
                proofs
            );
            if !ok {
                self.emit(BatchSettlementFailed {
                    batch_id,
                    failure_reason,
                });
                return false;
            }

            let mut i: u32 = 0;
            loop {
                if i >= transfer_count {
                    break;
                }

                let transfer = *execution_plan.at(i);

                let token_dispatcher = IERC20Dispatcher {
                    contract_address: transfer.asset
                };

                let balance_before = token_dispatcher.balance_of(transfer.from);
                assert(balance_before >= transfer.amount, 'Insufficient token balance');

                let transfer_success = token_dispatcher.transfer_from(
                    transfer.from,
                    transfer.to,
                    transfer.amount
                );

                assert(transfer_success, 'Token transfer failed');

                let balance_after = token_dispatcher.balance_of(transfer.from);
                assert(balance_before - balance_after == transfer.amount, 'Balance mismatch');

                self.emit(TransferExecuted {
                    from: transfer.from,
                    to: transfer.to,
                    asset: transfer.asset,
                    amount: transfer.amount,
                });

                self.settlement_transfers.write((batch_id, i), transfer);
                i += 1;
            };

            self._verify_balance_conservation(execution_plan);
            self._mark_intents_settled(batch_id);

            let bond = ISolverBondDispatcher {
                contract_address: self.solver_bond_contract.read()
            };
            let _ = bond.record_settlement_success(winning_solver);
            let _ = bond.set_locked(winning_solver, false);

            let settlement_hash = plan_hash;

            let settlement = Settlement {
                batch_id,
                solver,
                settlement_hash,
                executed: true,
                transfer_count,
            };

            self.settlements.write(batch_id, settlement);

            self.emit(BatchSettled {
                batch_id,
                settlement_hash,
                solver,
                transfer_count,
            });

            true
        }

        fn verify_constraints(
            self: @ContractState,
            intent_id: felt252,
            output_amount: u256,
            proof: felt252
        ) -> bool {
            let intent_registry = self.intent_registry_contract.read();
            let intent_registry_dispatcher = IIntentRegistryDispatcher {
                contract_address: intent_registry
            };

            let intent = intent_registry_dispatcher.get_intent(intent_id);

            let current_time = get_block_timestamp();
            if current_time > intent.deadline {
                return false;
            }

            if output_amount < intent.min_output {
                return false;
            }

            if intent.privacy_mode != 0 {
                let verifier = IProofVerifierDispatcher {
                    contract_address: self.proof_verifier_contract.read()
                };
                let proof_valid = verifier.verify_proof(intent_id, output_amount, proof);
                if !proof_valid {
                    return false;
                }
            }

            true
        }

        fn get_settlement(self: @ContractState, batch_id: felt252) -> Settlement {
            self.settlements.read(batch_id)
        }

        fn set_intent_registry_contract(
            ref self: ContractState,
            intent_registry_contract: ContractAddress
        ) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            assert(intent_registry_contract != zero_address(), 'INVALID_INTENT_REGISTRY');

            let previous = self.intent_registry_contract.read();
            self.intent_registry_contract.write(intent_registry_contract);
            self.emit(IntentRegistryContractUpdated {
                previous,
                updated: intent_registry_contract,
            });
            true
        }

        fn set_batch_auction_contract(
            ref self: ContractState,
            batch_auction_contract: ContractAddress
        ) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            assert(batch_auction_contract != zero_address(), 'INVALID_BATCH_AUCTION');

            let previous = self.batch_auction_contract.read();
            self.batch_auction_contract.write(batch_auction_contract);
            self.emit(BatchAuctionContractUpdated {
                previous,
                updated: batch_auction_contract,
            });
            true
        }

        fn set_solver_bond_contract(
            ref self: ContractState,
            solver_bond_contract: ContractAddress
        ) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            assert(solver_bond_contract != zero_address(), 'INVALID_SOLVER_BOND');

            let previous = self.solver_bond_contract.read();
            self.solver_bond_contract.write(solver_bond_contract);
            self.emit(SolverBondContractUpdated {
                previous,
                updated: solver_bond_contract,
            });
            true
        }

        fn set_proof_verifier_contract(
            ref self: ContractState,
            proof_verifier_contract: ContractAddress
        ) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            assert(proof_verifier_contract != zero_address(), 'INVALID_PROOF_VERIFIER');

            let previous = self.proof_verifier_contract.read();
            self.proof_verifier_contract.write(proof_verifier_contract);
            self.emit(ProofVerifierContractUpdated {
                previous,
                updated: proof_verifier_contract,
            });
            true
        }
    }

    fn zero_address() -> ContractAddress {
        0.try_into().unwrap()
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn _compute_settlement_hash(
            self: @ContractState,
            batch_id: felt252,
            execution_plan: Span<Transfer>
        ) -> felt252 {
            let mut hash = batch_id;
            
            let mut i: u32 = 0;
            loop {
                if i >= execution_plan.len() {
                    break;
                }

                let transfer = *execution_plan.at(i);
                
                let amount_hash = pedersen(transfer.amount.low.into(), transfer.amount.high.into());
                let transfer_hash = pedersen(
                    pedersen(transfer.from.into(), transfer.to.into()),
                    pedersen(transfer.asset.into(), amount_hash)
                );
                
                hash = pedersen(hash, transfer_hash);

                i += 1;
            };

            hash
        }

        fn _get_winning_solver(self: @ContractState, batch_id: felt252) -> ContractAddress {
            let auction = IBatchAuctionDispatcher {
                contract_address: self.batch_auction_contract.read()
            };
            auction.get_winning_solver(batch_id)
        }

        fn _get_solution_commitment(
            self: @ContractState,
            batch_id: felt252,
            solver: ContractAddress
        ) -> felt252 {
            let auction = IBatchAuctionDispatcher {
                contract_address: self.batch_auction_contract.read()
            };
            let count = auction.get_solution_count(batch_id);
            let mut i: u32 = 0;
            loop {
                if i >= count {
                    break;
                }
                let solution = auction.get_solution_details(batch_id, i);
                if solution.solver == solver {
                    return solution.solution_commitment;
                }
                i += 1;
            };
            0
        }

        fn _verify_intent_constraints(
            ref self: ContractState,
            batch_id: felt252,
            solver: ContractAddress,
            execution_plan: Span<Transfer>,
            proofs: Span<felt252>
        ) -> (bool, felt252) {
            let intent_registry = self.intent_registry_contract.read();
            let intent_registry_dispatcher = IIntentRegistryDispatcher {
                contract_address: intent_registry
            };

            let intent_count = intent_registry_dispatcher.get_batch_intent_count(batch_id);
            if proofs.len() != intent_count {
                return (false, 'INVALID_PROOF_COUNT');
            }

            let mut i: u32 = 0;
            loop {
                if i >= intent_count {
                    break;
                }
                let intent_id = intent_registry_dispatcher.get_batch_intent_at(batch_id, i);
                let intent = intent_registry_dispatcher.get_intent(intent_id);
                assert(intent.status == super::IntentStatus::PENDING(()), 'INTENT_NOT_PENDING');

                let current_time = get_block_timestamp();
                if current_time > intent.deadline {
                    return (false, 'INTENT_EXPIRED');
                }

                if intent.privacy_mode != 0 {
                    let verifier = IProofVerifierDispatcher {
                        contract_address: self.proof_verifier_contract.read()
                    };
                    let proof = *proofs.at(i);
                    let output_amount = self._sum_transfers_to_user(
                        execution_plan,
                        intent.user,
                        intent.asset_out
                    );
                    let proof_valid = verifier.verify_proof(intent_id, output_amount, proof);
                    if !proof_valid {
                        return (false, 'INVALID_PROOF');
                    }
                }

                let output_amount = self._sum_transfers_to_user(
                    execution_plan,
                    intent.user,
                    intent.asset_out
                );

                if output_amount < intent.min_output {
                    self._slash_solver(solver, self.slash_bps_constraint.read(), 'CONSTRAINT_VIOLATION');
                    let bond = ISolverBondDispatcher {
                        contract_address: self.solver_bond_contract.read()
                    };
                    let _ = bond.record_settlement_failure(solver);
                    let _ = bond.set_locked(solver, false);
                    return (false, 'CONSTRAINT_VIOLATION');
                }

                i += 1;
            };
            (true, 0)
        }

        fn _sum_transfers_to_user(
            self: @ContractState,
            execution_plan: Span<Transfer>,
            user: ContractAddress,
            asset: ContractAddress
        ) -> u256 {
            let mut total: u256 = 0;
            let mut i: u32 = 0;
            loop {
                if i >= execution_plan.len() {
                    break;
                }
                let transfer = *execution_plan.at(i);
                if transfer.to == user && transfer.asset == asset {
                    total += transfer.amount;
                }
                i += 1;
            };
            total
        }

        fn _verify_balance_conservation(self: @ContractState, execution_plan: Span<Transfer>) {
            let mut assets: Array<ContractAddress> = ArrayTrait::new();

            let mut i: u32 = 0;
            loop {
                if i >= execution_plan.len() {
                    break;
                }
                let transfer = *execution_plan.at(i);
                let (index, exists) = self._find_asset_index(assets.span(), transfer.asset);
                if exists {
                    let _ = index;
                } else {
                    assets.append(transfer.asset);
                }
                i += 1;
            };

            let mut j: u32 = 0;
            loop {
                if j >= assets.len() {
                    break;
                }
                let asset = *assets.at(j);
                let mut total_in: u256 = 0;
                let mut total_out: u256 = 0;

                let mut k: u32 = 0;
                loop {
                    if k >= execution_plan.len() {
                        break;
                    }
                    let transfer = *execution_plan.at(k);
                    if transfer.asset == asset {
                        total_in += transfer.amount;
                        total_out += transfer.amount;
                    }
                    k += 1;
                };

                assert(total_in == total_out, 'BALANCE_CONSERVATION_FAILED');
                j += 1;
            };
        }

        fn _find_asset_index(
            self: @ContractState,
            assets: Span<ContractAddress>,
            asset: ContractAddress
        ) -> (u32, bool) {
            let mut i: u32 = 0;
            loop {
                if i >= assets.len() {
                    break;
                }
                if *assets.at(i) == asset {
                    return (i, true);
                }
                i += 1;
            };
            (0, false)
        }

        fn _slash_solver(ref self: ContractState, solver: ContractAddress, slash_bps: u16, reason: felt252) {
            let bond = ISolverBondDispatcher {
                contract_address: self.solver_bond_contract.read()
            };
            let info = bond.get_solver_info(solver);
            let slash_amount = (info.bond_amount * slash_bps.into()) / 10000;
            let recipients = array![
                self.slashing_user_pool.read(),
                self.treasury.read(),
                self.slashing_whistleblower_pool.read()
            ]
            .span();
            let slashed = bond.slash(solver, slash_amount, reason, recipients);
            assert(slashed, 'SLASH_FAILED');
        }

        fn _mark_intents_settled(ref self: ContractState, batch_id: felt252) {
            let intent_registry = self.intent_registry_contract.read();
            let intent_registry_dispatcher = IIntentRegistryDispatcher {
                contract_address: intent_registry
            };
            let intent_count = intent_registry_dispatcher.get_batch_intent_count(batch_id);
            let mut i: u32 = 0;
            loop {
                if i >= intent_count {
                    break;
                }
                let intent_id = intent_registry_dispatcher.get_batch_intent_at(batch_id, i);
                let settled = intent_registry_dispatcher.mark_settled(intent_id);
                assert(settled, 'INTENT_SETTLE_FAILED');
                i += 1;
            };
        }
    }
}
