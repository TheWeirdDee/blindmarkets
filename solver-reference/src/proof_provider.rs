use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct ProofProvider {
    base_url: String,
    api_key: Option<String>,
    client: reqwest::Client,
}

impl ProofProvider {
    pub fn new(base_url: String, api_key: Option<String>) -> Self {
        Self {
            base_url,
            api_key,
            client: reqwest::Client::new(),
        }
    }

    pub async fn fetch_proof(&self, intent_id: &str, output_amount: u128) -> Result<String> {
        let payload = ProofRequest {
            intent_id: intent_id.to_string(),
            output_amount: output_amount.to_string(),
        };

        let mut request = self.client.post(&self.base_url).json(&payload);
        if let Some(key) = &self.api_key {
            request = request.bearer_auth(key);
        }

        let response = request.send().await?;
        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(anyhow!("Proof service error: {}", body));
        }

        let body: ProofResponse = response.json().await?;
        if !body.proof.starts_with("0x") {
            return Err(anyhow!("Proof must be hex with 0x prefix"));
        }
        Ok(body.proof)
    }
}

#[derive(Debug, Serialize)]
struct ProofRequest {
    intent_id: String,
    output_amount: String,
}

#[derive(Debug, Deserialize)]
struct ProofResponse {
    proof: String,
}
