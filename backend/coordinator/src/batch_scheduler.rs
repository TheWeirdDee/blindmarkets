use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::time::{sleep, Duration};
use tracing::{info, error, warn};
use chrono::Utc;

use crate::config::CoordinatorConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchMetadata {
    pub batch_id: String,
    pub close_time: u64,
    pub intent_count: u32,
    pub status: BatchStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum BatchStatus {
    Forming,
    Auction,
    Settled,
    Failed,
}

pub struct BatchScheduler {
    genesis_timestamp: u64,
    batch_window_seconds: u64,
}

impl BatchScheduler {
    pub fn new(config: &CoordinatorConfig) -> Self {
        Self {
            genesis_timestamp: config.genesis_timestamp,
            batch_window_seconds: config.batch_window_seconds,
        }
    }

    pub fn current_timestamp(&self) -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_else(|_| Duration::from_secs(0))
            .as_secs()
    }

    pub fn compute_batch_id(&self, timestamp: u64) -> u64 {
        timestamp.saturating_sub(self.genesis_timestamp) / self.batch_window_seconds
    }

    pub fn compute_batch_close_time(&self, batch_id: u64) -> u64 {
        self.genesis_timestamp + (batch_id * self.batch_window_seconds)
    }

    pub fn current_batch_id(&self) -> u64 {
        self.compute_batch_id(self.current_timestamp())
    }

    pub fn next_batch_close_time(&self) -> u64 {
        let current_batch = self.current_batch_id();
        self.compute_batch_close_time(current_batch + 1)
    }

    pub fn time_until_next_batch(&self) -> u64 {
        let next_close = self.next_batch_close_time();
        let now = self.current_timestamp();
        if next_close > now {
            next_close - now
        } else {
            0
        }
    }
}

pub async fn run_scheduler(config: CoordinatorConfig) -> Result<()> {
    info!(
        "Starting batch scheduler with {}s windows",
        config.batch_window_seconds
    );
    
    let scheduler = BatchScheduler::new(&config);
    
    loop {
        let current_batch = scheduler.current_batch_id();
        let next_close_time = scheduler.next_batch_close_time();
        let time_until_close = scheduler.time_until_next_batch();

        info!(
            "Current batch: {}, closes at: {}, time until close: {}s",
            current_batch, next_close_time, time_until_close
        );

        if time_until_close > 0 {
            sleep(Duration::from_secs(time_until_close)).await;
        }

        let batch_id = scheduler.current_batch_id();
        let close_time = scheduler.compute_batch_close_time(batch_id);

        info!("Batch {} closed at {}, forming batch", batch_id, close_time);

        match form_batch(&config, batch_id, close_time).await {
            Ok(intent_count) => {
                info!("Batch {} formed with {} intents", batch_id, intent_count);
                
                if let Err(e) = trigger_auction(&config, batch_id).await {
                    error!("Failed to trigger auction for batch {}: {}", batch_id, e);
                    let _ = report_batch_failure(
                        &config,
                        batch_id,
                        "AUCTION_FINALIZE_FAILED",
                        e.to_string()
                    ).await;
                }
            }
            Err(e) => {
                error!("Failed to form batch {}: {}", batch_id, e);
                let _ = report_batch_failure(
                    &config,
                    batch_id,
                    "BATCH_FORMATION_FAILED",
                    e.to_string()
                ).await;
            }
        }

        sleep(Duration::from_millis(config.scheduler_tick_millis)).await;
    }
}

async fn form_batch(config: &CoordinatorConfig, batch_id: u64, close_time: u64) -> Result<u32> {
    info!("Querying gateway for intents in batch {}", batch_id);
    
    // Query gateway API for pending intents
    let client = reqwest::Client::new();
        let intent_count = match client
            .get(format!("{}/v1/intents/pending", config.gateway_url))
            .header(
                config.gateway_api_key_header.as_str(),
                config.gateway_api_key.as_str()
            )
            .query(&[("batch_id", batch_id.to_string())])
            .send()
            .await
    {
        Ok(response) => {
            if response.status().is_success() {
                let body = response
                    .json::<serde_json::Value>()
                    .await
                    .unwrap_or(serde_json::json!({}));
                body.get("count").and_then(|c| c.as_u64()).unwrap_or(0) as u32
            } else {
                warn!("Gateway returned error, assuming 0 intents");
                0
            }
        }
        Err(e) => {
            warn!("Failed to query gateway: {}, assuming 0 intents", e);
            0
        }
    };

    // Call BatchAuction::create_batch on Starknet
    info!("Creating batch {} on-chain with {} intents", batch_id, intent_count);
    
    let starknet_config = crate::starknet_client::StarknetConfig::from_env()?;
    let starknet_client = crate::starknet_client::StarknetClient::new(starknet_config)?;
    
    match starknet_client.create_batch(batch_id, close_time, intent_count).await {
        Ok(tx_hash) => {
            info!("Batch {} created on-chain, tx: {}", batch_id, tx_hash);
            if let Err(e) = notify_gateway_batch_closed(config, batch_id, close_time, intent_count).await {
                warn!("Failed to notify gateway of batch close {}: {}", batch_id, e);
            }
        }
        Err(e) => {
            error!("Failed to create batch on-chain: {}", e);
            let _ = report_batch_failure(
                config,
                batch_id,
                "CREATE_BATCH_FAILED",
                e.to_string()
            ).await;
            return Err(e);
        }
    }

    Ok(intent_count)
}

