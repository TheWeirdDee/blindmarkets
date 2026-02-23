use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use starknet::accounts::{Account, Call, ConnectedAccount, ExecutionEncoding, SingleOwnerAccount};
use starknet::core::types::{BlockId, BlockTag, FieldElement, FunctionCall};
use starknet::providers::jsonrpc::{HttpTransport, JsonRpcClient};
use starknet::providers::Provider;
use starknet::signers::{LocalWallet, SigningKey};
use tracing::info;

#[derive(Debug, Serialize, Deserialize)]
pub struct StarknetConfig {
    pub rpc_url: String,
    pub chain_id: String,
    pub account_address: String,
    pub private_key: String,
    pub intent_registry_address: String,
    pub batch_auction_address: String,
    pub batch_settlement_address: String,
}

impl StarknetConfig {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            rpc_url: std::env::var("STARKNET_RPC_URL")
                .map_err(|_| anyhow::anyhow!("STARKNET_RPC_URL environment variable not set"))?,
            chain_id: std::env::var("STARKNET_CHAIN_ID")
                .map_err(|_| anyhow::anyhow!("STARKNET_CHAIN_ID environment variable not set"))?,
            account_address: std::env::var("COORDINATOR_ACCOUNT_ADDRESS")
                .map_err(|_| anyhow::anyhow!("COORDINATOR_ACCOUNT_ADDRESS environment variable not set"))?,
            private_key: std::env::var("COORDINATOR_PRIVATE_KEY")?,
            intent_registry_address: std::env::var("INTENT_REGISTRY_ADDRESS")?,
            batch_auction_address: std::env::var("BATCH_AUCTION_ADDRESS")?,
            batch_settlement_address: std::env::var("BATCH_SETTLEMENT_ADDRESS")?,
        })
    }
}

pub struct StarknetClient {
    account: SingleOwnerAccount<JsonRpcClient<HttpTransport>, LocalWallet>,
    batch_auction_address: FieldElement,
}

impl StarknetClient {
    pub fn new(config: StarknetConfig) -> Result<Self> {
        let rpc_url = reqwest::Url::parse(&config.rpc_url)
            .map_err(|e| anyhow!("Invalid rpc_url: {}", e))?;
        let provider = JsonRpcClient::new(HttpTransport::new(rpc_url));
        let account_address = parse_field_element(&config.account_address, "account_address")?;
        let chain_id = parse_field_element(&config.chain_id, "chain_id")?;
        let private_key = parse_field_element(&config.private_key, "private_key")?;
        let signer = LocalWallet::from(SigningKey::from_secret_scalar(private_key));
        let account = SingleOwnerAccount::new(
            provider,
            signer,
            account_address,
            chain_id,
            ExecutionEncoding::New,
        );
        let batch_auction_address =
            parse_field_element(&config.batch_auction_address, "batch_auction_address")?;
        Ok(Self {
            account,
            batch_auction_address,
        })
    }

    pub async fn create_batch(
        &self,
        batch_id: u64,
        close_time: u64,
        intent_count: u32,
    ) -> Result<String> {
        info!("Creating batch {} on Starknet", batch_id);

        let calldata = vec![
            FieldElement::from(batch_id as u128),
            FieldElement::from(close_time as u128),
            FieldElement::from(intent_count as u128),
        ];

        let call = Call {
            to: self.batch_auction_address,
            selector: selector_from_name("create_batch")?,
            calldata,
        };

        let tx = self.account.execute(vec![call]).send().await?;
        Ok(format!("{:#x}", tx.transaction_hash))
    }

    pub async fn finalize_auction(&self, batch_id: u64) -> Result<String> {
        info!("Finalizing auction for batch {} on Starknet", batch_id);

        let call = Call {
            to: self.batch_auction_address,
            selector: selector_from_name("finalize_auction")?,
            calldata: vec![FieldElement::from(batch_id as u128)],
        };

        let tx = self.account.execute(vec![call]).send().await?;
        Ok(format!("{:#x}", tx.transaction_hash))
    }

    pub async fn get_winning_solver(&self, batch_id: u64) -> Result<String> {
        info!("Querying winning solver for batch {}", batch_id);

        let call = FunctionCall {
            contract_address: self.batch_auction_address,
            entry_point_selector: selector_from_name("get_winning_solver")?,
            calldata: vec![FieldElement::from(batch_id as u128)],
        };

        let response = self
            .account
            .provider()
            .call(call, BlockId::Tag(BlockTag::Latest))
            .await?;
        let solver = response.get(0).cloned().unwrap_or(FieldElement::ZERO);
        Ok(format!("{:#x}", solver))
    }
}

fn selector_from_name(name: &str) -> Result<FieldElement> {
    starknet::core::utils::get_selector_from_name(name)
        .map_err(|e| anyhow!("Failed to derive selector for {}: {}", name, e))
}

fn parse_field_element(value: &str, label: &str) -> Result<FieldElement> {
    if let Some(stripped) = value.strip_prefix("0x") {
        FieldElement::from_hex_be(stripped)
            .map_err(|e| anyhow!("Invalid {} hex: {}", label, e))
    } else {
        FieldElement::from_dec_str(value)
            .map_err(|e| anyhow!("Invalid {} decimal: {}", label, e))
    }
}
