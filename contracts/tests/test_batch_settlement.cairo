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
    fn get_settlement(self: @TContractState, batch_id: felt252) -> Settlement;
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
    fn get_solver_info(self: @TContractState, solver: ContractAddress) -> SolverInfo;
}

#[starknet::interface]
trait IMockIntentRegistry<TContractState> {
    fn set_intent(
        ref self: TContractState,
        intent_id: felt252,
        user: ContractAddress,
        asset_in: ContractAddress,
        asset_out: ContractAddress,
        amount_commitment: felt252,
        min_output: u256,
        deadline: u64,
        privacy_mode: u8,
        status: IntentStatus
    ) -> bool;
    fn add_intent_to_batch(ref self: TContractState, batch_id: felt252, intent_id: felt252) -> bool;
    fn get_intent(self: @TContractState, intent_id: felt252) -> Intent;
}

#[starknet::interface]
trait IMockERC20<TContractState> {
    fn set_balance(ref self: TContractState, account: ContractAddress, amount: u256) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
}

#[derive(Drop, Serde, Copy)]
struct Transfer {
    from: ContractAddress,
    to: ContractAddress,
    asset: ContractAddress,
    amount: u256,
}

#[derive(Drop, Serde)]
struct Settlement {
    batch_id: felt252,
    solver: ContractAddress,
    settlement_hash: felt252,
    executed: bool,
    transfer_count: u32,
}

