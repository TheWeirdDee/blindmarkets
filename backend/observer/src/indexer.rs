use anyhow::Result;
use serde::{Deserialize, Serialize};
use tracing::{error, info, warn};

use crate::config::ObserverConfig;

#[derive(Debug, Clone, Serialize)]
struct EventsRequest {
    jsonrpc: &'static str,
    method: &'static str,
    params: EventsParams,
    id: u64,
}

#[derive(Debug, Clone, Serialize)]
struct EventsParams {
    filter: EventsFilter,
    continuation_token: Option<String>,
    chunk_size: u64,
}

#[derive(Debug, Clone, Serialize)]
struct EventsFilter {
    from_block: BlockId,
    to_block: BlockId,
    address: Option<String>,
    keys: Option<Vec<Vec<String>>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
enum BlockId {
    Number { number: u64 },
    Latest,
}

#[derive(Debug, Deserialize)]
struct EventsResponse {
    result: EventsResult,
}

#[derive(Debug, Deserialize)]
struct EventsResult {
    events: Vec<RawEvent>,
    continuation_token: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RawEvent {
    from_address: String,
    keys: Vec<String>,
    data: Vec<String>,
    block_number: u64,
    transaction_hash: String,
}

pub struct ObserverIndexer {
    config: ObserverConfig,
    client: reqwest::Client,
    current_block: u64,
}

impl ObserverIndexer {
    pub fn new(config: ObserverConfig) -> Self {
        let current_block = read_checkpoint(&config.checkpoint_path)
            .unwrap_or(config.from_block);
        Self {
            config,
            client: reqwest::Client::new(),
            current_block,
        }
    }

    pub async fn run(&mut self) -> Result<()> {
        loop {
            if let Err(e) = self.poll_events().await {
                error!("Observer poll error (will retry): {}", e);
            }
            tokio::time::sleep(std::time::Duration::from_secs(
                self.config.poll_interval_seconds
            ))
            .await;
        }
    }

    async fn poll_events(&mut self) -> Result<()> {
        let mut max_seen_block = self.current_block;
        for address in &self.config.contract_addresses {
            let mut continuation: Option<String> = None;
            loop {
                let response = self.fetch_events(address, continuation.clone()).await?;
                let events = response.result.events;

                if events.is_empty() && continuation.is_none() {
                    break;
                }

                for event in events {
                    if event.block_number > max_seen_block {
                        max_seen_block = event.block_number;
                    }
                    self.handle_event(event).await?;
                }

                continuation = response.result.continuation_token;
                if continuation.is_none() {
                    break;
                }
            }
        }

        if max_seen_block >= self.current_block {
            self.current_block = max_seen_block + 1;
            if let Err(e) = write_checkpoint(&self.config.checkpoint_path, self.current_block) {
                warn!("Failed to write observer checkpoint: {}", e);
            }
        }

        Ok(())
    }

    async fn fetch_events(
        &self,
        address: &str,
        continuation_token: Option<String>,
    ) -> Result<EventsResponse> {
        let request = EventsRequest {
            jsonrpc: "2.0",
            method: "starknet_getEvents",
            params: EventsParams {
                filter: EventsFilter {
                    from_block: BlockId::Number {
                        number: self.current_block,
                    },
                    to_block: BlockId::Latest,
                    address: Some(address.to_string()),
                    keys: None,
                },
                continuation_token,
                chunk_size: 100,
            },
            id: 1,
        };

        let response = self.client
            .post(&self.config.rpc_url)
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            warn!("Observer RPC error: {}", body);
            return Err(anyhow::anyhow!("Observer RPC error"));
        }

        let parsed: EventsResponse = response.json().await?;
        Ok(parsed)
    }

    async fn handle_event(&mut self, event: RawEvent) -> Result<()> {
        info!(
            "Event: contract={} block={} tx={}",
            event.from_address, event.block_number, event.transaction_hash
        );

        if self.is_settlement_event(&event) {
            if let Err(e) = self.handle_settlement_event(&event).await {
                warn!("Failed to handle settlement event: {}", e);
            }
        }
        if self.is_failure_event(&event) {
            if let Err(e) = self.handle_failure_event(&event).await {
                warn!("Failed to handle failure event: {}", e);
            }
        }
        if self.is_intent_commit_event(&event) {
            if let Err(e) = self.handle_intent_commit_event(&event).await {
                warn!("Failed to handle intent commit event: {}", e);
            }
        }
        if self.is_intent_cancel_event(&event) {
            if let Err(e) = self.handle_intent_cancel_event(&event).await {
                warn!("Failed to handle intent cancel event: {}", e);
            }
        }

        Ok(())
    }

    fn is_settlement_event(&self, event: &RawEvent) -> bool {
        event.keys.iter().any(|key| key.eq_ignore_ascii_case(&self.config.settlement_event_key))
    }

    fn is_failure_event(&self, event: &RawEvent) -> bool {
        event.keys.iter().any(|key| key.eq_ignore_ascii_case(&self.config.failure_event_key))
    }

    fn is_intent_commit_event(&self, event: &RawEvent) -> bool {
        event
            .keys
            .iter()
            .any(|key| key.eq_ignore_ascii_case(&self.config.intent_commit_event_key))
    }

    fn is_intent_cancel_event(&self, event: &RawEvent) -> bool {
        event
            .keys
            .iter()
            .any(|key| key.eq_ignore_ascii_case(&self.config.intent_cancel_event_key))
    }

