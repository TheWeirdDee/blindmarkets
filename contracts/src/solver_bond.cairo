use starknet::ContractAddress;

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
trait ISolverBond<TContractState> {
    fn deposit_bond(ref self: TContractState, amount: u256) -> bool;
    fn request_withdrawal(ref self: TContractState, amount: u256) -> bool;
    fn withdraw(ref self: TContractState, amount: u256) -> bool;
    fn slash(
        ref self: TContractState,
        solver: ContractAddress,
        amount: u256,
        reason: felt252,
        recipients: Span<ContractAddress>
    ) -> bool;
    fn record_settlement_success(ref self: TContractState, solver: ContractAddress) -> bool;
    fn record_settlement_failure(ref self: TContractState, solver: ContractAddress) -> bool;
    fn set_locked(ref self: TContractState, solver: ContractAddress, locked: bool) -> bool;
    fn propose_minimum_bond(ref self: TContractState, new_minimum_bond: u256) -> bool;
    fn apply_minimum_bond(ref self: TContractState) -> bool;
    fn get_reputation(self: @TContractState, solver: ContractAddress) -> u256;
    fn get_solver_info(self: @TContractState, solver: ContractAddress) -> SolverInfo;
    fn is_blacklisted(self: @TContractState, solver: ContractAddress) -> bool;
    fn get_minimum_bond(self: @TContractState) -> u256;
}

#[derive(Drop, Serde, starknet::Store)]
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

#[derive(Drop, Serde, starknet::Store)]
struct SlashEvent {
    batch_id: felt252,
    slash_amount: u256,
    reason: felt252,
    timestamp: u64,
}

