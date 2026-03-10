use crate::{
    SubmitIntentRequest, SubmitIntentResponse, IntentStatusResponse,
    PendingIntentsResponse, GatewayPublicKeyResponse,
    IntentListResponse, BatchListResponse, BatchIntentListResponse, OnchainLifecycleRequest, SdkError
};
use reqwest::{Client, header::{HeaderMap, HeaderName, HeaderValue}};
use serde_json::json;
use rand::Rng;
use std::time::Duration;

pub struct GatewayClient {
    base_url: String,
    client: Client,
    max_retries: u32,
    retry_base_delay_ms: u64,
    retry_max_delay_ms: u64,
    retry_jitter_ms: u64,
}

pub struct GatewayClientConfig {
    pub base_url: String,
    pub api_key_header: String,
    pub api_key: String,
    pub timeout_seconds: u64,
    pub max_retries: u32,
    pub retry_base_delay_ms: u64,
    pub retry_max_delay_ms: u64,
    pub retry_jitter_ms: u64,
}

impl GatewayClient {
    pub fn new(config: GatewayClientConfig) -> Result<Self, SdkError> {
        if config.base_url.trim().is_empty() {
            return Err(SdkError::NetworkError("base_url must not be empty".to_string()));
        }
        if !config.base_url.starts_with("http://") && !config.base_url.starts_with("https://") {
            return Err(SdkError::NetworkError("base_url must start with http:// or https://".to_string()));
        }
        if config.api_key_header.trim().is_empty() {
            return Err(SdkError::NetworkError("api_key_header must not be empty".to_string()));
        }
        if config.api_key.trim().is_empty() {
            return Err(SdkError::NetworkError("api_key must not be empty".to_string()));
        }
        if config.timeout_seconds == 0 {
            return Err(SdkError::NetworkError("timeout_seconds must be > 0".to_string()));
        }
        if config.retry_base_delay_ms == 0 {
            return Err(SdkError::NetworkError("retry_base_delay_ms must be > 0".to_string()));
        }
        if config.retry_max_delay_ms == 0 {
            return Err(SdkError::NetworkError("retry_max_delay_ms must be > 0".to_string()));
        }

        let header_name = HeaderName::from_bytes(config.api_key_header.as_bytes())
            .map_err(|e| SdkError::NetworkError(format!("Invalid api_key_header: {}", e)))?;
        let header_value = HeaderValue::from_str(config.api_key.as_str())
            .map_err(|e| SdkError::NetworkError(format!("Invalid api_key: {}", e)))?;

        let mut headers = HeaderMap::new();
        headers.insert(header_name, header_value);

        let client = Client::builder()
            .default_headers(headers)
            .timeout(std::time::Duration::from_secs(config.timeout_seconds))
            .build()
            .map_err(|e| SdkError::NetworkError(format!("Client build failed: {}", e)))?;

        Ok(Self {
            base_url: config.base_url,
            client,
            max_retries: config.max_retries,
            retry_base_delay_ms: config.retry_base_delay_ms,
            retry_max_delay_ms: config.retry_max_delay_ms,
            retry_jitter_ms: config.retry_jitter_ms,
        })
    }

    pub async fn submit_intent(
        &self,
        request: SubmitIntentRequest,
    ) -> Result<SubmitIntentResponse, SdkError> {
        let url = format!("{}/v1/intents", self.base_url);

        let response = self.send_with_retry(|| {
            Ok(self.client.post(&url).json(&request))
        }).await?;

        let submit_response: SubmitIntentResponse = response
            .json()
            .await
            .map_err(|e| SdkError::NetworkError(format!("Response parsing failed: {}", e)))?;

        Ok(submit_response)
    }

    pub async fn get_intent_status(&self, intent_id: &str) -> Result<IntentStatusResponse, SdkError> {
        let url = format!("{}/v1/intents/{}", self.base_url, intent_id);

        let response = self.send_with_retry(|| {
            Ok(self.client.get(&url))
        }).await?;

        let status_data: IntentStatusResponse = response
            .json()
            .await
            .map_err(|e| SdkError::NetworkError(format!("Response parsing failed: {}", e)))?;

        Ok(status_data)
    }

