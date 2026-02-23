use anyhow::Result;
use tracing::info;

mod config;
mod indexer;

use config::ObserverConfig;
use indexer::ObserverIndexer;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    info!("Blind BTC Intent Markets - Observer v1.0");

    let config = ObserverConfig::from_env()
        .map_err(|e| anyhow::anyhow!("Failed to load observer configuration: {}", e))?;
    config.validate()
        .map_err(|e| anyhow::anyhow!("Invalid observer configuration: {}", e))?;

    let mut indexer = ObserverIndexer::new(config);
    indexer.run().await?;

    Ok(())
}
