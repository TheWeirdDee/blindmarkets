#[starknet::interface]
trait IMockProofVerifier<TContractState> {
    fn verify_proof(
        self: @TContractState,
        intent_id: felt252,
        output_amount: u256,
        proof: felt252
    ) -> bool;
}

#[starknet::contract]
mod MockProofVerifier {
    use super::IMockProofVerifier;

    #[storage]
    struct Storage {}

    #[constructor]
    fn constructor(ref self: ContractState) {}

    #[abi(embed_v0)]
    impl MockProofVerifierImpl of IMockProofVerifier<ContractState> {
        fn verify_proof(
            self: @ContractState,
            intent_id: felt252,
            output_amount: u256,
            proof: felt252
        ) -> bool {
            let _ = intent_id;
            let _ = output_amount;
            let _ = proof;
            true
        }
    }
}
