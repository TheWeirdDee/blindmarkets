use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::fs;
use crate::SdkError;

pub struct NonceTracker {
    nonces: Arc<Mutex<HashMap<String, u64>>>,
    persistence_path: Option<PathBuf>,
    auto_flush: bool,
}

impl NonceTracker {
    pub fn new() -> Self {
        Self {
            nonces: Arc::new(Mutex::new(HashMap::new())),
            persistence_path: None,
            auto_flush: false,
        }
    }

    pub fn with_persistence(path: PathBuf, auto_flush: bool) -> Result<Self, SdkError> {
        let nonces = load_nonce_map(&path)?;
        Ok(Self {
            nonces: Arc::new(Mutex::new(nonces)),
            persistence_path: Some(path),
            auto_flush,
        })
    }

    pub fn get_next_nonce(&self, user_address: &str) -> Result<u64, SdkError> {
        let mut nonces = self
            .nonces
            .lock()
            .map_err(|_| SdkError::StorageError("Nonce lock poisoned".to_string()))?;
        let current = nonces.entry(user_address.to_string()).or_insert(0);
        *current += 1;
        let next = *current;
        drop(nonces);

        if self.auto_flush {
            self.flush()?;
        }

        Ok(next)
    }

    pub fn get_current_nonce(&self, user_address: &str) -> Result<u64, SdkError> {
        let nonces = self
            .nonces
            .lock()
            .map_err(|_| SdkError::StorageError("Nonce lock poisoned".to_string()))?;
        Ok(*nonces.get(user_address).unwrap_or(&0))
    }

    pub fn set_nonce(&self, user_address: &str, nonce: u64) -> Result<(), SdkError> {
        let mut nonces = self
            .nonces
            .lock()
            .map_err(|_| SdkError::StorageError("Nonce lock poisoned".to_string()))?;
        nonces.insert(user_address.to_string(), nonce);
        drop(nonces);

        if self.auto_flush {
            self.flush()?;
        }

        Ok(())
    }

    pub fn flush(&self) -> Result<(), SdkError> {
        let path = match &self.persistence_path {
            Some(path) => path.clone(),
            None => return Ok(()),
        };

        let nonces = self
            .nonces
            .lock()
            .map_err(|_| SdkError::StorageError("Nonce lock poisoned".to_string()))?;
        let data = serde_json::to_vec(&*nonces)
            .map_err(|e| SdkError::StorageError(format!("Nonce serialization failed: {}", e)))?;
        fs::write(&path, data)
            .map_err(|e| SdkError::StorageError(format!("Nonce write failed: {}", e)))?;
        Ok(())
    }
}

impl Default for NonceTracker {
    fn default() -> Self {
        Self::new()
    }
}

fn load_nonce_map(path: &PathBuf) -> Result<HashMap<String, u64>, SdkError> {
    if !path.exists() {
        return Ok(HashMap::new());
    }

    let data = fs::read(path)
        .map_err(|e| SdkError::StorageError(format!("Nonce read failed: {}", e)))?;
    let nonces: HashMap<String, u64> = serde_json::from_slice(&data)
        .map_err(|e| SdkError::StorageError(format!("Nonce parse failed: {}", e)))?;
    Ok(nonces)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nonce_tracker() {
        let tracker = NonceTracker::new();
        let address = "0x123";

        assert_eq!(tracker.get_current_nonce(address).unwrap(), 0);
        
        let nonce1 = tracker.get_next_nonce(address).unwrap();
        assert_eq!(nonce1, 1);
        
        let nonce2 = tracker.get_next_nonce(address).unwrap();
        assert_eq!(nonce2, 2);
        
        assert_eq!(tracker.get_current_nonce(address).unwrap(), 2);
    }

    #[test]
    fn test_set_nonce() {
        let tracker = NonceTracker::new();
        let address = "0x123";

        tracker.set_nonce(address, 100).unwrap();
        assert_eq!(tracker.get_current_nonce(address).unwrap(), 100);
        
        let next = tracker.get_next_nonce(address).unwrap();
        assert_eq!(next, 101);
    }
}
