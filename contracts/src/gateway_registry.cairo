use starknet::ContractAddress;

#[starknet::interface]
trait IGatewayRegistry<TContractState> {
    fn register_gateway(
        ref self: TContractState,
        gateway: ContractAddress,
        public_key: felt252
    ) -> bool;

    fn rotate_key(
        ref self: TContractState,
        gateway: ContractAddress,
        new_public_key: felt252
    ) -> bool;

    fn revoke_gateway(ref self: TContractState, gateway: ContractAddress) -> bool;

    fn get_gateway_info(self: @TContractState, gateway: ContractAddress) -> GatewayInfo;

    fn is_gateway_active(self: @TContractState, gateway: ContractAddress) -> bool;
}

#[derive(Drop, Serde, starknet::Store)]
struct GatewayInfo {
    gateway: ContractAddress,
    public_key: felt252,
    registered_at: u64,
    last_key_rotation: u64,
    active: bool,
}

#[starknet::contract]
mod GatewayRegistry {
    use super::{IGatewayRegistry, GatewayInfo};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess
    };

    const KEY_ROTATION_MIN_INTERVAL: u64 = 7776000; // 90 days

    #[storage]
    struct Storage {
        gateways: Map<ContractAddress, GatewayInfo>,
        admin: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        GatewayRegistered: GatewayRegistered,
        KeyRotated: KeyRotated,
        GatewayRevoked: GatewayRevoked,
    }

    #[derive(Drop, starknet::Event)]
    struct GatewayRegistered {
        gateway: ContractAddress,
        public_key: felt252,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct KeyRotated {
        gateway: ContractAddress,
        old_key: felt252,
        new_key: felt252,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct GatewayRevoked {
        gateway: ContractAddress,
        timestamp: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self.admin.write(admin);
    }

    #[abi(embed_v0)]
    impl GatewayRegistryImpl of IGatewayRegistry<ContractState> {
        fn register_gateway(
            ref self: ContractState,
            gateway: ContractAddress,
            public_key: felt252
        ) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin can register');

            let existing = self.gateways.read(gateway);
            assert(existing.registered_at == 0, 'Gateway already registered');

            let current_time = get_block_timestamp();

            let info = GatewayInfo {
                gateway,
                public_key,
                registered_at: current_time,
                last_key_rotation: current_time,
                active: true,
            };

            self.gateways.write(gateway, info);

            self.emit(GatewayRegistered {
                gateway,
                public_key,
                timestamp: current_time,
            });

            true
        }

        fn rotate_key(
            ref self: ContractState,
            gateway: ContractAddress,
            new_public_key: felt252
        ) -> bool {
            let caller = get_caller_address();
            assert(caller == gateway || caller == self.admin.read(), 'Unauthorized');

            let mut info = self.gateways.read(gateway);
            assert(info.active, 'Gateway not active');

            let current_time = get_block_timestamp();
            assert(
                current_time - info.last_key_rotation >= KEY_ROTATION_MIN_INTERVAL,
                'Rotation too soon'
            );

            let old_key = info.public_key;
            info.public_key = new_public_key;
            info.last_key_rotation = current_time;

            self.gateways.write(gateway, info);

            self.emit(KeyRotated {
                gateway,
                old_key,
                new_key: new_public_key,
                timestamp: current_time,
            });

            true
        }

        fn revoke_gateway(ref self: ContractState, gateway: ContractAddress) -> bool {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin can revoke');

            let mut info = self.gateways.read(gateway);
            assert(info.active, 'Gateway already revoked');

            info.active = false;
            self.gateways.write(gateway, info);

            let current_time = get_block_timestamp();

            self.emit(GatewayRevoked {
                gateway,
                timestamp: current_time,
            });

            true
        }

        fn get_gateway_info(self: @ContractState, gateway: ContractAddress) -> GatewayInfo {
            self.gateways.read(gateway)
        }

        fn is_gateway_active(self: @ContractState, gateway: ContractAddress) -> bool {
            let info = self.gateways.read(gateway);
            info.active
        }
    }
}