#[starknet::contract]
mod SolverBond {
    use super::{ISolverBond, SolverInfo, SlashEvent};
    use super::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess
    };

    #[storage]
    struct Storage {
        solver_info: Map<ContractAddress, SolverInfo>,
        slash_history: Map<(ContractAddress, u32), SlashEvent>,
        slash_history_count: Map<ContractAddress, u32>,
        minimum_bond: u256,
        pending_minimum_bond: u256,
        pending_minimum_bond_time: u64,
        minimum_bond_update_delay: u64,
        batch_auction_contract: ContractAddress,
        batch_settlement_contract: ContractAddress,
        admin: ContractAddress,
        last_activity: Map<ContractAddress, u64>,
        bond_token: ContractAddress,
        treasury: ContractAddress,
        withdrawal_delay_seconds: u64,
        slash_window_seconds: u64,
        max_slashes_before_blacklist: u8,
        base_reputation: u256,
        min_attempts_for_reputation: u32,
        reputation_decay_period: u64,
        slashing_user_bps: u16,
        slashing_treasury_bps: u16,
        slashing_whistleblower_bps: u16,
        bond_scaling_threshold: u256,
        bond_scaling_percentage: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        BondDeposited: BondDeposited,
        WithdrawalRequested: WithdrawalRequested,
        BondWithdrawn: BondWithdrawn,
        SolverSlashed: SolverSlashed,
        SolverBlacklisted: SolverBlacklisted,
    }

    #[derive(Drop, starknet::Event)]
    struct BondDeposited {
        solver: ContractAddress,
        amount: u256,
        total_bond: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct WithdrawalRequested {
        solver: ContractAddress,
        amount: u256,
        unlock_time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct BondWithdrawn {
        solver: ContractAddress,
        amount: u256,
        remaining_bond: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct SolverSlashed {
        solver: ContractAddress,
        amount: u256,
        reason: felt252,
        remaining_bond: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct SolverBlacklisted {
        solver: ContractAddress,
        reason: felt252,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        batch_auction_contract: ContractAddress,
        batch_settlement_contract: ContractAddress,
        bond_token: ContractAddress,
        treasury: ContractAddress,
        minimum_bond: u256,
        withdrawal_delay_seconds: u64,
        slash_window_seconds: u64,
        max_slashes_before_blacklist: u8,
        base_reputation: u256,
        min_attempts_for_reputation: u32,
        reputation_decay_period: u64,
        slashing_user_bps: u16,
        slashing_treasury_bps: u16,
        slashing_whistleblower_bps: u16,
        bond_scaling_threshold: u256,
        bond_scaling_percentage: u256,
        minimum_bond_update_delay: u64
    ) {
        assert(
            slashing_user_bps + slashing_treasury_bps + slashing_whistleblower_bps == 10000,
            'INVALID_SLASHING_BPS'
        );
        self.admin.write(admin);
        self.batch_auction_contract.write(batch_auction_contract);
        self.batch_settlement_contract.write(batch_settlement_contract);
        self.bond_token.write(bond_token);
        self.treasury.write(treasury);
        self.minimum_bond.write(minimum_bond);
        self.withdrawal_delay_seconds.write(withdrawal_delay_seconds);
        self.slash_window_seconds.write(slash_window_seconds);
        self.max_slashes_before_blacklist.write(max_slashes_before_blacklist);
        self.base_reputation.write(base_reputation);
        self.min_attempts_for_reputation.write(min_attempts_for_reputation);
        self.reputation_decay_period.write(reputation_decay_period);
        self.slashing_user_bps.write(slashing_user_bps);
        self.slashing_treasury_bps.write(slashing_treasury_bps);
        self.slashing_whistleblower_bps.write(slashing_whistleblower_bps);
        self.bond_scaling_threshold.write(bond_scaling_threshold);
        self.bond_scaling_percentage.write(bond_scaling_percentage);
        self.minimum_bond_update_delay.write(minimum_bond_update_delay);
    }

    #[abi(embed_v0)]
    impl SolverBondImpl of ISolverBond<ContractState> {
        fn deposit_bond(ref self: ContractState, amount: u256) -> bool {
            let caller = get_caller_address();
            let info = self.solver_info.read(caller);

            assert(!info.blacklisted, 'Solver is blacklisted');
            assert(amount > 0, 'Amount must be positive');

            let bond_token = self.bond_token.read();
            let token_dispatcher = IERC20Dispatcher {
                contract_address: bond_token
            };

            let contract_address = starknet::get_contract_address();
            let transfer_success = token_dispatcher.transfer_from(
                caller,
                contract_address,
                amount
            );

            assert(transfer_success, 'Token transfer failed');

            let total_bond = info.bond_amount + amount;
            let updated_info = SolverInfo {
                solver: caller,
                bond_amount: total_bond,
                ..info
            };
            self.solver_info.write(caller, updated_info);
            self.last_activity.write(caller, get_block_timestamp());

            self.emit(BondDeposited {
                solver: caller,
                amount,
                total_bond,
            });

            true
        }

        fn request_withdrawal(ref self: ContractState, amount: u256) -> bool {
            let caller = get_caller_address();
            let info = self.solver_info.read(caller);

            assert(info.bond_amount >= amount, 'Insufficient bond');
            assert(!info.locked, 'BOND_LOCKED');
            assert(amount > 0, 'Amount must be positive');

            let current_time = get_block_timestamp();
            let updated_info = SolverInfo {
                withdrawal_request_time: current_time,
                withdrawal_request_amount: amount,
                ..info
            };
            self.solver_info.write(caller, updated_info);

            let unlock_time = current_time + self.withdrawal_delay_seconds.read();

            self.emit(WithdrawalRequested {
                solver: caller,
                amount,
                unlock_time,
            });

            true
        }

        fn withdraw(ref self: ContractState, amount: u256) -> bool {
            let caller = get_caller_address();
            let info = self.solver_info.read(caller);

            assert(!info.locked, 'BOND_LOCKED');
            assert(info.withdrawal_request_amount >= amount, 'Amount exceeds request');

            let current_time = get_block_timestamp();
            assert(
                current_time >= info.withdrawal_request_time + self.withdrawal_delay_seconds.read(),
                'Withdrawal delay not met'
            );

            assert(info.bond_amount >= amount, 'Insufficient bond');

            let bond_token = self.bond_token.read();
            let token_dispatcher = IERC20Dispatcher {
                contract_address: bond_token
            };

            let transfer_success = token_dispatcher.transfer(caller, amount);
            assert(transfer_success, 'Token transfer failed');

            let remaining_bond = info.bond_amount - amount;
            let updated_info = SolverInfo {
                bond_amount: remaining_bond,
                withdrawal_request_amount: 0,
                withdrawal_request_time: 0,
                ..info
            };
            self.solver_info.write(caller, updated_info);

            self.emit(BondWithdrawn {
                solver: caller,
                amount,
                remaining_bond,
            });

            true
        }

        fn slash(
            ref self: ContractState,
            solver: ContractAddress,
            amount: u256,
            reason: felt252,
            recipients: Span<ContractAddress>
        ) -> bool {
            let caller = get_caller_address();
            assert(
                caller == self.batch_auction_contract.read() ||
                caller == self.batch_settlement_contract.read(),
                'Unauthorized caller'
            );
            assert(amount > 0, 'Amount must be positive');

            let info = self.solver_info.read(solver);
            let current_time = get_block_timestamp();

            self._clean_old_slashes(solver, current_time);

            let actual_slash_amount = if amount > info.bond_amount {
                info.bond_amount
            } else {
                amount
            };

            let mut blacklisted_reason: felt252 = 0;
            let mut new_blacklisted = info.blacklisted;
            let mut new_bond_amount = info.bond_amount - actual_slash_amount;
            let mut new_slash_count = info.slash_count_30d + 1;
            let mut new_failed_settlements = info.failed_settlements + 1;

            if amount > actual_slash_amount {
                new_blacklisted = true;
                blacklisted_reason = 'Slash exceeds bond';
            }

            let slash_count = self.slash_history_count.read(solver);
            let slash_event = SlashEvent {
                batch_id: 0,
                slash_amount: actual_slash_amount,
                reason,
                timestamp: current_time,
            };
            self.slash_history.write((solver, slash_count), slash_event);
            self.slash_history_count.write(solver, slash_count + 1);

            if new_slash_count > self.max_slashes_before_blacklist.read() {
                new_blacklisted = true;
                new_bond_amount = 0;
                blacklisted_reason = 'Repeated failures';
            }

            if new_blacklisted {
                self.emit(SolverBlacklisted {
                    solver,
                    reason: blacklisted_reason,
                });
            }

            let remaining_bond = new_bond_amount;
            let updated_info = SolverInfo {
                bond_amount: new_bond_amount,
                slash_count_30d: new_slash_count,
                last_slash_timestamp: current_time,
                failed_settlements: new_failed_settlements,
                withdrawal_request_amount: 0,
                withdrawal_request_time: 0,
                blacklisted: new_blacklisted,
                ..info
            };
            self.solver_info.write(solver, updated_info);

            self._distribute_slash(recipients, actual_slash_amount);

            self.emit(SolverSlashed {
                solver,
                amount: actual_slash_amount,
                reason,
                remaining_bond,
            });

            true
        }

        fn record_settlement_success(ref self: ContractState, solver: ContractAddress) -> bool {
            let caller = get_caller_address();
            assert(caller == self.batch_settlement_contract.read(), 'Unauthorized caller');
            let info = self.solver_info.read(solver);
            let updated_info = SolverInfo {
                successful_settlements: info.successful_settlements + 1,
                ..info
            };
            self.solver_info.write(solver, updated_info);
            self.last_activity.write(solver, get_block_timestamp());
            true
        }

        fn record_settlement_failure(ref self: ContractState, solver: ContractAddress) -> bool {
            let caller = get_caller_address();
            assert(caller == self.batch_settlement_contract.read(), 'Unauthorized caller');
            let info = self.solver_info.read(solver);
            let updated_info = SolverInfo {
                failed_settlements: info.failed_settlements + 1,
                ..info
            };
            self.solver_info.write(solver, updated_info);
            self.last_activity.write(solver, get_block_timestamp());
            true
        }

        fn set_locked(ref self: ContractState, solver: ContractAddress, locked: bool) -> bool {
            let caller = get_caller_address();
            assert(
                caller == self.batch_auction_contract.read() ||
                caller == self.batch_settlement_contract.read() ||
                caller == self.admin.read(),
                'Unauthorized caller'
            );
            let info = self.solver_info.read(solver);
            let updated_info = SolverInfo { locked, ..info };
            self.solver_info.write(solver, updated_info);
            true
        }

        fn propose_minimum_bond(ref self: ContractState, new_minimum_bond: u256) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.pending_minimum_bond.write(new_minimum_bond);
            self.pending_minimum_bond_time.write(get_block_timestamp());
            true
        }

        fn apply_minimum_bond(ref self: ContractState) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            let proposed_time = self.pending_minimum_bond_time.read();
            assert(proposed_time != 0, 'NO_PENDING_MINIMUM_BOND');
            let now = get_block_timestamp();
            assert(
                now >= proposed_time + self.minimum_bond_update_delay.read(),
                'MINIMUM_BOND_UPDATE_DELAY'
            );
            let pending = self.pending_minimum_bond.read();
            self.minimum_bond.write(pending);
            self.pending_minimum_bond.write(0);
            self.pending_minimum_bond_time.write(0);
            true
        }

        fn get_reputation(self: @ContractState, solver: ContractAddress) -> u256 {
            let info = self.solver_info.read(solver);
            
            if info.blacklisted {
                return 0;
            }

            let total_attempts = info.successful_settlements + info.failed_settlements;
            
            if total_attempts < self.min_attempts_for_reputation.read() {
                return self.base_reputation.read();
            }

            let last_activity_time = self.last_activity.read(solver);
            let current_time = get_block_timestamp();
            
            if current_time - last_activity_time > self.reputation_decay_period.read() {
                return self.base_reputation.read();
            }

            let reputation = (info.successful_settlements.into() * 100) / total_attempts.into();
            
            if reputation > 100 {
                100
            } else {
                reputation
            }
        }

        fn get_solver_info(self: @ContractState, solver: ContractAddress) -> SolverInfo {
            self.solver_info.read(solver)
        }

        fn is_blacklisted(self: @ContractState, solver: ContractAddress) -> bool {
            let info = self.solver_info.read(solver);
            info.blacklisted
        }

        fn get_minimum_bond(self: @ContractState) -> u256 {
            self.minimum_bond.read()
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn _clean_old_slashes(ref self: ContractState, solver: ContractAddress, current_time: u64) {
            let info = self.solver_info.read(solver);
            
            if info.last_slash_timestamp > 0 &&
               current_time - info.last_slash_timestamp > self.slash_window_seconds.read() {
                let updated_info = SolverInfo { slash_count_30d: 0, ..info };
                self.solver_info.write(solver, updated_info);
            }
        }

        fn _calculate_required_bond(self: @ContractState, batch_value: u256) -> u256 {
            if batch_value <= self.bond_scaling_threshold.read() {
                self.minimum_bond.read()
            } else {
                let scaled_bond = (batch_value * self.bond_scaling_percentage.read()) / 100;
                if scaled_bond > self.minimum_bond.read() {
                    scaled_bond
                } else {
                    self.minimum_bond.read()
                }
            }
        }

        fn _distribute_slash(
            ref self: ContractState,
            recipients: Span<ContractAddress>,
            amount: u256
        ) {
            assert(recipients.len() == 3, 'INVALID_RECIPIENTS');
            let user_bps = self.slashing_user_bps.read();
            let treasury_bps = self.slashing_treasury_bps.read();
            let whistle_bps = self.slashing_whistleblower_bps.read();
            assert(
                user_bps + treasury_bps + whistle_bps == 10000,
                'INVALID_SLASHING_BPS'
            );

            let user_amount = (amount * user_bps.into()) / 10000;
            let treasury_amount = (amount * treasury_bps.into()) / 10000;
            let whistle_amount = amount - user_amount - treasury_amount;

            let bond_token = self.bond_token.read();
            let token_dispatcher = IERC20Dispatcher { contract_address: bond_token };

            if user_amount > 0 {
                let ok = token_dispatcher.transfer(*recipients.at(0), user_amount);
                assert(ok, 'USER_SLASH_TRANSFER_FAILED');
            }

            if treasury_amount > 0 {
                let ok = token_dispatcher.transfer(*recipients.at(1), treasury_amount);
                assert(ok, 'TREASURY_SLASH_TRANSFER_FAILED');
            }

            if whistle_amount > 0 {
                let ok = token_dispatcher.transfer(*recipients.at(2), whistle_amount);
                assert(ok, 'WHISTLE_SLASH_TRANSFER_FAILED');
            }
        }
    }
}