    async fn handle_settlement_event(&self, event: &RawEvent) -> Result<()> {
        let index = self.config.settlement_batch_id_index;
        if event.data.len() <= index {
            return Err(anyhow::anyhow!("Settlement event data missing batch_id"));
        }

        let batch_id = parse_hex_u128(&event.data[index])?.to_string();
        let settled_at = chrono::Utc::now().timestamp();
        self.post_gateway_json(
            "/v1/batches/settled",
            serde_json::json!({
                "batch_id": batch_id,
                "settled_at": settled_at
            }),
            "settle batch",
        )
        .await
    }

    async fn handle_failure_event(&self, event: &RawEvent) -> Result<()> {
        let batch_index = self.config.failure_batch_id_index;
        let reason_index = self.config.failure_reason_index;
        if event.data.len() <= batch_index || event.data.len() <= reason_index {
            return Err(anyhow::anyhow!("Failure event data missing fields"));
        }

        let batch_id = parse_hex_u128(&event.data[batch_index])?.to_string();
        let failure_reason = event.data[reason_index].clone();
        let failed_at = chrono::Utc::now().timestamp();
        self.post_gateway_json(
            "/v1/batches/failed",
            serde_json::json!({
                "batch_id": batch_id,
                "failure_reason": failure_reason,
                "failed_at": failed_at
            }),
            "report batch failure",
        )
        .await
    }

    async fn handle_intent_commit_event(&self, event: &RawEvent) -> Result<()> {
        let intent_id_index = self.config.intent_commit_intent_id_index;
        let user_index = self.config.intent_commit_user_index;
        if event.data.len() <= intent_id_index || event.data.len() <= user_index {
            return Err(anyhow::anyhow!("Intent commit event data missing fields"));
        }

        let intent_id = normalize_hex_felt(&event.data[intent_id_index])?;
        let user_address = normalize_hex_felt(&event.data[user_index])?;
        let tx_hash = normalize_hex_felt(&event.transaction_hash)?;

        self.post_gateway_json(
            &format!("/v1/intents/{}/onchain", intent_id),
            serde_json::json!({
                "action": "COMMITTED",
                "user_address": user_address,
                "tx_hash": tx_hash,
            }),
            "reconcile intent commit",
        )
        .await
    }

    async fn handle_intent_cancel_event(&self, event: &RawEvent) -> Result<()> {
        let intent_id_index = self.config.intent_cancel_intent_id_index;
        let user_index = self.config.intent_cancel_user_index;
        if event.data.len() <= intent_id_index || event.data.len() <= user_index {
            return Err(anyhow::anyhow!("Intent cancel event data missing fields"));
        }

        let intent_id = normalize_hex_felt(&event.data[intent_id_index])?;
        let user_address = normalize_hex_felt(&event.data[user_index])?;
        let tx_hash = normalize_hex_felt(&event.transaction_hash)?;

        self.post_gateway_json(
            &format!("/v1/intents/{}/onchain", intent_id),
            serde_json::json!({
                "action": "CANCELED",
                "user_address": user_address,
                "tx_hash": tx_hash,
            }),
            "reconcile intent cancel",
        )
        .await
    }

    async fn post_gateway_json(
        &self,
        path: &str,
        payload: serde_json::Value,
        operation: &str,
    ) -> Result<()> {
        let mut attempts: u32 = 0;
        let gateway_url = self.config.gateway_url.trim_end_matches('/');

        loop {
            attempts += 1;
            let response = self.client
                .post(format!("{}{}", gateway_url, path))
                .header(
                    self.config.gateway_api_key_header.as_str(),
                    self.config.gateway_api_key.as_str(),
                )
                .json(&payload)
                .send()
                .await?;

            let status = response.status();

            if status.is_success() {
                return Ok(());
            }

            if status.is_client_error() && status != reqwest::StatusCode::TOO_MANY_REQUESTS {
                let body = response.text().await.unwrap_or_default();
                return Err(anyhow::anyhow!(
                    "Gateway {} rejected request with {}: {}",
                    operation,
                    status,
                    body
                ));
            }

            let body = response.text().await.unwrap_or_default();
            warn!("Gateway {} error (attempt {}): {}", operation, attempts, body);
            if attempts >= 5 {
                return Err(anyhow::anyhow!("Gateway {} error: {}", operation, body));
            }
            tokio::time::sleep(std::time::Duration::from_secs(2_u64.pow(attempts))).await;
        }
    }
}

fn parse_hex_u128(value: &str) -> Result<u128> {
    let trimmed = value.trim_start_matches("0x");
    u128::from_str_radix(trimmed, 16)
        .map_err(|e| anyhow::anyhow!("Invalid hex value {}: {}", value, e))
}

fn normalize_hex_felt(value: &str) -> Result<String> {
    let trimmed = value.trim();
    if !trimmed.starts_with("0x") {
        return Err(anyhow::anyhow!("Invalid felt value {}: missing 0x prefix", value));
    }
    let raw = trimmed.trim_start_matches("0x");
    if raw.is_empty() || !raw.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(anyhow::anyhow!("Invalid felt value {}", value));
    }
    Ok(format!("0x{}", raw.to_ascii_lowercase()))
}

fn read_checkpoint(path: &str) -> Option<u64> {
    let contents = std::fs::read_to_string(path).ok()?;
    contents.trim().parse::<u64>().ok()
}

fn write_checkpoint(path: &str, block: u64) -> Result<()> {
    std::fs::write(path, block.to_string())
        .map_err(|e| anyhow::anyhow!("Failed to write checkpoint: {}", e))
}