async fn notify_gateway_batch_closed(
    config: &CoordinatorConfig,
    batch_id: u64,
    close_time: u64,
    intent_count: u32,
) -> Result<()> {
    let auction_deadline = close_time.saturating_add(config.auction_wait_seconds);
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/v1/batches/close", config.gateway_url))
        .header(
            config.gateway_api_key_header.as_str(),
            config.gateway_api_key.as_str()
        )
        .json(&serde_json::json!({
            "batch_id": batch_id.to_string(),
            "close_time": close_time as i64,
            "intent_count": intent_count as i32,
            "auction_deadline": auction_deadline as i64
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        warn!("Gateway returned non-success for batch close: {}", response.status());
    }

    Ok(())
}

async fn trigger_auction(config: &CoordinatorConfig, batch_id: u64) -> Result<()> {
    info!("Waiting for auction window for batch {}", batch_id);
    
    // Wait for solver submissions
    sleep(Duration::from_secs(config.auction_wait_seconds)).await;

    info!("Finalizing auction for batch {}", batch_id);
    
    // Call BatchAuction::finalize_auction on Starknet
    let starknet_config = crate::starknet_client::StarknetConfig::from_env()?;
    let starknet_client = crate::starknet_client::StarknetClient::new(starknet_config)?;
    
    match starknet_client.finalize_auction(batch_id).await {
        Ok(tx_hash) => {
            info!("Auction finalized for batch {}, tx: {}", batch_id, tx_hash);
            
            // Query winning solver
            match starknet_client.get_winning_solver(batch_id).await {
                Ok(solver) => {
                    if solver != "0x0" {
                        info!("Winning solver for batch {}: {}", batch_id, solver);
                    } else {
                        warn!("No winning solver for batch {}", batch_id);
                    }
                }
                Err(e) => {
                    error!("Failed to query winning solver: {}", e);
                }
            }
        }
        Err(e) => {
            error!("Failed to finalize auction: {}", e);
            let _ = report_batch_failure(
                config,
                batch_id,
                "FINALIZE_AUCTION_FAILED",
                e.to_string()
            ).await;
            return Err(e);
        }
    }
    
    Ok(())
}

async fn report_batch_failure(
    config: &CoordinatorConfig,
    batch_id: u64,
    reason: &str,
    detail: String,
) -> Result<()> {
    let client = reqwest::Client::new();
    let failed_at = Utc::now().timestamp();
    let response = client
        .post(format!("{}/v1/batches/failed", config.gateway_url))
        .header(
            config.gateway_api_key_header.as_str(),
            config.gateway_api_key.as_str()
        )
        .json(&serde_json::json!({
            "batch_id": batch_id.to_string(),
            "failure_reason": format!("{}: {}", reason, detail),
            "failed_at": failed_at
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        warn!(
            "Gateway returned non-success for batch failure {}: {}",
            batch_id,
            response.status()
        );
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> CoordinatorConfig {
        CoordinatorConfig {
            gateway_url: "http://localhost:3000".to_string(),
            gateway_api_key_header: "X-API-Key".to_string(),
            gateway_api_key: "test-key".to_string(),
            batch_window_seconds: 30,
            genesis_timestamp: 1707408000,
            auction_wait_seconds: 20,
            scheduler_tick_millis: 100,
        }
    }

    #[test]
    fn test_batch_id_computation() {
        let scheduler = BatchScheduler::new(&test_config());
        
        let timestamp = test_config().genesis_timestamp + 30;
        let batch_id = scheduler.compute_batch_id(timestamp);
        assert_eq!(batch_id, 1);

        let timestamp2 = test_config().genesis_timestamp + 60;
        let batch_id2 = scheduler.compute_batch_id(timestamp2);
        assert_eq!(batch_id2, 2);
    }

    #[test]
    fn test_batch_close_time() {
        let scheduler = BatchScheduler::new(&test_config());
        
        let close_time = scheduler.compute_batch_close_time(1);
        assert_eq!(close_time, test_config().genesis_timestamp + 30);

        let close_time2 = scheduler.compute_batch_close_time(10);
        assert_eq!(close_time2, test_config().genesis_timestamp + 300);
    }
}
