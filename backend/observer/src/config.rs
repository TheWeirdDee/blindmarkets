use serde::Deserialize;
use std::env;

#[derive(Debug, Clone, Deserialize)]
pub struct ObserverConfig {
    pub rpc_url: String,
    pub poll_interval_seconds: u64,
    pub from_block: u64,
    pub contract_addresses: Vec<String>,
    pub gateway_url: String,
    pub gateway_api_key_header: String,
    pub gateway_api_key: String,
    pub settlement_event_key: String,
    pub settlement_batch_id_index: usize,
    pub failure_event_key: String,
    pub failure_batch_id_index: usize,
    pub failure_reason_index: usize,
    pub intent_commit_event_key: String,
    pub intent_commit_intent_id_index: usize,
    pub intent_commit_user_index: usize,
    pub intent_cancel_event_key: String,
    pub intent_cancel_intent_id_index: usize,
    pub intent_cancel_user_index: usize,
    pub checkpoint_path: String,
}

impl ObserverConfig {
    pub fn from_env() -> Result<Self, String> {
        let rpc_url = env::var("STARKNET_RPC_URL")
            .map_err(|_| "STARKNET_RPC_URL environment variable not set".to_string())?;

        let poll_interval_seconds = env::var("OBSERVER_POLL_INTERVAL_SECONDS")
            .map_err(|_| "OBSERVER_POLL_INTERVAL_SECONDS environment variable not set".to_string())?
            .parse()
            .map_err(|e| format!("Invalid OBSERVER_POLL_INTERVAL_SECONDS: {}", e))?;

        let from_block = env::var("OBSERVER_FROM_BLOCK")
            .map_err(|_| "OBSERVER_FROM_BLOCK environment variable not set".to_string())?
            .parse()
            .map_err(|e| format!("Invalid OBSERVER_FROM_BLOCK: {}", e))?;

        let contract_addresses = env::var("OBSERVER_CONTRACT_ADDRESSES")
            .map_err(|_| "OBSERVER_CONTRACT_ADDRESSES environment variable not set".to_string())?
            .split(',')
            .map(|addr| addr.trim().to_string())
            .filter(|addr| !addr.is_empty())
            .collect::<Vec<_>>();

        let gateway_url = env::var("GATEWAY_URL")
            .map_err(|_| "GATEWAY_URL environment variable not set".to_string())?;
        let gateway_api_key_header = env::var("GATEWAY_API_KEY_HEADER")
            .map_err(|_| "GATEWAY_API_KEY_HEADER environment variable not set".to_string())?;
        let gateway_api_key = env::var("GATEWAY_API_KEY")
            .map_err(|_| "GATEWAY_API_KEY environment variable not set".to_string())?;
        let settlement_event_key = env::var("OBSERVER_SETTLEMENT_EVENT_KEY")
            .map_err(|_| "OBSERVER_SETTLEMENT_EVENT_KEY environment variable not set".to_string())?;
        let settlement_batch_id_index = env::var("OBSERVER_SETTLEMENT_BATCH_ID_INDEX")
            .map_err(|_| "OBSERVER_SETTLEMENT_BATCH_ID_INDEX environment variable not set".to_string())?
            .parse()
            .map_err(|e| format!("Invalid OBSERVER_SETTLEMENT_BATCH_ID_INDEX: {}", e))?;
        let failure_event_key = env::var("OBSERVER_FAILURE_EVENT_KEY")
            .map_err(|_| "OBSERVER_FAILURE_EVENT_KEY environment variable not set".to_string())?;
        let failure_batch_id_index = env::var("OBSERVER_FAILURE_BATCH_ID_INDEX")
            .map_err(|_| "OBSERVER_FAILURE_BATCH_ID_INDEX environment variable not set".to_string())?
            .parse()
            .map_err(|e| format!("Invalid OBSERVER_FAILURE_BATCH_ID_INDEX: {}", e))?;
        let failure_reason_index = env::var("OBSERVER_FAILURE_REASON_INDEX")
            .map_err(|_| "OBSERVER_FAILURE_REASON_INDEX environment variable not set".to_string())?
            .parse()
            .map_err(|e| format!("Invalid OBSERVER_FAILURE_REASON_INDEX: {}", e))?;
        let intent_commit_event_key = env::var("OBSERVER_INTENT_COMMIT_EVENT_KEY")
            .map_err(|_| "OBSERVER_INTENT_COMMIT_EVENT_KEY environment variable not set".to_string())?;
        let intent_commit_intent_id_index = env::var("OBSERVER_INTENT_COMMIT_INTENT_ID_INDEX")
            .map_err(|_| "OBSERVER_INTENT_COMMIT_INTENT_ID_INDEX environment variable not set".to_string())?
            .parse()
            .map_err(|e| format!("Invalid OBSERVER_INTENT_COMMIT_INTENT_ID_INDEX: {}", e))?;
        let intent_commit_user_index = env::var("OBSERVER_INTENT_COMMIT_USER_INDEX")
            .map_err(|_| "OBSERVER_INTENT_COMMIT_USER_INDEX environment variable not set".to_string())?
            .parse()
            .map_err(|e| format!("Invalid OBSERVER_INTENT_COMMIT_USER_INDEX: {}", e))?;
        let intent_cancel_event_key = env::var("OBSERVER_INTENT_CANCEL_EVENT_KEY")
            .map_err(|_| "OBSERVER_INTENT_CANCEL_EVENT_KEY environment variable not set".to_string())?;
        let intent_cancel_intent_id_index = env::var("OBSERVER_INTENT_CANCEL_INTENT_ID_INDEX")
            .map_err(|_| "OBSERVER_INTENT_CANCEL_INTENT_ID_INDEX environment variable not set".to_string())?
            .parse()
            .map_err(|e| format!("Invalid OBSERVER_INTENT_CANCEL_INTENT_ID_INDEX: {}", e))?;
        let intent_cancel_user_index = env::var("OBSERVER_INTENT_CANCEL_USER_INDEX")
            .map_err(|_| "OBSERVER_INTENT_CANCEL_USER_INDEX environment variable not set".to_string())?
            .parse()
            .map_err(|e| format!("Invalid OBSERVER_INTENT_CANCEL_USER_INDEX: {}", e))?;
        let checkpoint_path = env::var("OBSERVER_CHECKPOINT_PATH")
            .map_err(|_| "OBSERVER_CHECKPOINT_PATH environment variable not set".to_string())?;

        Ok(Self {
            rpc_url,
            poll_interval_seconds,
            from_block,
            contract_addresses,
            gateway_url,
            gateway_api_key_header,
            gateway_api_key,
            settlement_event_key,
            settlement_batch_id_index,
            failure_event_key,
            failure_batch_id_index,
            failure_reason_index,
            intent_commit_event_key,
            intent_commit_intent_id_index,
            intent_commit_user_index,
            intent_cancel_event_key,
            intent_cancel_intent_id_index,
            intent_cancel_user_index,
            checkpoint_path,
        })
    }

