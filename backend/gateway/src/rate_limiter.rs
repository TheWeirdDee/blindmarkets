use redis::AsyncCommands;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct RateLimiter {
    redis: Arc<Mutex<redis::aio::ConnectionManager>>,
    max_intents_per_user_per_minute: u32,
    max_requests_per_ip_per_minute: u32,
    window_seconds: u64,
}

impl RateLimiter {
    pub fn new(
        redis: redis::aio::ConnectionManager,
        max_intents_per_user_per_minute: u32,
        max_requests_per_ip_per_minute: u32,
        window_seconds: u64,
    ) -> Self {
        Self {
            redis: Arc::new(Mutex::new(redis)),
            max_intents_per_user_per_minute,
            max_requests_per_ip_per_minute,
            window_seconds,
        }
    }

    pub async fn check_user_limit(&self, user_address: &str) -> Result<(), String> {
        let key = format!("rate:user:{}", user_address);
        self.check_rate_limit(&key, self.max_intents_per_user_per_minute).await
    }

    pub async fn check_ip_limit(&self, ip_address: &str) -> Result<(), String> {
        let key = format!("rate:ip:{}", ip_address);
        self.check_rate_limit(&key, self.max_requests_per_ip_per_minute).await
    }

    async fn check_rate_limit(&self, key: &str, max_per_minute: u32) -> Result<(), String> {
        let mut conn = self.redis.lock().await;
        let current: u32 = conn.incr(key, 1).await.map_err(|e| e.to_string())?;
        if current == 1 {
            let _: () = conn
                .expire(key, self.window_seconds as i64)
                .await
                .map_err(|e| e.to_string())?;
        }

        if current > max_per_minute {
            return Err(format!(
                "Rate limit exceeded: {} per {} seconds",
                max_per_minute,
                self.window_seconds
            ));
        }

        Ok(())
    }
}
