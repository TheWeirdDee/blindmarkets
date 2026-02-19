use starknet::ContractAddress;

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
trait ISolverBond<TContractState> {
    fn get_solver_info(self: @TContractState, solver: ContractAddress) -> SolverInfo;
    fn get_reputation(self: @TContractState, solver: ContractAddress) -> u256;
    fn get_minimum_bond(self: @TContractState) -> u256;
    fn slash(
        ref self: TContractState,
        solver: ContractAddress,
        amount: u256,
        reason: felt252,
        recipients: Span<ContractAddress>
    ) -> bool;
    fn set_locked(ref self: TContractState, solver: ContractAddress, locked: bool) -> bool;
}

#[starknet::interface]
trait IBatchAuction<TContractState> {
    fn create_batch(
        ref self: TContractState,
        batch_id: felt252,
        close_time: u64,
        intent_count: u32
    ) -> bool;

    fn submit_solution(
        ref self: TContractState,
        batch_id: felt252,
        solution_commitment: felt252,
        estimated_surplus: u256,
        solver_fee_bps: u16,
        bond_proof: felt252
    ) -> bool;

    fn finalize_auction(ref self: TContractState, batch_id: felt252) -> ContractAddress;

    fn get_winning_solver(self: @TContractState, batch_id: felt252) -> ContractAddress;

    fn get_batch_details(self: @TContractState, batch_id: felt252) -> Batch;

    fn get_solution_details(self: @TContractState, batch_id: felt252, solution_index: u32) -> Solution;

    fn get_solution_count(self: @TContractState, batch_id: felt252) -> u32;

    fn slash_solver(
        ref self: TContractState,
        solver: ContractAddress,
        reason: felt252,
        slash_amount: u256
    ) -> bool;
}

#[derive(Drop, Serde, starknet::Store, PartialEq)]
#[allow(starknet::store_no_default_variant)]
enum BatchStatus {
    OPEN: (),
    AUCTION: (),
    SETTLED: (),
    FAILED: (),
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

#[derive(Drop, Serde, starknet::Store)]
struct Batch {
    batch_id: felt252,
    close_time: u64,
    intent_count: u32,
    auction_deadline: u64,
    winning_solver: ContractAddress,
    status: BatchStatus,
}

#[starknet::contract]
mod BatchAuction {
    use super::{IBatchAuction, Solution, Batch, BatchStatus};
    use super::{ISolverBondDispatcher, ISolverBondDispatcherTrait};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess
    };
    use core::traits::TryInto;

    #[storage]
    struct Storage {
        batches: Map<felt252, Batch>,
        solutions: Map<(felt252, u32), Solution>,
        solution_count: Map<felt252, u32>,
        solver_reputation: Map<ContractAddress, u256>,
        solver_bond_contract: ContractAddress,
        batch_settlement_contract: ContractAddress,
        coordinator: ContractAddress,
        admin: ContractAddress,
        slashing_user_pool: ContractAddress,
        slashing_whistleblower_pool: ContractAddress,
        solution_window_seconds: u64,
        auction_resolution_seconds: u64,
        surplus_weight: u256,
        fee_weight: u256,
        reputation_weight: u256,
        batch_exists: Map<felt252, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SolutionSubmitted: SolutionSubmitted,
        AuctionFinalized: AuctionFinalized,
        SolverSelected: SolverSelected,
        BatchFailed: BatchFailed,
    }

