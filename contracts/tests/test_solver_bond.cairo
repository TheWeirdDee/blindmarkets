use starknet::ContractAddress;
use core::traits::TryInto;
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address,
    stop_cheat_caller_address, start_cheat_block_timestamp_global
};
use core::byte_array::ByteArray;

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
    fn set_locked(ref self: TContractState, solver: ContractAddress, locked: bool) -> bool;
    fn propose_minimum_bond(ref self: TContractState, new_minimum_bond: u256) -> bool;
    fn apply_minimum_bond(ref self: TContractState) -> bool;
    fn get_solver_info(self: @TContractState, solver: ContractAddress) -> SolverInfo;
    fn get_reputation(self: @TContractState, solver: ContractAddress) -> u256;
    fn is_blacklisted(self: @TContractState, solver: ContractAddress) -> bool;
    fn get_minimum_bond(self: @TContractState) -> u256;
}

#[starknet::interface]
trait IMockERC20<TContractState> {
    fn set_balance(ref self: TContractState, account: ContractAddress, amount: u256) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
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

fn test_address(value: felt252) -> ContractAddress {
    value.try_into().unwrap()
}

fn deploy_mock_erc20(admin: ContractAddress) -> ContractAddress {
    let mut constructor_args: Array<felt252> = array![];
    admin.serialize(ref constructor_args);
    deploy_contract("MockERC20", constructor_args)
}

fn deploy_solver_bond(bond_token: ContractAddress, treasury: ContractAddress) -> ContractAddress {
    let mut constructor_args: Array<felt252> = array![];
    admin_address().serialize(ref constructor_args);
    auction_address().serialize(ref constructor_args);
    settlement_address().serialize(ref constructor_args);
    bond_token.serialize(ref constructor_args);
    treasury.serialize(ref constructor_args);
    10000000000000000000_u256.serialize(ref constructor_args);
    604800_u64.serialize(ref constructor_args);
    2592000_u64.serialize(ref constructor_args);
    3_u8.serialize(ref constructor_args);
    80_u256.serialize(ref constructor_args);
    10_u32.serialize(ref constructor_args);
    7776000_u64.serialize(ref constructor_args);
    5000_u16.serialize(ref constructor_args);
    3000_u16.serialize(ref constructor_args);
    2000_u16.serialize(ref constructor_args);
    100000000000000000000_u256.serialize(ref constructor_args);
    10_u256.serialize(ref constructor_args);
    604800_u64.serialize(ref constructor_args);
    deploy_contract("SolverBond", constructor_args)
}

fn deploy_contract(name: ByteArray, constructor_args: Array<felt252>) -> ContractAddress {
    let declare_result = declare(name).unwrap();
    let contract_class = declare_result.contract_class();
    let (contract_address, _) = contract_class.deploy(@constructor_args).unwrap();
    contract_address
}

fn admin_address() -> ContractAddress {
    test_address(0xA11CE)
}

fn auction_address() -> ContractAddress {
    test_address(0xA7101)
}

fn settlement_address() -> ContractAddress {
    test_address(0x5E771E)
}

fn treasury_address() -> ContractAddress {
    test_address(0x7E457)
}

fn solver_address() -> ContractAddress {
    test_address(0x50E)
}

#[test]
fn test_deposit_bond() {
    let admin = admin_address();
    let treasury = treasury_address();
    let token = deploy_mock_erc20(admin);
    let contract_address = deploy_solver_bond(token, treasury);
    let dispatcher = ISolverBondDispatcher { contract_address };
    let token_dispatcher = IMockERC20Dispatcher { contract_address: token };

    let solver = solver_address();
    start_cheat_caller_address(token, admin);
    token_dispatcher.set_balance(solver, 10000000000000000000_u256);
    stop_cheat_caller_address(token);

    start_cheat_caller_address(contract_address, solver);
    let amount = 10000000000000000000_u256;
    let result = dispatcher.deposit_bond(amount);
    assert(result, 'Deposit failed');

    let info = dispatcher.get_solver_info(solver);
    assert(info.bond_amount == amount, 'Wrong bond amount');
    assert(info.solver == solver, 'Wrong solver address');
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_request_withdrawal() {
    let admin = admin_address();
    let treasury = treasury_address();
    let token = deploy_mock_erc20(admin);
    let contract_address = deploy_solver_bond(token, treasury);
    let dispatcher = ISolverBondDispatcher { contract_address };
    let token_dispatcher = IMockERC20Dispatcher { contract_address: token };

    let solver = solver_address();
    start_cheat_caller_address(token, admin);
    token_dispatcher.set_balance(solver, 20000000000000000000_u256);
    stop_cheat_caller_address(token);

    start_cheat_caller_address(contract_address, solver);
    dispatcher.deposit_bond(20000000000000000000_u256);
    let result = dispatcher.request_withdrawal(5000000000000000000_u256);
    assert(result, 'Withdrawal request failed');
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: ('Insufficient bond',))]
fn test_request_withdrawal_insufficient() {
    let admin = admin_address();
    let treasury = treasury_address();
    let token = deploy_mock_erc20(admin);
    let contract_address = deploy_solver_bond(token, treasury);
    let dispatcher = ISolverBondDispatcher { contract_address };
    let token_dispatcher = IMockERC20Dispatcher { contract_address: token };

    let solver = solver_address();
    start_cheat_caller_address(token, admin);
    token_dispatcher.set_balance(solver, 10000000000000000000_u256);
    stop_cheat_caller_address(token);

    start_cheat_caller_address(contract_address, solver);
    dispatcher.deposit_bond(10000000000000000000_u256);
    dispatcher.request_withdrawal(20000000000000000000_u256);
}

#[test]
fn test_get_minimum_bond() {
    let admin = admin_address();
    let treasury = treasury_address();
    let token = deploy_mock_erc20(admin);
    let contract_address = deploy_solver_bond(token, treasury);
    let dispatcher = ISolverBondDispatcher { contract_address };
    let min_bond = dispatcher.get_minimum_bond();
    assert(min_bond > 0, 'Minimum bond should be set');
}

#[test]
#[should_panic(expected: ('BOND_LOCKED',))]
fn test_withdrawal_blocked_when_locked() {
    let admin = admin_address();
    let treasury = treasury_address();
    let token = deploy_mock_erc20(admin);
    let contract_address = deploy_solver_bond(token, treasury);
    let dispatcher = ISolverBondDispatcher { contract_address };
    let token_dispatcher = IMockERC20Dispatcher { contract_address: token };

    let solver = solver_address();
    start_cheat_caller_address(token, admin);
    token_dispatcher.set_balance(solver, 10000000000000000000_u256);
    stop_cheat_caller_address(token);

    start_cheat_caller_address(contract_address, solver);
    dispatcher.deposit_bond(10000000000000000000_u256);
    stop_cheat_caller_address(contract_address);

    let auction = auction_address();
    start_cheat_caller_address(contract_address, auction);
    dispatcher.set_locked(solver, true);
    stop_cheat_caller_address(contract_address);

    start_cheat_caller_address(contract_address, solver);
    dispatcher.request_withdrawal(1000000000000000000_u256);
}

#[test]
fn test_propose_apply_minimum_bond() {
    let admin = admin_address();
    let treasury = treasury_address();
    let token = deploy_mock_erc20(admin);
    let contract_address = deploy_solver_bond(token, treasury);
    let dispatcher = ISolverBondDispatcher { contract_address };

    start_cheat_caller_address(contract_address, admin);
    dispatcher.propose_minimum_bond(20000000000000000000_u256);
    stop_cheat_caller_address(contract_address);

    // Not checking delay via block time in this test; just ensure apply fails without time travel
    // Apply should fail due to delay (covered in dedicated test)
}

#[test]
#[should_panic(expected: ('MINIMUM_BOND_UPDATE_DELAY',))]
fn test_apply_minimum_bond_before_delay() {
    let admin = admin_address();
    let treasury = treasury_address();
    let token = deploy_mock_erc20(admin);
    let contract_address = deploy_solver_bond(token, treasury);
    let dispatcher = ISolverBondDispatcher { contract_address };

    start_cheat_block_timestamp_global(1);
    start_cheat_caller_address(contract_address, admin);
    dispatcher.propose_minimum_bond(20000000000000000000_u256);
    dispatcher.apply_minimum_bond();
}
