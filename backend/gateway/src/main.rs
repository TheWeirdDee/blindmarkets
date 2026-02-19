use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing_subscriber;
use sqlx::postgres::PgPoolOptions;
use axum::http::{HeaderValue, Method};

mod api;
mod auth;
mod ciphertext_pool;
mod rate_limiter;
mod pending_ledger;
mod config;
mod websocket;
mod starknet_client;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let config = config::Config::from_env()
        .map_err(|e| anyhow::anyhow!("Failed to load configuration: {}", e))?;

    config.validate()
        .map_err(|e| anyhow::anyhow!("Invalid configuration: {}", e))?;

    tracing::info!("Configuration loaded successfully");

    let db_pool = PgPoolOptions::new()
        .max_connections(config.database.max_connections)
        .connect(&config.database.url)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to connect to database: {}", e))?;

    tracing::info!("Database connection established");

    sqlx::migrate!("./migrations")
        .run(&db_pool)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to run migrations: {}", e))?;

    tracing::info!("Database migrations completed");

    // Create WebSocket broadcaster for solver notifications
    let broadcaster = Arc::new(websocket::create_broadcaster());
    let rate_limiter = Arc::new(rate_limiter::RateLimiter::new(
        config.rate_limit.max_intents_per_user_per_minute,
        config.rate_limit.max_requests_per_ip_per_minute,
    ));
    let config = Arc::new(config);

    let cors = build_cors_layer(&config)?;

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/v1/intents", post(api::submit_intent))
        .route("/v1/intents/pending", get(api::get_pending_intents))
        .route("/v1/intents/:intent_id", get(api::get_intent_status))
        .route("/v1/intents/:intent_id/cancel", post(api::cancel_intent))
        .route("/v1/solver/ws", get(websocket::solver_websocket_handler))
        .with_state(db_pool.clone())
        .layer(axum::Extension(broadcaster))
        .layer(axum::Extension(rate_limiter))
        .layer(axum::Extension(config.clone()))
        .layer(cors);

    let addr = SocketAddr::from((
        config.server.host.parse::<std::net::IpAddr>()?,
        config.server.port
    ));

    tracing::info!("Gateway listening on {}", addr);
    tracing::info!("WebSocket endpoint available at ws://{}/v1/solver/ws", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service_with_connect_info::<SocketAddr>())
        .await?;

    Ok(())
}

async fn health_check() -> &'static str {
    "OK"
}

fn build_cors_layer(config: &config::Config) -> Result<CorsLayer, anyhow::Error> {
    let origins = config.security.cors_allowed_origins
        .split(',')
        .map(|origin| origin.trim())
        .filter(|origin| !origin.is_empty())
        .map(|origin| origin.parse::<HeaderValue>())
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| anyhow::anyhow!("Invalid CORS_ALLOWED_ORIGINS entry: {}", e))?;

    if origins.is_empty() {
        return Err(anyhow::anyhow!("CORS_ALLOWED_ORIGINS must contain at least one origin"));
    }

    Ok(CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
        ]))
}