    #[derive(Drop, starknet::Event)]
    struct SolutionSubmitted {
        batch_id: felt252,
        solver: ContractAddress,
        solution_commitment: felt252,
        estimated_surplus: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct AuctionFinalized {
        batch_id: felt252,
        winning_solver: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct SolverSelected {
        batch_id: felt252,
        solver: ContractAddress,
        solution_commitment: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct BatchFailed {
        batch_id: felt252,
        reason: felt252,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        solver_bond_contract: ContractAddress,
        batch_settlement_contract: ContractAddress,
        coordinator: ContractAddress,
        slashing_user_pool: ContractAddress,
        slashing_whistleblower_pool: ContractAddress,
        solution_window_seconds: u64,
        auction_resolution_seconds: u64,
        surplus_weight: u256,
        fee_weight: u256,
        reputation_weight: u256
    ) {
        self.admin.write(admin);
        self.solver_bond_contract.write(solver_bond_contract);
        self.batch_settlement_contract.write(batch_settlement_contract);
        self.coordinator.write(coordinator);
        self.slashing_user_pool.write(slashing_user_pool);
        self.slashing_whistleblower_pool.write(slashing_whistleblower_pool);
        self.solution_window_seconds.write(solution_window_seconds);
        self.auction_resolution_seconds.write(auction_resolution_seconds);
        self.surplus_weight.write(surplus_weight);
        self.fee_weight.write(fee_weight);
        self.reputation_weight.write(reputation_weight);
    }

    fn zero_address() -> ContractAddress {
        0.try_into().unwrap()
    }

    #[abi(embed_v0)]
    impl BatchAuctionImpl of IBatchAuction<ContractState> {
        fn create_batch(
            ref self: ContractState,
            batch_id: felt252,
            close_time: u64,
            intent_count: u32
        ) -> bool {
            let caller = get_caller_address();
            assert(caller == self.coordinator.read(), 'Only coordinator');

            assert(!self.batch_exists.read(batch_id), 'Batch already exists');

            let solution_window = self.solution_window_seconds.read();
            assert(solution_window > 0, 'INVALID_SOLUTION_WINDOW');
            let auction_deadline = close_time + solution_window;

            let batch = Batch {
                batch_id,
                close_time,
                intent_count,
                auction_deadline,
                winning_solver: zero_address(),
                status: BatchStatus::AUCTION(()),
            };

            self.batches.write(batch_id, batch);
            self.batch_exists.write(batch_id, true);
            true
        }

        fn submit_solution(
            ref self: ContractState,
            batch_id: felt252,
            solution_commitment: felt252,
            estimated_surplus: u256,
            solver_fee_bps: u16,
            bond_proof: felt252
        ) -> bool {
            let solver = get_caller_address();
            let current_time = get_block_timestamp();

            let batch = self.batches.read(batch_id);

            assert(batch.status == BatchStatus::AUCTION(()), 'Batch not in auction');
            assert(current_time <= batch.auction_deadline, 'Auction deadline passed');
            assert(current_time >= batch.close_time, 'Batch not closed yet');

            assert(solver_fee_bps <= 10000, 'Invalid fee percentage');

            let solver_bond_contract = self.solver_bond_contract.read();
            let bond_dispatcher = ISolverBondDispatcher {
                contract_address: solver_bond_contract
            };

            let solver_info = bond_dispatcher.get_solver_info(solver);
            let minimum_bond = bond_dispatcher.get_minimum_bond();

            assert(!solver_info.blacklisted, 'Solver is blacklisted');
            assert(solver_info.bond_amount >= minimum_bond, 'Insufficient bond');

            let reputation = bond_dispatcher.get_reputation(solver);
            self.solver_reputation.write(solver, reputation);

            let solution = Solution {
                batch_id,
                solver,
                solution_commitment,
                estimated_surplus,
                solver_fee_bps,
                submission_time: current_time,
            };

            let count = self.solution_count.read(batch_id);
            self.solutions.write((batch_id, count), solution);
            self.solution_count.write(batch_id, count + 1);

            self.emit(SolutionSubmitted {
                batch_id,
                solver,
                solution_commitment,
                estimated_surplus,
            });

            true
        }

        fn finalize_auction(ref self: ContractState, batch_id: felt252) -> ContractAddress {
            let caller = get_caller_address();
            assert(caller == self.coordinator.read(), 'Only coordinator can finalize');

            let batch = self.batches.read(batch_id);
            assert(batch.status == BatchStatus::AUCTION(()), 'Batch not in auction');

            let current_time = get_block_timestamp();
            assert(current_time >= batch.auction_deadline, 'Auction not finished');
            let resolution_window = self.auction_resolution_seconds.read();
            assert(
                current_time <= batch.auction_deadline + resolution_window,
                'AUCTION_WINDOW_PASSED'
            );

            let solution_count = self.solution_count.read(batch_id);
            
            if solution_count == 0 {
                let updated_batch = Batch {
                    status: BatchStatus::FAILED(()),
                    ..batch
                };
                self.batches.write(batch_id, updated_batch);
                
                self.emit(BatchFailed {
                    batch_id,
                    reason: 'No solutions submitted',
                });

                return zero_address();
            }

            let (winning_solver, winning_commitment) = self._select_winner(batch_id, solution_count);

            let updated_batch = Batch {
                winning_solver,
                status: BatchStatus::SETTLED(()),
                ..batch
            };
            self.batches.write(batch_id, updated_batch);

            self.emit(AuctionFinalized {
                batch_id,
                winning_solver,
            });

            let bond_dispatcher = ISolverBondDispatcher {
                contract_address: self.solver_bond_contract.read()
            };
            let _ = bond_dispatcher.set_locked(winning_solver, true);

            self.emit(SolverSelected {
                batch_id,
                solver: winning_solver,
                solution_commitment: winning_commitment,
            });

            winning_solver
        }

        fn get_winning_solver(self: @ContractState, batch_id: felt252) -> ContractAddress {
            let batch = self.batches.read(batch_id);
            batch.winning_solver
        }

        fn get_batch_details(self: @ContractState, batch_id: felt252) -> Batch {
            self.batches.read(batch_id)
        }

        fn get_solution_details(self: @ContractState, batch_id: felt252, solution_index: u32) -> Solution {
            self.solutions.read((batch_id, solution_index))
        }

        fn get_solution_count(self: @ContractState, batch_id: felt252) -> u32 {
            self.solution_count.read(batch_id)
        }

        fn slash_solver(
            ref self: ContractState,
            solver: ContractAddress,
            reason: felt252,
            slash_amount: u256
        ) -> bool {
            let caller = get_caller_address();
            assert(
                caller == self.batch_settlement_contract.read() ||
                caller == self.admin.read(),
                'Unauthorized'
            );

            let solver_bond_contract = self.solver_bond_contract.read();
            let bond_dispatcher = ISolverBondDispatcher {
                contract_address: solver_bond_contract
            };

            let recipients = array![
                self.slashing_user_pool.read(),
                self.admin.read(),
                self.slashing_whistleblower_pool.read()
            ]
            .span();
            let slashed = bond_dispatcher.slash(solver, slash_amount, reason, recipients);
            assert(slashed, 'SLASH_FAILED');
            true
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn _select_winner(
            self: @ContractState,
            batch_id: felt252,
            solution_count: u32
        ) -> (ContractAddress, felt252) {
            let mut best_solver = zero_address();
            let mut best_commitment: felt252 = 0;
            let mut best_score: u256 = 0;
            let mut best_fee: u16 = 10000;
            let mut best_submission_time: u64 = 0;

            let mut i: u32 = 0;
            loop {
                if i >= solution_count {
                    break;
                }

                let solution = self.solutions.read((batch_id, i));
                
                let score = self._calculate_score(
                    solution.estimated_surplus,
                    solution.solver_fee_bps,
                    solution.solver
                );

                if score > best_score {
                    best_score = score;
                    best_solver = solution.solver;
                    best_fee = solution.solver_fee_bps;
                    best_submission_time = solution.submission_time;
                    best_commitment = solution.solution_commitment;
                } else if score == best_score {
                    if solution.solver_fee_bps < best_fee {
                        best_solver = solution.solver;
                        best_fee = solution.solver_fee_bps;
                        best_submission_time = solution.submission_time;
                        best_commitment = solution.solution_commitment;
                    } else if solution.solver_fee_bps == best_fee {
                        if solution.submission_time < best_submission_time {
                            best_solver = solution.solver;
                            best_fee = solution.solver_fee_bps;
                            best_submission_time = solution.submission_time;
                            best_commitment = solution.solution_commitment;
                        }
                    }
                }

                i += 1;
            };

            (best_solver, best_commitment)
        }

        fn _calculate_score(
            self: @ContractState,
            surplus: u256,
            fee_bps: u16,
            solver: ContractAddress
        ) -> u256 {
            let surplus_weight = self.surplus_weight.read();
            let fee_weight = self.fee_weight.read();
            let reputation_weight = self.reputation_weight.read();

            let reputation = self.solver_reputation.read(solver);

            let surplus_score = surplus * surplus_weight;
            let fee_score = (10000 - fee_bps.into()) * fee_weight;
            let reputation_score = reputation * reputation_weight;

            surplus_score + fee_score + reputation_score
        }
    }
}
