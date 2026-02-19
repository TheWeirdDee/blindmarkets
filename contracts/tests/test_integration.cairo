use starknet::ContractAddress;
use core::traits::TryInto;
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address,
    stop_cheat_caller_address, start_cheat_block_timestamp_global, stop_cheat_block_timestamp_global,
    start_mock_call, stop_mock_call
};
use core::byte_array::ByteArray;

// Integration test: Full intent lifecycle
// User submits intent -> Batch created -> Solver submits solution -> Auction finalized -> Settlement

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
        deadline: u64,
        privacy_mode: u8,
        user_signature: Span<felt252>
    );
    fn get_intent_status(self: @TContractState, intent_id: felt252) -> felt252;
    fn get_batch_intent_count(self: @TContractState, batch_id: felt252) -> u32;
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
}

#[starknet::interface]
trait ISolverBond<TContractState> {
    fn deposit_bond(ref self: TContractState, amount: u256) -> bool;
    fn get_solver_info(self: @TContractState, solver: ContractAddress) -> SolverInfo;
}

#[starknet::interface]
trait IAssetRegistry<TContractState> {
    fn whitelist_asset(
        ref self: TContractState,
        asset: ContractAddress,
        symbol: felt252,
        decimals: u8
    ) -> bool;
}

#[starknet::interface]
trait IMockERC20<TContractState> {
    fn set_balance(ref self: TContractState, account: ContractAddress, amount: u256) -> bool;
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

#[derive(Drop)]
struct DeployedContracts {
    intent_registry: ContractAddress,
    batch_auction: ContractAddress,
    solver_bond: ContractAddress,
    asset_registry: ContractAddress,
    bond_token: ContractAddress,
}

fn test_address(value: felt252) -> ContractAddress {
    value.try_into().unwrap()
}

fn deploy_all_contracts() -> DeployedContracts {
    let admin = admin_address();
    let coordinator = coordinator_address();
    let treasury = treasury_address();
    let mut bond_token_args: Array<felt252> = array![];
    admin.serialize(ref bond_token_args);
    let bond_token = deploy_contract("MockERC20", bond_token_args);
    
    // Deploy AssetRegistry
    let mut asset_registry_args: Array<felt252> = array![];
    admin.serialize(ref asset_registry_args);
    let asset_registry = deploy_contract("AssetRegistry", asset_registry_args);
    
    // Deploy SolverBond
    let mut solver_bond_args: Array<felt252> = array![];
    admin.serialize(ref solver_bond_args);
    test_address(0).serialize(ref solver_bond_args);
    test_address(0).serialize(ref solver_bond_args);
    bond_token.serialize(ref solver_bond_args);
    treasury.serialize(ref solver_bond_args);
    10000000000000000000_u256.serialize(ref solver_bond_args);
    604800_u64.serialize(ref solver_bond_args);
    2592000_u64.serialize(ref solver_bond_args);
    3_u8.serialize(ref solver_bond_args);
    80_u256.serialize(ref solver_bond_args);
    10_u32.serialize(ref solver_bond_args);
    7776000_u64.serialize(ref solver_bond_args);
    5000_u16.serialize(ref solver_bond_args);
    3000_u16.serialize(ref solver_bond_args);
    2000_u16.serialize(ref solver_bond_args);
    100000000000000000000_u256.serialize(ref solver_bond_args);
    10_u256.serialize(ref solver_bond_args);
    604800_u64.serialize(ref solver_bond_args);
    let solver_bond = deploy_contract("SolverBond", solver_bond_args);
    
    // Deploy BatchAuction
    let mut batch_auction_args: Array<felt252> = array![];
    admin.serialize(ref batch_auction_args);
    solver_bond.serialize(ref batch_auction_args);
    test_address(0).serialize(ref batch_auction_args);
    coordinator.serialize(ref batch_auction_args);
    admin.serialize(ref batch_auction_args);
    admin.serialize(ref batch_auction_args);
    20_u64.serialize(ref batch_auction_args);
    5_u64.serialize(ref batch_auction_args);
    1000000_u256.serialize(ref batch_auction_args);
    1000_u256.serialize(ref batch_auction_args);
    10_u256.serialize(ref batch_auction_args);
    let batch_auction = deploy_contract("BatchAuction", batch_auction_args);
    
    // Deploy IntentRegistry
    let mut intent_registry_args: Array<felt252> = array![];
    admin.serialize(ref intent_registry_args);
    test_address(0).serialize(ref intent_registry_args);
    asset_registry.serialize(ref intent_registry_args);
    30_u64.serialize(ref intent_registry_args);
    0_u64.serialize(ref intent_registry_args);
    let intent_registry = deploy_contract("IntentRegistry", intent_registry_args);
    
    DeployedContracts {
        intent_registry,
        batch_auction,
        solver_bond,
        asset_registry,
        bond_token,
    }
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

fn coordinator_address() -> ContractAddress {
    test_address(0xC001D)
}

fn treasury_address() -> ContractAddress {
    test_address(0x7E457)
}

fn btc_address() -> ContractAddress {
    test_address(0xB7C)
}

fn usdc_address() -> ContractAddress {
    test_address(0x05DC)
}

fn solver_address() -> ContractAddress {
    test_address(0x50E)
}

fn solver1_address() -> ContractAddress {
    test_address(0x501)
}

fn solver2_address() -> ContractAddress {
    test_address(0x502)
}

fn solver3_address() -> ContractAddress {
    test_address(0x503)
}

#[test]
fn test_end_to_end_intent_flow() {
    let contracts = deploy_all_contracts();
    
    // Setup: Whitelist assets
    let admin = admin_address();
    let asset_registry_dispatcher = IAssetRegistryDispatcher {
        contract_address: contracts.asset_registry
    };
    
    start_cheat_caller_address(contracts.asset_registry, admin);
    let btc = btc_address();
    let usdc = usdc_address();
    asset_registry_dispatcher.whitelist_asset(btc, 'BTC', 8);
    asset_registry_dispatcher.whitelist_asset(usdc, 'USDC', 6);
    stop_cheat_caller_address(contracts.asset_registry);
    
    // Step 1: User commits intent
    let user_args: Array<felt252> = array![];
    let user = deploy_contract("MockAccount", user_args);
    let intent_registry_dispatcher = IIntentRegistryDispatcher {
        contract_address: contracts.intent_registry
    };
    
    let signature = array![1, 2].span();
    let amount_commitment: felt252 = 0xA1;
    let min_output: u256 = 1000000_u256;
    let deadline: u64 = 2000;
    let privacy_mode: u8 = 1;
    let nonce: felt252 = 0xBEEF;
    let mut intent_hash = core::pedersen::pedersen(user.into(), btc.into());
    intent_hash = core::pedersen::pedersen(intent_hash, usdc.into());
    intent_hash = core::pedersen::pedersen(intent_hash, amount_commitment);
    let min_output_hash = core::pedersen::pedersen(min_output.low.into(), min_output.high.into());
    intent_hash = core::pedersen::pedersen(intent_hash, min_output_hash);
    intent_hash = core::pedersen::pedersen(intent_hash, deadline.into());
    intent_hash = core::pedersen::pedersen(intent_hash, privacy_mode.into());
    intent_hash = core::pedersen::pedersen(intent_hash, nonce);
    let inner = core::pedersen::pedersen(user.into(), nonce);
    let intent_id = core::pedersen::pedersen(inner, intent_hash);
    
    start_cheat_block_timestamp_global(1);
    start_cheat_caller_address(contracts.intent_registry, user);
    start_mock_call(contracts.asset_registry, selector!("is_whitelisted"), true);
    start_mock_call(user, selector!("is_valid_signature"), true);
    intent_registry_dispatcher.commit_intent(
        intent_id,
        user,
        intent_hash,
        nonce,
        btc,
        usdc,
        amount_commitment,
        min_output,
        deadline,
        privacy_mode,
        signature
    );
    stop_mock_call(user, selector!("is_valid_signature"));
    stop_mock_call(contracts.asset_registry, selector!("is_whitelisted"));
    stop_cheat_caller_address(contracts.intent_registry);
    stop_cheat_block_timestamp_global();
    
    // Step 2: Solver deposits bond
    let solver = solver_address();
    let solver_bond_dispatcher = ISolverBondDispatcher {
        contract_address: contracts.solver_bond
    };
    let bond_token_dispatcher = IMockERC20Dispatcher {
        contract_address: contracts.bond_token
    };
    
    start_cheat_caller_address(contracts.bond_token, admin);
    bond_token_dispatcher.set_balance(solver, 20000000000000000000_u256);
    stop_cheat_caller_address(contracts.bond_token);

    start_cheat_caller_address(contracts.solver_bond, solver);
    solver_bond_dispatcher.deposit_bond(20000000000000000000_u256);
    stop_cheat_caller_address(contracts.solver_bond);
    
    // Step 3: Coordinator creates batch
    let coordinator = coordinator_address();
    let batch_auction_dispatcher = IBatchAuctionDispatcher {
        contract_address: contracts.batch_auction
    };
    
    start_cheat_caller_address(contracts.batch_auction, coordinator);
    let batch_id = 1;
    batch_auction_dispatcher.create_batch(batch_id, 1000, 1);
    stop_cheat_caller_address(contracts.batch_auction);
    
    // Step 4: Solver submits solution
    start_cheat_block_timestamp_global(1001);
    start_cheat_caller_address(contracts.batch_auction, solver);
    batch_auction_dispatcher.submit_solution(
        batch_id,
        0x51D7,
        5000000_u256,
        30,
        0xB0DF
    );
    stop_cheat_caller_address(contracts.batch_auction);
    
    // Step 5: Coordinator finalizes auction
    start_cheat_block_timestamp_global(1025);
    start_mock_call(contracts.solver_bond, selector!("set_locked"), true);
    start_cheat_caller_address(contracts.batch_auction, coordinator);
    let winner = batch_auction_dispatcher.finalize_auction(batch_id);
    assert(winner == solver, 'Wrong winner');
    stop_cheat_caller_address(contracts.batch_auction);
    stop_mock_call(contracts.solver_bond, selector!("set_locked"));
    stop_cheat_block_timestamp_global();
}

#[test]
fn test_multiple_solvers_competition() {
    let contracts = deploy_all_contracts();
    
    // Setup assets
    let admin = admin_address();
    let asset_registry_dispatcher = IAssetRegistryDispatcher {
        contract_address: contracts.asset_registry
    };
    
    start_cheat_caller_address(contracts.asset_registry, admin);
    asset_registry_dispatcher.whitelist_asset(
        btc_address(),
        'BTC',
        8
    );
    asset_registry_dispatcher.whitelist_asset(
        usdc_address(),
        'USDC',
        6
    );
    stop_cheat_caller_address(contracts.asset_registry);
    
    // Create batch
    let coordinator = coordinator_address();
    let batch_auction_dispatcher = IBatchAuctionDispatcher {
        contract_address: contracts.batch_auction
    };
    
    start_cheat_caller_address(contracts.batch_auction, coordinator);
    batch_auction_dispatcher.create_batch(1, 1000, 5);
    stop_cheat_caller_address(contracts.batch_auction);
    
    // Multiple solvers deposit bonds
    let solver_bond_dispatcher = ISolverBondDispatcher {
        contract_address: contracts.solver_bond
    };
    
    let solver1 = solver1_address();
    let solver2 = solver2_address();
    let solver3 = solver3_address();
    
    let bond_token_dispatcher = IMockERC20Dispatcher { contract_address: contracts.bond_token };
    start_cheat_caller_address(contracts.bond_token, admin);
    bond_token_dispatcher.set_balance(solver1, 20000000000000000000_u256);
    bond_token_dispatcher.set_balance(solver2, 20000000000000000000_u256);
    bond_token_dispatcher.set_balance(solver3, 20000000000000000000_u256);
    stop_cheat_caller_address(contracts.bond_token);

    start_cheat_caller_address(contracts.solver_bond, solver1);
    solver_bond_dispatcher.deposit_bond(20000000000000000000_u256);
    stop_cheat_caller_address(contracts.solver_bond);
    
    start_cheat_caller_address(contracts.solver_bond, solver2);
    solver_bond_dispatcher.deposit_bond(20000000000000000000_u256);
    stop_cheat_caller_address(contracts.solver_bond);
    
    start_cheat_caller_address(contracts.solver_bond, solver3);
    solver_bond_dispatcher.deposit_bond(20000000000000000000_u256);
    stop_cheat_caller_address(contracts.solver_bond);
    
    // Submit solutions with different surplus
    start_cheat_block_timestamp_global(1001);
    start_cheat_caller_address(contracts.batch_auction, solver1);
    batch_auction_dispatcher.submit_solution(1, 0x111, 1000000_u256, 50, 0xB0D1);
    stop_cheat_caller_address(contracts.batch_auction);
    
    start_cheat_caller_address(contracts.batch_auction, solver2);
    batch_auction_dispatcher.submit_solution(1, 0x222, 3000000_u256, 30, 0xB0D2);
    stop_cheat_caller_address(contracts.batch_auction);
    
    start_cheat_caller_address(contracts.batch_auction, solver3);
    batch_auction_dispatcher.submit_solution(1, 0x333, 2000000_u256, 40, 0xB0D3);
    stop_cheat_caller_address(contracts.batch_auction);
    
    // Finalize - solver2 should win with highest surplus
    start_cheat_block_timestamp_global(1025);
    start_mock_call(contracts.solver_bond, selector!("set_locked"), true);
    start_cheat_caller_address(contracts.batch_auction, coordinator);
    let winner = batch_auction_dispatcher.finalize_auction(1);
    assert(winner == solver2, 'Solver2 should win');
    stop_cheat_caller_address(contracts.batch_auction);
    stop_mock_call(contracts.solver_bond, selector!("set_locked"));
    stop_cheat_block_timestamp_global();
}

#[test]
fn test_solver_bond_lifecycle() {
    let contracts = deploy_all_contracts();
    
    let solver = solver_address();
    let solver_bond_dispatcher = ISolverBondDispatcher {
        contract_address: contracts.solver_bond
    };
    let bond_token_dispatcher = IMockERC20Dispatcher { contract_address: contracts.bond_token };
    let admin = admin_address();
    
    // Deposit
    start_cheat_caller_address(contracts.bond_token, admin);
    bond_token_dispatcher.set_balance(solver, 50000000000000000000_u256);
    stop_cheat_caller_address(contracts.bond_token);

    start_cheat_caller_address(contracts.solver_bond, solver);
    solver_bond_dispatcher.deposit_bond(50000000000000000000_u256);
    
    let info = solver_bond_dispatcher.get_solver_info(solver);
    assert(info.bond_amount == 50000000000000000000_u256, 'Wrong bond amount');
    assert(!info.blacklisted, 'Should not be blacklisted');
    assert(info.slash_count_30d == 0, 'Should have no slashes');
    
    stop_cheat_caller_address(contracts.solver_bond);
}