    pub fn validate(&self) -> Result<(), String> {
        if !self.rpc_url.starts_with("http://") && !self.rpc_url.starts_with("https://") {
            return Err("STARKNET_RPC_URL must start with http:// or https://".to_string());
        }

        if self.poll_interval_seconds == 0 {
            return Err("OBSERVER_POLL_INTERVAL_SECONDS must be greater than 0".to_string());
        }

        if self.contract_addresses.is_empty() {
            return Err("OBSERVER_CONTRACT_ADDRESSES must include at least one address".to_string());
        }

        for address in &self.contract_addresses {
            if !address.starts_with("0x") {
                return Err(format!("Invalid contract address: {}", address));
            }
        }

        if !self.gateway_url.starts_with("http://") && !self.gateway_url.starts_with("https://") {
            return Err("GATEWAY_URL must start with http:// or https://".to_string());
        }

        if self.gateway_api_key_header.trim().is_empty() {
            return Err("GATEWAY_API_KEY_HEADER must not be empty".to_string());
        }

        if self.gateway_api_key.trim().is_empty() {
            return Err("GATEWAY_API_KEY must not be empty".to_string());
        }

        if !self.settlement_event_key.starts_with("0x") {
            return Err("OBSERVER_SETTLEMENT_EVENT_KEY must start with 0x".to_string());
        }
        if !self.failure_event_key.starts_with("0x") {
            return Err("OBSERVER_FAILURE_EVENT_KEY must start with 0x".to_string());
        }
        if !self.intent_commit_event_key.starts_with("0x") {
            return Err("OBSERVER_INTENT_COMMIT_EVENT_KEY must start with 0x".to_string());
        }
        if !self.intent_cancel_event_key.starts_with("0x") {
            return Err("OBSERVER_INTENT_CANCEL_EVENT_KEY must start with 0x".to_string());
        }

        if self.checkpoint_path.trim().is_empty() {
            return Err("OBSERVER_CHECKPOINT_PATH must not be empty".to_string());
        }

        Ok(())
    }
}
