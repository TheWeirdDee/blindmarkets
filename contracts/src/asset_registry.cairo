use starknet::ContractAddress;

#[starknet::interface]
trait IAssetRegistry<TContractState> {
    fn whitelist_asset(
        ref self: TContractState,
        asset: ContractAddress,
        symbol: felt252,
        decimals: u8
    ) -> bool;

    fn remove_asset(ref self: TContractState, asset: ContractAddress) -> bool;

    fn is_whitelisted(self: @TContractState, asset: ContractAddress) -> bool;

    fn get_asset_info(self: @TContractState, asset: ContractAddress) -> AssetInfo;
}

#[derive(Drop, Serde, starknet::Store)]
struct AssetInfo {
    asset: ContractAddress,
    symbol: felt252,
    decimals: u8,
    whitelisted: bool,
    whitelisted_at: u64,
}

#[starknet::contract]
mod AssetRegistry {
    use super::{IAssetRegistry, AssetInfo};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess
    };

    #[storage]
    struct Storage {
        assets: Map<ContractAddress, AssetInfo>,
        admin: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        AssetWhitelisted: AssetWhitelisted,
        AssetRemoved: AssetRemoved,
    }

    #[derive(Drop, starknet::Event)]
    struct AssetWhitelisted {
        asset: ContractAddress,
        symbol: felt252,
        decimals: u8,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct AssetRemoved {
        asset: ContractAddress,
        timestamp: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self.admin.write(admin);
    }

    #[abi(embed_v0)]
    impl AssetRegistryImpl of IAssetRegistry<ContractState> {
        fn whitelist_asset(
            ref self: ContractState,
            asset: ContractAddress,
            symbol: felt252,
            decimals: u8
        ) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');

            let current_time = get_block_timestamp();

            let info = AssetInfo {
                asset,
                symbol,
                decimals,
                whitelisted: true,
                whitelisted_at: current_time,
            };

            self.assets.write(asset, info);

            self.emit(AssetWhitelisted {
                asset,
                symbol,
                decimals,
                timestamp: current_time,
            });

            true
        }

        fn remove_asset(ref self: ContractState, asset: ContractAddress) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin');

            let mut info = self.assets.read(asset);
            assert(info.whitelisted, 'Asset not whitelisted');

            info.whitelisted = false;
            self.assets.write(asset, info);

            let current_time = get_block_timestamp();

            self.emit(AssetRemoved {
                asset,
                timestamp: current_time,
            });

            true
        }

        fn is_whitelisted(self: @ContractState, asset: ContractAddress) -> bool {
            let info = self.assets.read(asset);
            info.whitelisted
        }

        fn get_asset_info(self: @ContractState, asset: ContractAddress) -> AssetInfo {
            self.assets.read(asset)
        }
    }
}