    pub async fn cancel_intent(
        &self,
        intent_id: &str,
        user_address: &str,
        signature: Vec<String>,
    ) -> Result<(), SdkError> {
        let url = format!("{}/v1/intents/{}/cancel", self.base_url, intent_id);

        let request_body = json!({
            "user_address": user_address,
            "signature": signature,
        });

        let _ = self.send_with_retry(|| {
            Ok(self.client.post(&url).json(&request_body))
        }).await?;

        Ok(())
    }

    pub async fn reconcile_onchain_intent(
        &self,
        intent_id: &str,
        request: OnchainLifecycleRequest,
    ) -> Result<(), SdkError> {
        let url = format!("{}/v1/intents/{}/onchain", self.base_url, intent_id);

        let _ = self.send_with_retry(|| {
            Ok(self.client.post(&url).json(&request))
        }).await?;

        Ok(())
    }

    pub async fn health_check(&self) -> Result<bool, SdkError> {
        let url = format!("{}/health", self.base_url);

        let response = self.send_with_retry(|| {
            Ok(self.client.get(&url))
        }).await?;

        Ok(response.status().is_success())
    }

    pub async fn get_pending_intents(&self, batch_id: Option<&str>) -> Result<PendingIntentsResponse, SdkError> {
        let url = format!("{}/v1/intents/pending", self.base_url);
        let request = self.client.get(&url);
        let request = if let Some(batch) = batch_id {
            request.query(&[("batch_id", batch)])
        } else {
            request
        };

        let response = self.send_with_retry(|| {
            request
                .try_clone()
                .ok_or_else(|| SdkError::NetworkError("Failed to clone request builder".to_string()))
        }).await?;

        let data: PendingIntentsResponse = response
            .json()
            .await
            .map_err(|e| SdkError::NetworkError(format!("Response parsing failed: {}", e)))?;

        Ok(data)
    }

    pub async fn get_gateway_public_key(&self) -> Result<GatewayPublicKeyResponse, SdkError> {
        let url = format!("{}/v1/gateway/public_key", self.base_url);

        let response = self.send_with_retry(|| {
            Ok(self.client.get(&url))
        }).await?;

        let data: GatewayPublicKeyResponse = response
            .json()
            .await
            .map_err(|e| SdkError::NetworkError(format!("Response parsing failed: {}", e)))?;

        Ok(data)
    }

    pub async fn list_intents(
        &self,
        user_address: Option<&str>,
        status: Option<&str>,
        batch_id: Option<&str>,
        limit: Option<u32>,
        offset: Option<u32>,
    ) -> Result<IntentListResponse, SdkError> {
        let url = format!("{}/v1/intents", self.base_url);
        let mut request = self.client.get(&url);

        if let Some(user) = user_address {
            request = request.query(&[("user_address", user)]);
        }
        if let Some(status) = status {
            request = request.query(&[("status", status)]);
        }
        if let Some(batch) = batch_id {
            request = request.query(&[("batch_id", batch)]);
        }
        if let Some(limit) = limit {
            request = request.query(&[("limit", limit)]);
        }
        if let Some(offset) = offset {
            request = request.query(&[("offset", offset)]);
        }

        let response = self.send_with_retry(|| {
            request
                .try_clone()
                .ok_or_else(|| SdkError::NetworkError("Failed to clone request builder".to_string()))
        }).await?;

        let data: IntentListResponse = response
            .json()
            .await
            .map_err(|e| SdkError::NetworkError(format!("Response parsing failed: {}", e)))?;

        Ok(data)
    }

