use anyhow::Result;
use tracing::info;
use tracing_subscriber;

mod batch_scheduler;
mod config;
mod starknet_client;

use batch_scheduler::run_scheduler;
use config::CoordinatorConfig;
use starknet_client::StarknetConfig;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    info!("Blind BTC Intent Markets - Batch Coordinator v1.0");
    info!("Initializing coordinator...");

    let _starknet_config = StarknetConfig::from_env()
        .map_err(|e| {
            eprintln!("Failed to load Starknet configuration: {}", e);
            eprintln!("Required environment variables:");
            eprintln!("  - COORDINATOR_PRIVATE_KEY");
            eprintln!("  - COORDINATOR_ACCOUNT_ADDRESS");
            eprintln!("  - STARKNET_CHAIN_ID");
            eprintln!("  - INTENT_REGISTRY_ADDRESS");
            eprintln!("  - BATCH_AUCTION_ADDRESS");
            eprintln!("  - BATCH_SETTLEMENT_ADDRESS");
            e
        })?;

    info!("Starknet configuration loaded");
    info!("Starting batch scheduler...");

    let coordinator_config = CoordinatorConfig::from_env()
        .map_err(|e| anyhow::anyhow!("Failed to load coordinator configuration: {}", e))?;
    coordinator_config.validate()
        .map_err(|e| anyhow::anyhow!("Invalid coordinator configuration: {}", e))?;

    run_scheduler(coordinator_config).await?;

    Ok(())
}
