use serde::Deserialize;
use std::env;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub redis: RedisConfig,
    pub rate_limit: RateLimitConfig,
    pub intents: IntentConfig,
    pub starknet: StarknetConfig,
    pub security: SecurityConfig,
    pub logging: LoggingConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub websocket_channel_capacity: usize,
    pub max_page_size: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RedisConfig {
    pub url: String,
    pub max_connections: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RateLimitConfig {
    pub max_intents_per_user_per_minute: u32,
    pub max_requests_per_ip_per_minute: u32,
    pub window_seconds: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct IntentConfig {
    pub batch_window_seconds: u64,
    pub genesis_timestamp: u64,
    pub execution_delay_seconds: u64,
    pub intent_deadline_seconds: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StarknetConfig {
    pub rpc_url: String,
    pub chain_id: String,
    pub account_address: String,
    pub account_private_key: String,
    pub intent_registry_address: String,
    pub batch_auction_address: String,
    pub batch_settlement_address: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SecurityConfig {
    pub cors_allowed_origins: String,
    pub api_key_header: String,
    pub api_key: String,
    pub gateway_private_key: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub format: String,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        dotenv::dotenv().ok();

        let server = ServerConfig {
            host: env::var("HOST")
                .map_err(|_| "HOST environment variable not set".to_string())?,
            port: env::var("PORT")
                .map_err(|_| "PORT environment variable not set".to_string())?
                .parse()
                .map_err(|e| format!("Invalid PORT: {}", e))?,
            websocket_channel_capacity: env::var("WEBSOCKET_CHANNEL_CAPACITY")
                .map_err(|_| "WEBSOCKET_CHANNEL_CAPACITY environment variable not set".to_string())?
                .parse()
                .map_err(|e| format!("Invalid WEBSOCKET_CHANNEL_CAPACITY: {}", e))?,
            max_page_size: env::var("MAX_PAGE_SIZE")
                .map_err(|_| "MAX_PAGE_SIZE environment variable not set".to_string())?
                .parse()
                .map_err(|e| format!("Invalid MAX_PAGE_SIZE: {}", e))?,
        };

        let database = DatabaseConfig {
            url: env::var("DATABASE_URL")
                .map_err(|_| "DATABASE_URL environment variable not set".to_string())?,
            max_connections: env::var("DATABASE_MAX_CONNECTIONS")
                .map_err(|_| "DATABASE_MAX_CONNECTIONS environment variable not set".to_string())?
                .parse()
                .map_err(|e| format!("Invalid DATABASE_MAX_CONNECTIONS: {}", e))?,
        };

        let redis = RedisConfig {
            url: env::var("REDIS_URL")
                .map_err(|_| "REDIS_URL environment variable not set".to_string())?,
            max_connections: env::var("REDIS_MAX_CONNECTIONS")
                .map_err(|_| "REDIS_MAX_CONNECTIONS environment variable not set".to_string())?
                .parse()
                .map_err(|e| format!("Invalid REDIS_MAX_CONNECTIONS: {}", e))?,
        };

        let rate_limit = RateLimitConfig {
            max_intents_per_user_per_minute: env::var("MAX_INTENTS_PER_USER_PER_MINUTE")
                .map_err(|_| "MAX_INTENTS_PER_USER_PER_MINUTE environment variable not set".to_string())?
                .parse()
                .map_err(|e| format!("Invalid MAX_INTENTS_PER_USER_PER_MINUTE: {}", e))?,
            max_requests_per_ip_per_minute: env::var("MAX_REQUESTS_PER_IP_PER_MINUTE")
                .map_err(|_| "MAX_REQUESTS_PER_IP_PER_MINUTE environment variable not set".to_string())?
                .parse()
                .map_err(|e| format!("Invalid MAX_REQUESTS_PER_IP_PER_MINUTE: {}", e))?,
            window_seconds: env::var("RATE_LIMIT_WINDOW_SECONDS")
                .map_err(|_| "RATE_LIMIT_WINDOW_SECONDS environment variable not set".to_string())?
                .parse()
                .map_err(|e| format!("Invalid RATE_LIMIT_WINDOW_SECONDS: {}", e))?,
        };

        let intents = IntentConfig {
            batch_window_seconds: env::var("BATCH_WINDOW_SECONDS")
                .map_err(|_| "BATCH_WINDOW_SECONDS environment variable not set".to_string())?
                .parse()
                .map_err(|e| format!("Invalid BATCH_WINDOW_SECONDS: {}", e))?,
            genesis_timestamp: env::var("GENESIS_TIMESTAMP")
                .map_err(|_| "GENESIS_TIMESTAMP environment variable not set".to_string())?
                .parse()
                .map_err(|e| format!("Invalid GENESIS_TIMESTAMP: {}", e))?,
            execution_delay_seconds: env::var("EXECUTION_DELAY_SECONDS")
                .map_err(|_| "EXECUTION_DELAY_SECONDS environment variable not set".to_string())?
                .parse()
                .map_err(|e| format!("Invalid EXECUTION_DELAY_SECONDS: {}", e))?,
            intent_deadline_seconds: env::var("INTENT_DEADLINE_SECONDS")
                .map_err(|_| "INTENT_DEADLINE_SECONDS environment variable not set".to_string())?
                .parse()
                .map_err(|e| format!("Invalid INTENT_DEADLINE_SECONDS: {}", e))?,
        };

        let starknet = StarknetConfig {
            rpc_url: env::var("STARKNET_RPC_URL")
                .map_err(|_| "STARKNET_RPC_URL environment variable not set".to_string())?,
            chain_id: env::var("STARKNET_CHAIN_ID")
                .map_err(|_| "STARKNET_CHAIN_ID environment variable not set".to_string())?,
            account_address: env::var("GATEWAY_ACCOUNT_ADDRESS")
                .map_err(|_| "GATEWAY_ACCOUNT_ADDRESS environment variable not set".to_string())?,
            account_private_key: env::var("GATEWAY_ACCOUNT_PRIVATE_KEY")
                .map_err(|_| "GATEWAY_ACCOUNT_PRIVATE_KEY environment variable not set".to_string())?,
            intent_registry_address: env::var("INTENT_REGISTRY_ADDRESS")
                .map_err(|_| "INTENT_REGISTRY_ADDRESS not set".to_string())?,
            batch_auction_address: env::var("BATCH_AUCTION_ADDRESS")
                .map_err(|_| "BATCH_AUCTION_ADDRESS not set".to_string())?,
            batch_settlement_address: env::var("BATCH_SETTLEMENT_ADDRESS")
                .map_err(|_| "BATCH_SETTLEMENT_ADDRESS not set".to_string())?,
        };

        let security = SecurityConfig {
            cors_allowed_origins: env::var("CORS_ALLOWED_ORIGINS")
                .map_err(|_| "CORS_ALLOWED_ORIGINS environment variable not set".to_string())?,
            api_key_header: env::var("API_KEY_HEADER")
                .map_err(|_| "API_KEY_HEADER environment variable not set".to_string())?,
            api_key: env::var("API_KEY")
                .map_err(|_| "API_KEY environment variable not set".to_string())?,
            gateway_private_key: env::var("GATEWAY_PRIVATE_KEY")
                .map_err(|_| "GATEWAY_PRIVATE_KEY environment variable not set".to_string())?,
        };

        let logging = LoggingConfig {
            level: env::var("LOG_LEVEL")
                .map_err(|_| "LOG_LEVEL environment variable not set".to_string())?,
            format: env::var("LOG_FORMAT")
                .map_err(|_| "LOG_FORMAT environment variable not set".to_string())?,
        };

        Ok(Config {
            server,
            database,
            redis,
            rate_limit,
            intents,
            starknet,
            security,
            logging,
        })
    }

    pub fn validate(&self) -> Result<(), String> {
        if !self.database.url.starts_with("postgresql://") &&
           !self.database.url.starts_with("postgres://") {
            return Err("DATABASE_URL must start with postgresql:// or postgres://".to_string());
        }

        if !self.redis.url.starts_with("redis://") {
            return Err("REDIS_URL must start with redis://".to_string());
        }

        if !self.starknet.intent_registry_address.starts_with("0x") {
            return Err("INTENT_REGISTRY_ADDRESS must start with 0x".to_string());
        }

        if self.starknet.chain_id.trim().is_empty() {
            return Err("STARKNET_CHAIN_ID must not be empty".to_string());
        }

        if !self.starknet.account_address.starts_with("0x") {
            return Err("GATEWAY_ACCOUNT_ADDRESS must start with 0x".to_string());
        }
        if self.starknet.account_address.len() < 4 {
            return Err("GATEWAY_ACCOUNT_ADDRESS must not be empty".to_string());
        }

        if !self.starknet.account_private_key.starts_with("0x") {
            return Err("GATEWAY_ACCOUNT_PRIVATE_KEY must start with 0x".to_string());
        }
        if self.starknet.account_private_key.len() != 66 {
            return Err("GATEWAY_ACCOUNT_PRIVATE_KEY must be 32-byte hex with 0x prefix".to_string());
        }

        if self.intents.batch_window_seconds == 0 {
            return Err("BATCH_WINDOW_SECONDS must be greater than 0".to_string());
        }

        if self.intents.genesis_timestamp == 0 {
            return Err("GENESIS_TIMESTAMP must be greater than 0".to_string());
        }

        if self.intents.execution_delay_seconds == 0 {
            return Err("EXECUTION_DELAY_SECONDS must be greater than 0".to_string());
        }

        if self.intents.intent_deadline_seconds == 0 {
            return Err("INTENT_DEADLINE_SECONDS must be greater than 0".to_string());
        }

        if self.security.api_key.trim().is_empty() {
            return Err("API_KEY must not be empty".to_string());
        }

        if self.security.api_key_header.trim().is_empty() {
            return Err("API_KEY_HEADER must not be empty".to_string());
        }

        if self.security.gateway_private_key.trim().is_empty() {
            return Err("GATEWAY_PRIVATE_KEY must not be empty".to_string());
        }
        if !self.security.gateway_private_key.starts_with("0x") ||
           self.security.gateway_private_key.len() != 66 {
            return Err("GATEWAY_PRIVATE_KEY must be 32-byte hex with 0x prefix".to_string());
        }

        if self.server.port == 0 {
            return Err("PORT must be greater than 0".to_string());
        }

        if self.server.websocket_channel_capacity == 0 {
            return Err("WEBSOCKET_CHANNEL_CAPACITY must be greater than 0".to_string());
        }

        if self.server.max_page_size == 0 {
            return Err("MAX_PAGE_SIZE must be greater than 0".to_string());
        }

        if self.rate_limit.window_seconds == 0 {
            return Err("RATE_LIMIT_WINDOW_SECONDS must be greater than 0".to_string());
        }

        Ok(())
    }
}