    pub async fn list_batches(
        &self,
        status: Option<&str>,
        limit: Option<u32>,
        offset: Option<u32>,
    ) -> Result<BatchListResponse, SdkError> {
        let url = format!("{}/v1/batches", self.base_url);
        let mut request = self.client.get(&url);

        if let Some(status) = status {
            request = request.query(&[("status", status)]);
        }
        if let Some(limit) = limit {
            request = request.query(&[("limit", limit)]);
        }
        if let Some(offset) = offset {
            request = request.query(&[("offset", offset)]);
        }

        let response = self.send_with_retry(|| {
            request
                .try_clone()
                .ok_or_else(|| SdkError::NetworkError("Failed to clone request builder".to_string()))
        }).await?;

        let data: BatchListResponse = response
            .json()
            .await
            .map_err(|e| SdkError::NetworkError(format!("Response parsing failed: {}", e)))?;

        Ok(data)
    }

    pub async fn list_batch_intents(
        &self,
        batch_id: &str,
        limit: Option<u32>,
        offset: Option<u32>,
    ) -> Result<BatchIntentListResponse, SdkError> {
        let url = format!("{}/v1/batches/{}/intents", self.base_url, batch_id);
        let mut request = self.client.get(&url);

        if let Some(limit) = limit {
            request = request.query(&[("limit", limit)]);
        }
        if let Some(offset) = offset {
            request = request.query(&[("offset", offset)]);
        }

        let response = self.send_with_retry(|| {
            request
                .try_clone()
                .ok_or_else(|| SdkError::NetworkError("Failed to clone request builder".to_string()))
        }).await?;

        let data: BatchIntentListResponse = response
            .json()
            .await
            .map_err(|e| SdkError::NetworkError(format!("Response parsing failed: {}", e)))?;

        Ok(data)
    }

    async fn send_with_retry(
        &self,
        build_request: impl Fn() -> Result<reqwest::RequestBuilder, SdkError>,
    ) -> Result<reqwest::Response, SdkError> {
        let mut attempt: u32 = 0;

        loop {
            let request = build_request()?;
            let response = request.send().await;

            match response {
                Ok(resp) => {
                    if resp.status().is_success() {
                        return Ok(resp);
                    }

                    if self.is_retryable_status(resp.status()) && attempt < self.max_retries {
                        let delay = self.compute_backoff(attempt);
                        attempt += 1;
                        tokio::time::sleep(delay).await;
                        continue;
                    }

                    let status = resp.status();
                    let error_text = resp.text().await.unwrap_or_default();
                    return Err(SdkError::GatewayError(format!("HTTP {}: {}", status, error_text)));
                }
                Err(e) => {
                    if attempt < self.max_retries {
                        let delay = self.compute_backoff(attempt);
                        attempt += 1;
                        tokio::time::sleep(delay).await;
                        continue;
                    }
                    return Err(SdkError::NetworkError(format!("Request failed: {}", e)));
                }
            }
        }
    }

    fn is_retryable_status(&self, status: reqwest::StatusCode) -> bool {
        status == reqwest::StatusCode::TOO_MANY_REQUESTS
            || status.is_server_error()
    }

    fn compute_backoff(&self, attempt: u32) -> Duration {
        let base = self.retry_base_delay_ms.saturating_mul(2u64.saturating_pow(attempt));
        let capped = std::cmp::min(base, self.retry_max_delay_ms);
        let jitter = if self.retry_jitter_ms > 0 {
            rand::thread_rng().gen_range(0..=self.retry_jitter_ms)
        } else {
            0
        };
        Duration::from_millis(capped.saturating_add(jitter))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_gateway_client_creation() {
        let client = GatewayClient::new(GatewayClientConfig {
            base_url: "http://localhost:3000".to_string(),
            api_key_header: "X-API-Key".to_string(),
            api_key: "test".to_string(),
            timeout_seconds: 10,
            max_retries: 3,
            retry_base_delay_ms: 100,
            retry_max_delay_ms: 1000,
            retry_jitter_ms: 50,
        }).unwrap();
        assert_eq!(client.base_url, "http://localhost:3000");
    }
}
