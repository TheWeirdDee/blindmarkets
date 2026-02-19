use starknet::ContractAddress;
use core::traits::TryInto;
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address,
    stop_cheat_caller_address, start_cheat_block_timestamp_global, stop_cheat_block_timestamp_global,
    start_mock_call, stop_mock_call
};
use core::byte_array::ByteArray;

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
    fn cancel_intent(
        ref self: TContractState,
        intent_id: felt252,
        user_signature: Span<felt252>
    ) -> bool;
    fn get_intent(self: @TContractState, intent_id: felt252) -> Intent;
    fn get_intent_status(self: @TContractState, intent_id: felt252) -> felt252;
    fn pause(ref self: TContractState) -> bool;
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

#[derive(Drop, Serde, starknet::Store)]
struct Intent {
    intent_id: felt252,
    user: ContractAddress,
    asset_in: ContractAddress,
    asset_out: ContractAddress,
    amount_commitment: felt252,
    min_output: u256,
    deadline: u64,
    privacy_mode: u8,
    status: felt252,
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

fn deploy_asset_registry(admin: ContractAddress) -> ContractAddress {
    let mut constructor_args: Array<felt252> = array![];
    admin.serialize(ref constructor_args);
    deploy_contract("AssetRegistry", constructor_args)
}

fn deploy_mock_account() -> ContractAddress {
    let constructor_args: Array<felt252> = array![];
    deploy_contract("MockAccount", constructor_args)
}

fn deploy_intent_registry(
    admin: ContractAddress,
    batch_settlement: ContractAddress,
    asset_registry: ContractAddress,
    batch_window_seconds: u64,
    genesis_timestamp: u64
) -> ContractAddress {
    let mut constructor_args: Array<felt252> = array![];
    admin.serialize(ref constructor_args);
    batch_settlement.serialize(ref constructor_args);
    asset_registry.serialize(ref constructor_args);
    batch_window_seconds.serialize(ref constructor_args);
    genesis_timestamp.serialize(ref constructor_args);
    deploy_contract("IntentRegistry", constructor_args)
}

fn compute_intent_hash(
    user: ContractAddress,
    asset_in: ContractAddress,
    asset_out: ContractAddress,
    amount_commitment: felt252,
    min_output: u256,
    deadline: u64,
    privacy_mode: u8,
    nonce: felt252
) -> felt252 {
    let mut hash = core::pedersen::pedersen(user.into(), asset_in.into());
    hash = core::pedersen::pedersen(hash, asset_out.into());
    hash = core::pedersen::pedersen(hash, amount_commitment);
    let min_output_hash = core::pedersen::pedersen(min_output.low.into(), min_output.high.into());
    hash = core::pedersen::pedersen(hash, min_output_hash);
    hash = core::pedersen::pedersen(hash, deadline.into());
    hash = core::pedersen::pedersen(hash, privacy_mode.into());
    core::pedersen::pedersen(hash, nonce)
}

fn compute_intent_id(user: ContractAddress, nonce: felt252, intent_hash: felt252) -> felt252 {
    let inner = core::pedersen::pedersen(user.into(), nonce);
    core::pedersen::pedersen(inner, intent_hash)
}

fn start_mock_signature_ok(user: ContractAddress) {
    start_mock_call(user, selector!("is_valid_signature"), true);
}

fn stop_mock_signature_ok(user: ContractAddress) {
    stop_mock_call(user, selector!("is_valid_signature"));
}

fn start_mock_whitelist_ok(asset_registry: ContractAddress) {
    start_mock_call(asset_registry, selector!("is_whitelisted"), true);
}

fn stop_mock_whitelist_ok(asset_registry: ContractAddress) {
    stop_mock_call(asset_registry, selector!("is_whitelisted"));
}

#[test]
fn test_commit_intent_valid() {
    let admin = test_address(0x111);
    let batch_settlement = test_address(0x222);
    let asset_registry = deploy_asset_registry(admin);
    let user = deploy_mock_account();

    let asset_in = test_address(0xAAA);
    let asset_out = test_address(0xBBB);

    let asset_registry_dispatcher = IAssetRegistryDispatcher { contract_address: asset_registry };
    start_cheat_caller_address(asset_registry, admin);
    asset_registry_dispatcher.whitelist_asset(asset_in, 'BTC', 8);
    asset_registry_dispatcher.whitelist_asset(asset_out, 'USDC', 6);
    stop_cheat_caller_address(asset_registry);

    let intent_registry = deploy_intent_registry(admin, batch_settlement, asset_registry, 30, 0);
    let dispatcher = IIntentRegistryDispatcher { contract_address: intent_registry };

    let amount_commitment: felt252 = 0xA1;
    let min_output: u256 = 1000;
    let deadline: u64 = 1000;
    let privacy_mode: u8 = 0;
    let nonce: felt252 = 0xB1;
    let intent_hash = compute_intent_hash(
        user,
        asset_in,
        asset_out,
        amount_commitment,
        min_output,
        deadline,
        privacy_mode,
        nonce
    );
    let intent_id = compute_intent_id(user, nonce, intent_hash);
    let signature = array![1, 2].span();

    start_cheat_block_timestamp_global(1);
    start_cheat_caller_address(intent_registry, user);
    start_mock_whitelist_ok(asset_registry);
    start_mock_signature_ok(user);
    dispatcher.commit_intent(
        intent_id,
        user,
        intent_hash,
        nonce,
        asset_in,
        asset_out,
        amount_commitment,
        min_output,
        deadline,
        privacy_mode,
        signature
    );
    stop_mock_signature_ok(user);
    stop_mock_whitelist_ok(asset_registry);
    stop_cheat_caller_address(intent_registry);
    stop_cheat_block_timestamp_global();

    let _ = intent_id;
}

#[test]
#[should_panic(expected: ('NONCE_ALREADY_USED',))]
fn test_commit_intent_duplicate_nonce() {
    let admin = test_address(0x111);
    let batch_settlement = test_address(0x222);
    let asset_registry = deploy_asset_registry(admin);
    let user = deploy_mock_account();

    let asset_in = test_address(0xAAA);
    let asset_out = test_address(0xBBB);

    let asset_registry_dispatcher = IAssetRegistryDispatcher { contract_address: asset_registry };
    start_cheat_caller_address(asset_registry, admin);
    asset_registry_dispatcher.whitelist_asset(asset_in, 'BTC', 8);
    asset_registry_dispatcher.whitelist_asset(asset_out, 'USDC', 6);
    stop_cheat_caller_address(asset_registry);

    let intent_registry = deploy_intent_registry(admin, batch_settlement, asset_registry, 30, 0);
    let dispatcher = IIntentRegistryDispatcher { contract_address: intent_registry };

    let amount_commitment: felt252 = 0xA1;
    let min_output: u256 = 1000;
    let deadline: u64 = 1000;
    let privacy_mode: u8 = 0;
    let nonce: felt252 = 0xB1;
    let signature = array![1, 2].span();

    start_cheat_block_timestamp_global(1);
    start_cheat_caller_address(intent_registry, user);
    start_mock_whitelist_ok(asset_registry);
    start_mock_signature_ok(user);

    let intent_hash1 = compute_intent_hash(
        user, asset_in, asset_out, amount_commitment, min_output, deadline, privacy_mode, nonce
    );
    let intent_id1 = compute_intent_id(user, nonce, intent_hash1);
    dispatcher.commit_intent(
        intent_id1,
        user,
        intent_hash1,
        nonce,
        asset_in,
        asset_out,
        amount_commitment,
        min_output,
        deadline,
        privacy_mode,
        signature
    );

    let intent_hash2 = compute_intent_hash(
        user, asset_in, asset_out, amount_commitment, min_output, deadline, privacy_mode, nonce
    );
    let intent_id2 = compute_intent_id(user, nonce, intent_hash2);
    dispatcher.commit_intent(
        intent_id2,
        user,
        intent_hash2,
        nonce,
        asset_in,
        asset_out,
        amount_commitment,
        min_output,
        deadline,
        privacy_mode,
        signature
    );
    stop_mock_whitelist_ok(asset_registry);
    stop_cheat_caller_address(intent_registry);
    stop_cheat_block_timestamp_global();
}

#[test]
#[should_panic(expected: ('DEADLINE_PASSED',))]
fn test_commit_intent_expired_deadline() {
    let admin = test_address(0x111);
    let batch_settlement = test_address(0x222);
    let asset_registry = deploy_asset_registry(admin);
    let user = deploy_mock_account();

    let asset_in = test_address(0xAAA);
    let asset_out = test_address(0xBBB);

    let asset_registry_dispatcher = IAssetRegistryDispatcher { contract_address: asset_registry };
    start_cheat_caller_address(asset_registry, admin);
    asset_registry_dispatcher.whitelist_asset(asset_in, 'BTC', 8);
    asset_registry_dispatcher.whitelist_asset(asset_out, 'USDC', 6);
    stop_cheat_caller_address(asset_registry);

    let intent_registry = deploy_intent_registry(admin, batch_settlement, asset_registry, 30, 0);
    let dispatcher = IIntentRegistryDispatcher { contract_address: intent_registry };

    let amount_commitment: felt252 = 0xA1;
    let min_output: u256 = 1000;
    let deadline: u64 = 5;
    let privacy_mode: u8 = 0;
    let nonce: felt252 = 0xB1;
    let signature = array![1, 2].span();

    start_cheat_block_timestamp_global(10);
    start_cheat_caller_address(intent_registry, user);
    start_mock_whitelist_ok(asset_registry);
    start_mock_signature_ok(user);

    let intent_hash = compute_intent_hash(
        user, asset_in, asset_out, amount_commitment, min_output, deadline, privacy_mode, nonce
    );
    let intent_id = compute_intent_id(user, nonce, intent_hash);
    dispatcher.commit_intent(
        intent_id,
        user,
        intent_hash,
        nonce,
        asset_in,
        asset_out,
        amount_commitment,
        min_output,
        deadline,
        privacy_mode,
        signature
    );
    stop_mock_signature_ok(user);
    stop_mock_whitelist_ok(asset_registry);
    stop_cheat_caller_address(intent_registry);
    stop_cheat_block_timestamp_global();
}

#[test]
#[should_panic(expected: ('Contract is paused',))]
fn test_commit_intent_when_paused() {
    let admin = test_address(0x111);
    let batch_settlement = test_address(0x222);
    let asset_registry = deploy_asset_registry(admin);
    let user = deploy_mock_account();

    let asset_in = test_address(0xAAA);
    let asset_out = test_address(0xBBB);

    let asset_registry_dispatcher = IAssetRegistryDispatcher { contract_address: asset_registry };
    start_cheat_caller_address(asset_registry, admin);
    asset_registry_dispatcher.whitelist_asset(asset_in, 'BTC', 8);
    asset_registry_dispatcher.whitelist_asset(asset_out, 'USDC', 6);
    stop_cheat_caller_address(asset_registry);

    let intent_registry = deploy_intent_registry(admin, batch_settlement, asset_registry, 30, 0);
    let dispatcher = IIntentRegistryDispatcher { contract_address: intent_registry };

    start_cheat_caller_address(intent_registry, admin);
    dispatcher.pause();
    stop_cheat_caller_address(intent_registry);

    let amount_commitment: felt252 = 0xA1;
    let min_output: u256 = 1000;
    let deadline: u64 = 1000;
    let privacy_mode: u8 = 0;
    let nonce: felt252 = 0xB1;
    let intent_hash = compute_intent_hash(
        user, asset_in, asset_out, amount_commitment, min_output, deadline, privacy_mode, nonce
    );
    let intent_id = compute_intent_id(user, nonce, intent_hash);
    let signature = array![1, 2].span();

    start_cheat_block_timestamp_global(1);
    start_cheat_caller_address(intent_registry, user);
    start_mock_whitelist_ok(asset_registry);
    start_mock_signature_ok(user);
    dispatcher.commit_intent(
        intent_id,
        user,
        intent_hash,
        nonce,
        asset_in,
        asset_out,
        amount_commitment,
        min_output,
        deadline,
        privacy_mode,
        signature
    );
    stop_mock_signature_ok(user);
    stop_mock_whitelist_ok(asset_registry);
    stop_cheat_caller_address(intent_registry);
    stop_cheat_block_timestamp_global();
}
