use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SdkError {
    #[error("Invalid intent parameters: {0}")]
    InvalidIntent(String),
    
    #[error("Encryption error: {0}")]
    EncryptionError(String),
    
    #[error("Signature error: {0}")]
    SignatureError(String),
    
    #[error("Network error: {0}")]
    NetworkError(String),
    
    #[error("Gateway error: {0}")]
    GatewayError(String),

    #[error("Storage error: {0}")]
    StorageError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PrivacyMode {
    Public = 0,
    HiddenAmount = 1,
    HiddenDirectionAndAmount = 2,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Intent {
    pub intent_id: String,
    pub user_address: String,
    pub asset_in: String,
    pub asset_out: String,
    pub amount: u128,
    pub amount_commitment: String,
    pub min_output: u128,
    pub max_fee_bps: u16,
    pub deadline: u64,
    pub privacy_mode: PrivacyMode,
    pub nonce: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentCommitment {
    pub intent_id: String,
    pub user_address: String,
    pub intent_hash: String,
    pub amount_commitment: String,
    pub min_output_commitment: String,
    pub max_fee_bps: u16,
    pub deadline: u64,
    pub privacy_mode: u8,
    pub nonce: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmitIntentRequest {
    pub intent_id: String,
    pub user_address: String,
    pub ciphertext: String,
    pub encrypted_session_key: String,
    pub commitment: String,
    pub user_signature: Vec<String>,
    pub client_public_key: String,
    pub nonce: String,
    pub authorization_hash: Option<String>,
    pub submission_mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmitIntentResponse {
    pub intent_id: String,
    pub batch_id: String,
    pub estimated_execution_time: u64,
    pub awaiting_user_transaction: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnchainLifecycleRequest {
    pub action: String,
    pub user_address: String,
    pub tx_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentStatusResponse {
    pub intent_id: String,
    pub status: String,
    pub batch_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentListItem {
    pub intent_id: String,
    pub user_address: String,
    pub status: String,
    pub batch_id: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentListResponse {
    pub intents: Vec<IntentListItem>,
    pub limit: u32,
    pub offset: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingIntentsResponse {
    pub count: u32,
    pub batch_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchListItem {
    pub batch_id: String,
    pub close_time: i64,
    pub intent_count: i32,
    pub auction_deadline: i64,
    pub status: String,
    pub created_at: String,
    pub settled_at: Option<String>,
    pub failure_reason: Option<String>,
    pub failed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchListResponse {
    pub batches: Vec<BatchListItem>,
    pub limit: u32,
    pub offset: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchIntentListResponse {
    pub intent_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayPublicKeyResponse {
    pub gateway_public_key: String,
}

pub mod intent_builder;
pub mod encryption;
pub mod signing;
pub mod gateway_client;
pub mod nonce_tracker;

pub use intent_builder::IntentBuilder;
pub use gateway_client::{GatewayClient, GatewayClientConfig};
