#[starknet::interface]
trait IMockAccount<TContractState> {
    fn is_valid_signature(
        self: @TContractState,
        message_hash: felt252,
        signature: Span<felt252>
    ) -> bool;
}

#[starknet::contract]
mod MockAccount {
    use super::IMockAccount;

    #[storage]
    struct Storage {}

    #[constructor]
    fn constructor(ref self: ContractState) {}

    #[abi(embed_v0)]
    impl MockAccountImpl of IMockAccount<ContractState> {
        fn is_valid_signature(
            self: @ContractState,
            message_hash: felt252,
            signature: Span<felt252>
        ) -> bool {
            let _ = message_hash;
            signature.len() == 2
        }
    }
}
