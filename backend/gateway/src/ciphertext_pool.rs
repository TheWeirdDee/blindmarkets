use std::collections::HashMap;
use std::sync::{Arc, RwLock};

pub struct CiphertextPool {
    pool: Arc<RwLock<HashMap<String, Vec<EncryptedIntent>>>>,
}

pub struct EncryptedIntent {
    pub intent_id: String,
    pub ciphertext: Vec<u8>,
    pub commitment: String,
    pub user_address: String,
    pub timestamp: u64,
}

impl CiphertextPool {
    pub fn new() -> Self {
        Self {
            pool: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn add_intent(&self, batch_id: String, intent: EncryptedIntent) -> Result<(), String> {
        let mut pool = self.pool.write().map_err(|e| e.to_string())?;
        
        pool.entry(batch_id)
            .or_insert_with(Vec::new)
            .push(intent);
        
        Ok(())
    }

    pub fn get_batch_intents(&self, batch_id: &str) -> Result<Vec<EncryptedIntent>, String> {
        let pool = self.pool.read().map_err(|e| e.to_string())?;
        
        Ok(pool.get(batch_id)
            .cloned()
            .unwrap_or_default())
    }

    pub fn remove_batch(&self, batch_id: &str) -> Result<(), String> {
        let mut pool = self.pool.write().map_err(|e| e.to_string())?;
        pool.remove(batch_id);
        Ok(())
    }

    pub fn prune_expired(&self, current_time: u64, max_age: u64) -> Result<usize, String> {
        let mut pool = self.pool.write().map_err(|e| e.to_string())?;
        let mut removed_count = 0;

        pool.retain(|_batch_id, intents| {
            let original_len = intents.len();
            intents.retain(|intent| {
                current_time - intent.timestamp < max_age
            });
            removed_count += original_len - intents.len();
            !intents.is_empty()
        });

        Ok(removed_count)
    }
}

impl Clone for EncryptedIntent {
    fn clone(&self) -> Self {
        Self {
            intent_id: self.intent_id.clone(),
            ciphertext: self.ciphertext.clone(),
            commitment: self.commitment.clone(),
            user_address: self.user_address.clone(),
            timestamp: self.timestamp,
        }
    }
}