#[derive(Drop, Serde)]
struct Intent {
    intent_id: felt252,
    user: ContractAddress,
    asset_in: ContractAddress,
    asset_out: ContractAddress,
    amount_commitment: felt252,
    min_output: u256,
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

fn test_address(value: felt252) -> ContractAddress {
    value.try_into().unwrap()
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

fn deploy_mock_intent_registry() -> ContractAddress {
    let constructor_args: Array<felt252> = array![];
    deploy_contract("MockIntentRegistry", constructor_args)
}

fn deploy_mock_proof_verifier() -> ContractAddress {
    let constructor_args: Array<felt252> = array![];
    deploy_contract("MockProofVerifier", constructor_args)
}

fn deploy_mock_erc20(admin: ContractAddress) -> ContractAddress {
    let mut constructor_args: Array<felt252> = array![];
    admin.serialize(ref constructor_args);
    deploy_contract("MockERC20", constructor_args)
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

fn deploy_batch_settlement(
    admin: ContractAddress,
    intent_registry: ContractAddress,
    batch_auction: ContractAddress,
    solver_bond: ContractAddress,
    coordinator: ContractAddress,
    treasury: ContractAddress,
    proof_verifier: ContractAddress,
    slashing_user_pool: ContractAddress,
    slashing_whistleblower_pool: ContractAddress
) -> ContractAddress {
    let mut constructor_args: Array<felt252> = array![];
    admin.serialize(ref constructor_args);
    intent_registry.serialize(ref constructor_args);
    batch_auction.serialize(ref constructor_args);
    solver_bond.serialize(ref constructor_args);
    coordinator.serialize(ref constructor_args);
    treasury.serialize(ref constructor_args);
    slashing_user_pool.serialize(ref constructor_args);
    slashing_whistleblower_pool.serialize(ref constructor_args);
    proof_verifier.serialize(ref constructor_args);
    500_u16.serialize(ref constructor_args);
    2000_u16.serialize(ref constructor_args);
    deploy_contract("BatchSettlement", constructor_args)
}

fn compute_settlement_hash(batch_id: felt252, plan: Span<Transfer>) -> felt252 {
    let mut hash = batch_id;
    let mut i: u32 = 0;
    loop {
        if i >= plan.len() {
            break;
        }
        let transfer = *plan.at(i);
        let amount_hash = core::pedersen::pedersen(transfer.amount.low.into(), transfer.amount.high.into());
        let transfer_hash = core::pedersen::pedersen(
            core::pedersen::pedersen(transfer.from.into(), transfer.to.into()),
            core::pedersen::pedersen(transfer.asset.into(), amount_hash)
        );
        hash = core::pedersen::pedersen(hash, transfer_hash);
        i += 1;
    };
    hash
}

#[test]
fn test_settle_batch_success() {
    let admin = test_address(0xAAA);
    let coordinator = test_address(0x111);
    let treasury = test_address(0x222);
    let solver = test_address(0x333);
    let user = test_address(0x444);

    let mock_intent_registry = deploy_mock_intent_registry();
    let mock_solver_bond = deploy_mock_solver_bond(admin, 100_u256);
    let mock_proof_verifier = deploy_mock_proof_verifier();
    let token = deploy_mock_erc20(admin);

    let batch_auction = deploy_batch_auction(admin, mock_solver_bond, test_address(0x0), coordinator);
    let batch_settlement = deploy_batch_settlement(
        admin,
        mock_intent_registry,
        batch_auction,
        mock_solver_bond,
        coordinator,
        treasury,
        mock_proof_verifier,
        treasury,
        treasury
    );

    let bond_dispatcher = IMockSolverBondDispatcher { contract_address: mock_solver_bond };
    start_cheat_caller_address(mock_solver_bond, admin);
    bond_dispatcher.set_solver_info(solver, 100000_u256, false);
    bond_dispatcher.set_reputation(solver, 80);
    stop_cheat_caller_address(mock_solver_bond);

    let batch_id: felt252 = 0;
    let auction_dispatcher = IBatchAuctionDispatcher { contract_address: batch_auction };
    start_cheat_caller_address(batch_auction, coordinator);
    auction_dispatcher.create_batch(batch_id, 0, 1);
    stop_cheat_caller_address(batch_auction);

    let transfer = Transfer {
        from: solver,
        to: user,
        asset: token,
        amount: 1000,
    };
    let execution_plan = array![transfer].span();
    let commitment = compute_settlement_hash(batch_id, execution_plan);

    start_cheat_block_timestamp_global(1);
    start_cheat_caller_address(batch_auction, solver);
    auction_dispatcher.submit_solution(batch_id, commitment, 1000, 50, 0);
    stop_cheat_caller_address(batch_auction);

    start_cheat_block_timestamp_global(25);
    start_cheat_caller_address(batch_auction, coordinator);
    auction_dispatcher.finalize_auction(batch_id);
    stop_cheat_caller_address(batch_auction);

    let intent_registry_dispatcher = IMockIntentRegistryDispatcher { contract_address: mock_intent_registry };
    start_cheat_caller_address(mock_intent_registry, admin);
    let intent_id: felt252 = 0xA1;
    intent_registry_dispatcher.set_intent(
        intent_id,
        user,
        test_address(0x0),
        token,
        0xB1,
        1000,
        100,
        0,
        IntentStatus::PENDING(())
    );
    intent_registry_dispatcher.add_intent_to_batch(batch_id, intent_id);
    stop_cheat_caller_address(mock_intent_registry);

    let token_dispatcher = IMockERC20Dispatcher { contract_address: token };
    start_cheat_caller_address(token, admin);
    token_dispatcher.set_balance(solver, 5000);
    stop_cheat_caller_address(token);

    let settlement_dispatcher = IBatchSettlementDispatcher { contract_address: batch_settlement };
    start_cheat_caller_address(batch_settlement, coordinator);
    let proofs = array![0].span();
    let ok = settlement_dispatcher.settle_batch(batch_id, solver, execution_plan, proofs);
    assert(ok, 'Settlement failed');
    stop_cheat_caller_address(batch_settlement);
    stop_cheat_block_timestamp_global();

    let settlement = settlement_dispatcher.get_settlement(batch_id);
    assert(settlement.executed, 'Settlement not executed');

    let updated_intent = intent_registry_dispatcher.get_intent(intent_id);
    assert(updated_intent.status == IntentStatus::SETTLED(()), 'Intent not settled');
}

#[test]
fn test_commitment_mismatch_slash() {
    let admin = test_address(0xAAA);
    let coordinator = test_address(0x111);
    let treasury = test_address(0x222);
    let solver = test_address(0x333);
    let user = test_address(0x444);

    let mock_intent_registry = deploy_mock_intent_registry();
    let mock_solver_bond = deploy_mock_solver_bond(admin, 100_u256);
    let mock_proof_verifier = deploy_mock_proof_verifier();
    let token = deploy_mock_erc20(admin);

    let batch_auction = deploy_batch_auction(admin, mock_solver_bond, test_address(0x0), coordinator);
    let batch_settlement = deploy_batch_settlement(
        admin,
        mock_intent_registry,
        batch_auction,
        mock_solver_bond,
        coordinator,
        treasury,
        mock_proof_verifier,
        treasury,
        treasury
    );

    let bond_dispatcher = IMockSolverBondDispatcher { contract_address: mock_solver_bond };
    start_cheat_caller_address(mock_solver_bond, admin);
    bond_dispatcher.set_solver_info(solver, 100000_u256, false);
    bond_dispatcher.set_reputation(solver, 80);
    stop_cheat_caller_address(mock_solver_bond);

    let batch_id: felt252 = 0;
    let auction_dispatcher = IBatchAuctionDispatcher { contract_address: batch_auction };
    start_cheat_caller_address(batch_auction, coordinator);
    auction_dispatcher.create_batch(batch_id, 0, 1);
    stop_cheat_caller_address(batch_auction);

    let transfer = Transfer {
        from: solver,
        to: user,
        asset: token,
        amount: 1000,
    };
    let execution_plan = array![transfer].span();
    let wrong_commitment: felt252 = 12345;

    start_cheat_block_timestamp_global(1);
    start_cheat_caller_address(batch_auction, solver);
    auction_dispatcher.submit_solution(batch_id, wrong_commitment, 1000, 50, 0);
    stop_cheat_caller_address(batch_auction);

    start_cheat_block_timestamp_global(25);
    start_cheat_caller_address(batch_auction, coordinator);
    auction_dispatcher.finalize_auction(batch_id);
    stop_cheat_caller_address(batch_auction);

    let intent_registry_dispatcher = IMockIntentRegistryDispatcher { contract_address: mock_intent_registry };
    start_cheat_caller_address(mock_intent_registry, admin);
    let intent_id: felt252 = 0xA1;
    intent_registry_dispatcher.set_intent(
        intent_id,
        user,
        test_address(0x0),
        token,
        0xB1,
        1000,
        100,
        0,
        IntentStatus::PENDING(())
    );
    intent_registry_dispatcher.add_intent_to_batch(batch_id, intent_id);
    stop_cheat_caller_address(mock_intent_registry);

    let token_dispatcher = IMockERC20Dispatcher { contract_address: token };
    start_cheat_caller_address(token, admin);
    token_dispatcher.set_balance(solver, 5000);
    stop_cheat_caller_address(token);

    let settlement_dispatcher = IBatchSettlementDispatcher { contract_address: batch_settlement };
    start_cheat_caller_address(batch_settlement, coordinator);
    let proofs = array![0].span();
    let ok = settlement_dispatcher.settle_batch(batch_id, solver, execution_plan, proofs);
    assert(!ok, 'COMMIT_MISMATCH');
    stop_cheat_caller_address(batch_settlement);
    stop_cheat_block_timestamp_global();
}
