use serde::Deserialize;
use std::env;

#[derive(Debug, Clone, Deserialize)]
pub struct CoordinatorConfig {
    pub gateway_url: String,
    pub gateway_api_key_header: String,
    pub gateway_api_key: String,
    pub batch_window_seconds: u64,
    pub genesis_timestamp: u64,
    pub auction_wait_seconds: u64,
    pub scheduler_tick_millis: u64,
}

impl CoordinatorConfig {
    pub fn from_env() -> Result<Self, String> {
        let gateway_url = env::var("GATEWAY_URL")
            .map_err(|_| "GATEWAY_URL environment variable not set".to_string())?;

        let gateway_api_key_header = env::var("GATEWAY_API_KEY_HEADER")
            .map_err(|_| "GATEWAY_API_KEY_HEADER environment variable not set".to_string())?;

        let gateway_api_key = env::var("GATEWAY_API_KEY")
            .map_err(|_| "GATEWAY_API_KEY environment variable not set".to_string())?;

        let batch_window_seconds = env::var("BATCH_WINDOW_SECONDS")
            .map_err(|_| "BATCH_WINDOW_SECONDS environment variable not set".to_string())?
            .parse()
            .map_err(|e| format!("Invalid BATCH_WINDOW_SECONDS: {}", e))?;

        let genesis_timestamp = env::var("GENESIS_TIMESTAMP")
            .map_err(|_| "GENESIS_TIMESTAMP environment variable not set".to_string())?
            .parse()
            .map_err(|e| format!("Invalid GENESIS_TIMESTAMP: {}", e))?;

        let auction_wait_seconds = env::var("AUCTION_WAIT_SECONDS")
            .map_err(|_| "AUCTION_WAIT_SECONDS environment variable not set".to_string())?
            .parse()
            .map_err(|e| format!("Invalid AUCTION_WAIT_SECONDS: {}", e))?;

        let scheduler_tick_millis = env::var("SCHEDULER_TICK_MILLIS")
            .map_err(|_| "SCHEDULER_TICK_MILLIS environment variable not set".to_string())?
            .parse()
            .map_err(|e| format!("Invalid SCHEDULER_TICK_MILLIS: {}", e))?;

        Ok(Self {
            gateway_url,
            gateway_api_key_header,
            gateway_api_key,
            batch_window_seconds,
            genesis_timestamp,
            auction_wait_seconds,
            scheduler_tick_millis,
        })
    }

    pub fn validate(&self) -> Result<(), String> {
        if !self.gateway_url.starts_with("http://") && !self.gateway_url.starts_with("https://") {
            return Err("GATEWAY_URL must start with http:// or https://".to_string());
        }

        if self.gateway_api_key_header.trim().is_empty() {
            return Err("GATEWAY_API_KEY_HEADER must not be empty".to_string());
        }

        if self.gateway_api_key.trim().is_empty() {
            return Err("GATEWAY_API_KEY must not be empty".to_string());
        }

        if self.batch_window_seconds == 0 {
            return Err("BATCH_WINDOW_SECONDS must be greater than 0".to_string());
        }

        if self.genesis_timestamp == 0 {
            return Err("GENESIS_TIMESTAMP must be greater than 0".to_string());
        }

        if self.auction_wait_seconds == 0 {
            return Err("AUCTION_WAIT_SECONDS must be greater than 0".to_string());
        }

        if self.scheduler_tick_millis == 0 {
            return Err("SCHEDULER_TICK_MILLIS must be greater than 0".to_string());
        }

        Ok(())
    }
}
