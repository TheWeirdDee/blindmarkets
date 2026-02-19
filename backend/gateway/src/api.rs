use axum::{
    extract::{ConnectInfo, Path, Json},
    http::HeaderMap,
    http::StatusCode,
    response::IntoResponse,
    Extension,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;

use crate::config::Config;
use crate::rate_limiter::RateLimiter;

#[derive(Debug, Deserialize)]
pub struct SubmitIntentRequest {
    pub intent_id: String,
    pub user_address: String,
    pub ciphertext: String,
    pub commitment: String,
    pub user_signature: Vec<String>,
    pub client_public_key: String,
}

#[derive(Debug, Serialize)]
pub struct SubmitIntentResponse {
    pub intent_id: String,
    pub batch_id: String,
    pub estimated_execution_time: u64,
}

#[derive(Debug, Serialize)]
pub struct IntentStatusResponse {
    pub intent_id: String,
    pub status: String,
    pub batch_id: Option<String>,
}

pub async fn submit_intent(
    axum::extract::State(pool): axum::extract::State<sqlx::PgPool>,
    Extension(config): Extension<Arc<Config>>,
    Extension(rate_limiter): Extension<Arc<RateLimiter>>,
    ConnectInfo(client_addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(payload): Json<SubmitIntentRequest>,
) -> Result<Json<SubmitIntentResponse>, StatusCode> {
    require_api_key(&headers, &config)?;

    let client_ip = client_addr.ip().to_string();
    rate_limiter.check_ip_limit(&client_ip).map_err(|e| {
        tracing::warn!("IP rate limit exceeded: {}", e);
        StatusCode::TOO_MANY_REQUESTS
    })?;

    rate_limiter.check_user_limit(&payload.user_address).map_err(|e| {
        tracing::warn!("User rate limit exceeded: {}", e);
        StatusCode::TOO_MANY_REQUESTS
    })?;

    tracing::info!("Received intent submission: {}", payload.intent_id);

    let message_hash = &payload.commitment;
    let user_address_from_sig = extract_user_address_from_intent(&payload)?;

    let is_valid = crate::auth::verify_signature(
        &user_address_from_sig,
        message_hash,
        &payload.user_signature
    ).map_err(|e| {
        tracing::error!("Signature verification failed: {}", e);
        StatusCode::UNAUTHORIZED
    })?;

    if !is_valid {
        tracing::warn!("Invalid signature for intent {}", payload.intent_id);
        return Err(StatusCode::UNAUTHORIZED);
    }

    let batch_id = compute_next_batch_id(config.intents.batch_window_seconds);
    let estimated_execution_time = compute_execution_time(
        config.intents.batch_window_seconds,
        config.intents.execution_delay_seconds
    );

    // Save to database
    let deadline = estimated_execution_time + config.intents.intent_deadline_seconds;
    
    sqlx::query!(
        r#"
        INSERT INTO intents (intent_id, user_address, ciphertext, commitment, client_public_key, batch_id, deadline)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (intent_id) DO NOTHING
        "#,
        payload.intent_id,
        payload.user_address,
        payload.ciphertext,
        payload.commitment,
        payload.client_public_key,
        batch_id,
        deadline as i64
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    tracing::info!("Intent {} saved to database", payload.intent_id);

    Ok(Json(SubmitIntentResponse {
        intent_id: payload.intent_id,
        batch_id,
        estimated_execution_time,
    }))
}

pub async fn get_intent_status(
    Path(intent_id): Path<String>,
    axum::extract::State(pool): axum::extract::State<sqlx::PgPool>,
    Extension(config): Extension<Arc<Config>>,
    Extension(rate_limiter): Extension<Arc<RateLimiter>>,
    ConnectInfo(client_addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
) -> Result<Json<IntentStatusResponse>, StatusCode> {
    require_api_key(&headers, &config)?;

    let client_ip = client_addr.ip().to_string();
    rate_limiter.check_ip_limit(&client_ip).map_err(|e| {
        tracing::warn!("IP rate limit exceeded: {}", e);
        StatusCode::TOO_MANY_REQUESTS
    })?;

    tracing::info!("Querying status for intent: {}", intent_id);
    
    let result = sqlx::query!(
        r#"
        SELECT status, batch_id
        FROM intents
        WHERE intent_id = $1
        "#,
        intent_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    match result {
        Some(row) => {
            Ok(Json(IntentStatusResponse {
                intent_id,
                status: row.status,
                batch_id: Some(row.batch_id),
            }))
        }
        None => {
            tracing::warn!("Intent {} not found", intent_id);
            Err(StatusCode::NOT_FOUND)
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CancelIntentRequest {
    pub user_address: String,
    pub signature: Vec<String>,
}

pub async fn cancel_intent(
    Path(intent_id): Path<String>,
    axum::extract::State(pool): axum::extract::State<sqlx::PgPool>,
    Extension(config): Extension<Arc<Config>>,
    Extension(rate_limiter): Extension<Arc<RateLimiter>>,
    ConnectInfo(client_addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(payload): Json<CancelIntentRequest>,
) -> Result<StatusCode, StatusCode> {
    require_api_key(&headers, &config)?;

    let client_ip = client_addr.ip().to_string();
    rate_limiter.check_ip_limit(&client_ip).map_err(|e| {
        tracing::warn!("IP rate limit exceeded: {}", e);
        StatusCode::TOO_MANY_REQUESTS
    })?;

    tracing::info!("Canceling intent: {} for user: {}", intent_id, payload.user_address);
    
    // Query intent from database
    let intent = sqlx::query!(
        r#"
        SELECT user_address, status
        FROM intents
        WHERE intent_id = $1
        "#,
        intent_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let intent = match intent {
        Some(i) => i,
        None => {
            tracing::warn!("Intent {} not found", intent_id);
            return Err(StatusCode::NOT_FOUND);
        }
    };

    // Verify user owns this intent
    if intent.user_address != payload.user_address {
        tracing::warn!("User {} does not own intent {}", payload.user_address, intent_id);
        return Err(StatusCode::FORBIDDEN);
    }

    // Check intent is still cancellable
    if intent.status != "PENDING" {
        tracing::warn!("Intent {} cannot be cancelled (status: {})", intent_id, intent.status);
        return Err(StatusCode::BAD_REQUEST);
    }

    // Verify signature
    let message = format!("cancel:{}", intent_id);
    let is_valid = crate::auth::verify_signature(
        &payload.user_address,
        &message,
        &payload.signature
    ).map_err(|e| {
        tracing::error!("Signature verification failed: {}", e);
        StatusCode::UNAUTHORIZED
    })?;

    if !is_valid {
        tracing::warn!("Invalid signature for cancel request");
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Update status in database
    sqlx::query!(
        r#"
        UPDATE intents
        SET status = 'CANCELLED'
        WHERE intent_id = $1
        "#,
        intent_id
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    tracing::info!("Intent {} cancelled successfully", intent_id);
    Ok(StatusCode::OK)
}

fn compute_next_batch_id(batch_window_seconds: u64) -> String {
    let current_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let batch_number = current_time / batch_window_seconds;
    
    format!("batch_{}", batch_number)
}

fn compute_execution_time(batch_window_seconds: u64, execution_delay_seconds: u64) -> u64 {
    let current_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let next_batch_time = ((current_time / batch_window_seconds) + 1) * batch_window_seconds;

    next_batch_time + execution_delay_seconds
}

#[derive(Debug, Serialize)]
pub struct PendingIntentsResponse {
    pub count: u32,
    pub batch_id: String,
}

pub async fn get_pending_intents(
    axum::extract::State(pool): axum::extract::State<sqlx::PgPool>,
    Extension(config): Extension<Arc<Config>>,
    Extension(rate_limiter): Extension<Arc<RateLimiter>>,
    ConnectInfo(client_addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
) -> Result<Json<PendingIntentsResponse>, StatusCode> {
    require_api_key(&headers, &config)?;

    let client_ip = client_addr.ip().to_string();
    rate_limiter.check_ip_limit(&client_ip).map_err(|e| {
        tracing::warn!("IP rate limit exceeded: {}", e);
        StatusCode::TOO_MANY_REQUESTS
    })?;

    // Query database for pending intents
    let result = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM intents
        WHERE status = 'PENDING'
        "#
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    let count = result.count.unwrap_or(0) as u32;
    let batch_id = compute_next_batch_id(config.intents.batch_window_seconds);
    
    Ok(Json(PendingIntentsResponse {
        count,
        batch_id,
    }))
}

fn extract_user_address_from_intent(payload: &SubmitIntentRequest) -> Result<String, StatusCode> {
    if payload.user_address.is_empty() {
        tracing::error!("Missing user_address in request");
        return Err(StatusCode::BAD_REQUEST);
    }

    if !payload.user_address.starts_with("0x") {
        tracing::error!("Invalid user_address format: must start with 0x");
        return Err(StatusCode::BAD_REQUEST);
    }

    Ok(payload.user_address.clone())
}

fn require_api_key(headers: &HeaderMap, config: &Config) -> Result<(), StatusCode> {
    let header_name = config.security.api_key_header.as_str();
    let provided = headers.get(header_name)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");

    if provided.is_empty() {
        tracing::warn!("Missing API key header: {}", header_name);
        return Err(StatusCode::UNAUTHORIZED);
    }

    if provided != config.security.api_key {
        tracing::warn!("Invalid API key");
        return Err(StatusCode::UNAUTHORIZED);
    }

    Ok(())
}
