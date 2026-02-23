use blindmarkets_sdk::{GatewayClient, GatewayClientConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let gateway_url = std::env::var("GATEWAY_URL")
        .map_err(|_| "GATEWAY_URL is required")?;
    let api_key_header = std::env::var("GATEWAY_API_KEY_HEADER")
        .map_err(|_| "GATEWAY_API_KEY_HEADER is required")?;
    let api_key = std::env::var("GATEWAY_API_KEY")
        .map_err(|_| "GATEWAY_API_KEY is required")?;
    let timeout_seconds: u64 = std::env::var("GATEWAY_TIMEOUT_SECONDS")
        .map_err(|_| "GATEWAY_TIMEOUT_SECONDS is required")?
        .parse()
        .map_err(|_| "GATEWAY_TIMEOUT_SECONDS must be a u64")?;
    let max_retries: u32 = std::env::var("GATEWAY_MAX_RETRIES")
        .map_err(|_| "GATEWAY_MAX_RETRIES is required")?
        .parse()
        .map_err(|_| "GATEWAY_MAX_RETRIES must be a u32")?;
    let retry_base_delay_ms: u64 = std::env::var("GATEWAY_RETRY_BASE_DELAY_MS")
        .map_err(|_| "GATEWAY_RETRY_BASE_DELAY_MS is required")?
        .parse()
        .map_err(|_| "GATEWAY_RETRY_BASE_DELAY_MS must be a u64")?;
    let retry_max_delay_ms: u64 = std::env::var("GATEWAY_RETRY_MAX_DELAY_MS")
        .map_err(|_| "GATEWAY_RETRY_MAX_DELAY_MS is required")?
        .parse()
        .map_err(|_| "GATEWAY_RETRY_MAX_DELAY_MS must be a u64")?;
    let retry_jitter_ms: u64 = std::env::var("GATEWAY_RETRY_JITTER_MS")
        .map_err(|_| "GATEWAY_RETRY_JITTER_MS is required")?
        .parse()
        .map_err(|_| "GATEWAY_RETRY_JITTER_MS must be a u64")?;

    let intent_id = std::env::var("INTENT_ID")
        .map_err(|_| "INTENT_ID is required")?;

    let client = GatewayClient::new(GatewayClientConfig {
        base_url: gateway_url,
        api_key_header,
        api_key,
        timeout_seconds,
        max_retries,
        retry_base_delay_ms,
        retry_max_delay_ms,
        retry_jitter_ms,
    })?;

    let status = client.get_intent_status(&intent_id).await?;
    println!("Intent {} status: {}", status.intent_id, status.status);
    if let Some(batch_id) = status.batch_id {
        println!("Batch: {}", batch_id);
    }

    Ok(())
}
