use starknet::ContractAddress;
use core::traits::TryInto;
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address,
    stop_cheat_caller_address, start_cheat_block_timestamp_global, stop_cheat_block_timestamp_global
};
use core::byte_array::ByteArray;

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
    fn get_batch_details(self: @TContractState, batch_id: felt252) -> Batch;
    fn get_solution_count(self: @TContractState, batch_id: felt252) -> u32;
}

#[starknet::interface]
trait IMockSolverBond<TContractState> {
    fn set_solver_info(
        ref self: TContractState,
        solver: ContractAddress,
        bond_amount: u256,
        blacklisted: bool
    ) -> bool;
    fn set_reputation(ref self: TContractState, solver: ContractAddress, reputation: u256) -> bool;
    fn set_minimum_bond(ref self: TContractState, minimum_bond: u256) -> bool;
}

#[derive(Drop, Serde)]
struct Batch {
    batch_id: felt252,
    close_time: u64,
    intent_count: u32,
    auction_deadline: u64,
    winning_solver: ContractAddress,
    status: BatchStatus,
}

#[derive(Drop, Serde, PartialEq)]
enum BatchStatus {
    OPEN: (),
    AUCTION: (),
    SETTLED: (),
    FAILED: (),
}

fn test_address(value: felt252) -> ContractAddress {
    value.try_into().unwrap()
}

fn deploy_contract(name: ByteArray, constructor_args: Array<felt252>) -> ContractAddress {
    let declare_result = declare(name).unwrap();
    let contract_class = declare_result.contract_class();
    let (contract_address, _) = contract_class.deploy(@constructor_args).unwrap();
    contract_address
}

fn deploy_mock_solver_bond(admin: ContractAddress, minimum_bond: u256) -> ContractAddress {
    let mut constructor_args: Array<felt252> = array![];
    admin.serialize(ref constructor_args);
    minimum_bond.serialize(ref constructor_args);
    deploy_contract("MockSolverBond", constructor_args)
}

fn deploy_batch_auction(
    admin: ContractAddress,
    solver_bond: ContractAddress,
    settlement: ContractAddress,
    coordinator: ContractAddress
) -> ContractAddress {
    let mut constructor_args: Array<felt252> = array![];
    admin.serialize(ref constructor_args);
    solver_bond.serialize(ref constructor_args);
    settlement.serialize(ref constructor_args);
    coordinator.serialize(ref constructor_args);
    admin.serialize(ref constructor_args);
    admin.serialize(ref constructor_args);
    20_u64.serialize(ref constructor_args);
    5_u64.serialize(ref constructor_args);
    1000000_u256.serialize(ref constructor_args);
    1000_u256.serialize(ref constructor_args);
    10_u256.serialize(ref constructor_args);
    deploy_contract("BatchAuction", constructor_args)
}

#[test]
fn test_create_batch() {
    let admin = test_address(0xAAA);
    let coordinator = test_address(0x111);
    let settlement = test_address(0x222);
    let solver_bond = deploy_mock_solver_bond(admin, 1_000_u256);
    let contract_address = deploy_batch_auction(admin, solver_bond, settlement, coordinator);
    let dispatcher = IBatchAuctionDispatcher { contract_address };

    start_cheat_caller_address(contract_address, coordinator);
    let result = dispatcher.create_batch(1, 1000, 5);
    assert(result, 'Batch creation failed');

    let batch = dispatcher.get_batch_details(1);
    assert(batch.batch_id == 1, 'Wrong batch ID');
    assert(batch.intent_count == 5, 'Wrong intent count');
    assert(batch.status == BatchStatus::AUCTION(()), 'Wrong status');
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: ('Only coordinator',))]
fn test_create_batch_unauthorized() {
    let admin = test_address(0xAAA);
    let coordinator = test_address(0x111);
    let settlement = test_address(0x222);
    let solver_bond = deploy_mock_solver_bond(admin, 1_000_u256);
    let contract_address = deploy_batch_auction(admin, solver_bond, settlement, coordinator);
    let dispatcher = IBatchAuctionDispatcher { contract_address };

    let unauthorized = test_address(0x999);
    start_cheat_caller_address(contract_address, unauthorized);
    dispatcher.create_batch(1, 1000, 5);
}

#[test]
fn test_submit_solution() {
    let admin = test_address(0xAAA);
    let coordinator = test_address(0x111);
    let settlement = test_address(0x222);
    let solver_bond = deploy_mock_solver_bond(admin, 1_000_u256);
    let contract_address = deploy_batch_auction(admin, solver_bond, settlement, coordinator);
    let dispatcher = IBatchAuctionDispatcher { contract_address };

    start_cheat_caller_address(contract_address, coordinator);
    dispatcher.create_batch(1, 1000, 5);
    stop_cheat_caller_address(contract_address);

    let solver = test_address(0x555);
    let bond_dispatcher = IMockSolverBondDispatcher { contract_address: solver_bond };
    start_cheat_caller_address(solver_bond, admin);
    bond_dispatcher.set_solver_info(solver, 2_000_u256, false);
    bond_dispatcher.set_reputation(solver, 80);
    stop_cheat_caller_address(solver_bond);

    start_cheat_block_timestamp_global(1001);
    start_cheat_caller_address(contract_address, solver);
    let result = dispatcher.submit_solution(1, 0x123456, 1000000, 50, 0xB0DF);
    assert(result, 'Solution submission failed');

    let solution_count = dispatcher.get_solution_count(1);
    assert(solution_count == 1, 'Wrong solution count');
    stop_cheat_caller_address(contract_address);
    stop_cheat_block_timestamp_global();
}

#[test]
fn test_finalize_auction() {
    let admin = test_address(0xAAA);
    let coordinator = test_address(0x111);
    let settlement = test_address(0x222);
    let solver_bond = deploy_mock_solver_bond(admin, 1_000_u256);
    let contract_address = deploy_batch_auction(admin, solver_bond, settlement, coordinator);
    let dispatcher = IBatchAuctionDispatcher { contract_address };

    start_cheat_caller_address(contract_address, coordinator);
    dispatcher.create_batch(1, 1000, 5);
    stop_cheat_caller_address(contract_address);

    let solver1 = test_address(0x555);
    let solver2 = test_address(0x666);
    let bond_dispatcher = IMockSolverBondDispatcher { contract_address: solver_bond };

    start_cheat_caller_address(solver_bond, admin);
    bond_dispatcher.set_solver_info(solver1, 2_000_u256, false);
    bond_dispatcher.set_reputation(solver1, 80);
    bond_dispatcher.set_solver_info(solver2, 2_000_u256, false);
    bond_dispatcher.set_reputation(solver2, 80);
    stop_cheat_caller_address(solver_bond);

    start_cheat_block_timestamp_global(1001);
    start_cheat_caller_address(contract_address, solver1);
    dispatcher.submit_solution(1, 0x111, 1000000, 50, 0xB0D1);
    stop_cheat_caller_address(contract_address);

    start_cheat_caller_address(contract_address, solver2);
    dispatcher.submit_solution(1, 0x222, 2000000, 30, 0xB0D2);
    stop_cheat_caller_address(contract_address);

    start_cheat_block_timestamp_global(1025);
    start_cheat_caller_address(contract_address, coordinator);
    let winner = dispatcher.finalize_auction(1);
    assert(winner == solver2, 'Wrong winner selected');
    stop_cheat_caller_address(contract_address);
    stop_cheat_block_timestamp_global();
}
