use starknet::ContractAddress;

#[starknet::interface]
trait IMockSolverBond<TContractState> {
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
    fn record_settlement_success(ref self: TContractState, solver: ContractAddress) -> bool;
    fn record_settlement_failure(ref self: TContractState, solver: ContractAddress) -> bool;
    fn set_locked(ref self: TContractState, solver: ContractAddress, locked: bool) -> bool;
    fn set_solver_info(
        ref self: TContractState,
        solver: ContractAddress,
        bond_amount: u256,
        blacklisted: bool
    ) -> bool;
    fn set_reputation(ref self: TContractState, solver: ContractAddress, reputation: u256) -> bool;
    fn set_minimum_bond(ref self: TContractState, minimum_bond: u256) -> bool;
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

#[starknet::contract]
mod MockSolverBond {
    use super::{IMockSolverBond, SolverInfo};
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess
    };

    #[storage]
    struct Storage {
        solver_info: Map<ContractAddress, SolverInfo>,
        reputation: Map<ContractAddress, u256>,
        minimum_bond: u256,
        admin: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress, minimum_bond: u256) {
        self.admin.write(admin);
        self.minimum_bond.write(minimum_bond);
    }

    #[abi(embed_v0)]
    impl MockSolverBondImpl of IMockSolverBond<ContractState> {
        fn get_solver_info(self: @ContractState, solver: ContractAddress) -> SolverInfo {
            self.solver_info.read(solver)
        }

        fn get_reputation(self: @ContractState, solver: ContractAddress) -> u256 {
            self.reputation.read(solver)
        }

        fn get_minimum_bond(self: @ContractState) -> u256 {
            self.minimum_bond.read()
        }

        fn slash(
            ref self: ContractState,
            solver: ContractAddress,
            amount: u256,
            reason: felt252,
            recipients: Span<ContractAddress>
        ) -> bool {
            let _ = reason;
            let _ = recipients;
            let info = self.solver_info.read(solver);
            let (new_bond_amount, new_blacklisted) = if amount >= info.bond_amount {
                (0, true)
            } else {
                (info.bond_amount - amount, info.blacklisted)
            };
            let updated_info = SolverInfo {
                bond_amount: new_bond_amount,
                blacklisted: new_blacklisted,
                ..info
            };
            self.solver_info.write(solver, updated_info);
            true
        }

        fn record_settlement_success(ref self: ContractState, solver: ContractAddress) -> bool {
            let info = self.solver_info.read(solver);
            let updated_info = SolverInfo {
                successful_settlements: info.successful_settlements + 1,
                ..info
            };
            self.solver_info.write(solver, updated_info);
            true
        }

        fn record_settlement_failure(ref self: ContractState, solver: ContractAddress) -> bool {
            let info = self.solver_info.read(solver);
            let updated_info = SolverInfo {
                failed_settlements: info.failed_settlements + 1,
                ..info
            };
            self.solver_info.write(solver, updated_info);
            true
        }

        fn set_locked(ref self: ContractState, solver: ContractAddress, locked: bool) -> bool {
            let info = self.solver_info.read(solver);
            let updated_info = SolverInfo { locked, ..info };
            self.solver_info.write(solver, updated_info);
            true
        }

        fn set_solver_info(
            ref self: ContractState,
            solver: ContractAddress,
            bond_amount: u256,
            blacklisted: bool
        ) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            let info = SolverInfo {
                solver,
                bond_amount,
                locked: false,
                successful_settlements: 0,
                failed_settlements: 0,
                slash_count_30d: 0,
                last_slash_timestamp: 0,
                withdrawal_request_time: 0,
                withdrawal_request_amount: 0,
                blacklisted,
            };
            self.solver_info.write(solver, info);
            true
        }

        fn set_reputation(ref self: ContractState, solver: ContractAddress, reputation: u256) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.reputation.write(solver, reputation);
            true
        }

        fn set_minimum_bond(ref self: ContractState, minimum_bond: u256) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');
            self.minimum_bond.write(minimum_bond);
            true
        }
    }
}
