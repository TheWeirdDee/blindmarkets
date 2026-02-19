use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    Extension,
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::{info, warn, error};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentNotification {
    pub intent_id: String,
    pub batch_id: String,
    pub encrypted_data: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchNotification {
    pub batch_id: String,
    pub close_time: i64,
    pub intent_count: i32,
    pub auction_deadline: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SolverMessage {
    #[serde(rename = "new_intent")]
    NewIntent(IntentNotification),
    #[serde(rename = "batch_closed")]
    BatchClosed(BatchNotification),
    #[serde(rename = "ping")]
    Ping { timestamp: i64 },
}

pub type SolverBroadcaster = broadcast::Sender<SolverMessage>;

pub fn create_broadcaster() -> SolverBroadcaster {
    let (tx, _rx) = broadcast::channel(1000);
    tx
}

pub async fn solver_websocket_handler(
    ws: WebSocketUpgrade,
    State(pool): State<PgPool>,
    Extension(broadcaster): Extension<Arc<SolverBroadcaster>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_solver_socket(socket, pool, broadcaster))
}

async fn handle_solver_socket(
    socket: WebSocket,
    pool: PgPool,
    broadcaster: Arc<SolverBroadcaster>,
) {
    let (mut sender, mut receiver) = socket.split();
    
    let mut rx = broadcaster.subscribe();
    
    info!("New solver WebSocket connection established");

    // Send initial connection confirmation
    let welcome = serde_json::json!({
        "type": "connected",
        "message": "Connected to Blind BTC Intent Markets",
        "timestamp": chrono::Utc::now().timestamp()
    });
    
    if let Ok(msg) = serde_json::to_string(&welcome) {
        let _ = sender.send(Message::Text(msg)).await;
    }

    // Spawn task to send broadcasts to this client
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            match serde_json::to_string(&msg) {
                Ok(json) => {
                    if sender.send(Message::Text(json)).await.is_err() {
                        break;
                    }
                }
                Err(e) => {
                    error!("Failed to serialize message: {}", e);
                }
            }
        }
    });

    // Spawn task to receive messages from client
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&text) {
                        handle_solver_message(parsed, &pool).await;
                    }
                }
                Message::Close(_) => {
                    info!("Solver WebSocket closed");
                    break;
                }
                Message::Ping(data) => {
                    // WebSocket ping/pong is handled automatically by axum
                    info!("Received ping: {:?}", data);
                }
                _ => {}
            }
        }
    });

    // Wait for either task to finish
    tokio::select! {
        _ = (&mut send_task) => {
            recv_task.abort();
        }
        _ = (&mut recv_task) => {
            send_task.abort();
        }
    }

    info!("Solver WebSocket connection closed");
}

async fn handle_solver_message(msg: serde_json::Value, pool: &PgPool) {
    let msg_type = msg.get("type").and_then(|v| v.as_str()).unwrap_or("");
    
    match msg_type {
        "subscribe_batch" => {
            if let Some(batch_id) = msg.get("batch_id").and_then(|v| v.as_str()) {
                info!("Solver subscribed to batch: {}", batch_id);
                // Could track subscriptions per batch if needed
            }
        }
        "heartbeat" => {
            // Solver is alive
        }
        _ => {
            warn!("Unknown message type: {}", msg_type);
        }
    }
}

// Helper function to broadcast new intent to all connected solvers
pub async fn broadcast_new_intent(
    broadcaster: &SolverBroadcaster,
    intent_id: String,
    batch_id: String,
    encrypted_data: String,
) {
    let notification = SolverMessage::NewIntent(IntentNotification {
        intent_id,
        batch_id,
        encrypted_data,
        timestamp: chrono::Utc::now().timestamp(),
    });

    if let Err(e) = broadcaster.send(notification) {
        error!("Failed to broadcast intent: {}", e);
    }
}

// Helper function to broadcast batch closure
pub async fn broadcast_batch_closed(
    broadcaster: &SolverBroadcaster,
    batch_id: String,
    close_time: i64,
    intent_count: i32,
    auction_deadline: i64,
) {
    let notification = SolverMessage::BatchClosed(BatchNotification {
        batch_id,
        close_time,
        intent_count,
        auction_deadline,
    });

    if let Err(e) = broadcaster.send(notification) {
        error!("Failed to broadcast batch closure: {}", e);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_serialization() {
        let msg = SolverMessage::NewIntent(IntentNotification {
            intent_id: "intent_123".to_string(),
            batch_id: "batch_456".to_string(),
            encrypted_data: "0xencrypted".to_string(),
            timestamp: 1234567890,
        });

        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("new_intent"));
        assert!(json.contains("intent_123"));
    }

    #[test]
    fn test_batch_notification() {
        let msg = SolverMessage::BatchClosed(BatchNotification {
            batch_id: "batch_789".to_string(),
            close_time: 1234567890,
            intent_count: 42,
            auction_deadline: 1234567920,
        });

        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("batch_closed"));
        assert!(json.contains("batch_789"));
    }
}
