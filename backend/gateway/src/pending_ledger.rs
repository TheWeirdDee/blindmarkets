use std::collections::HashMap;
use std::sync::{Arc, RwLock};

pub struct PendingLedger {
    balances: Arc<RwLock<HashMap<(String, String), u128>>>,
}

impl PendingLedger {
    pub fn new() -> Self {
        Self {
            balances: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn add_pending_intent(
        &self,
        user_address: &str,
        asset: &str,
        amount: u128,
    ) -> Result<(), String> {
        let mut balances = self.balances.write().map_err(|e| e.to_string())?;
        
        let key = (user_address.to_string(), asset.to_string());
        let current = balances.get(&key).copied().unwrap_or(0);
        
        balances.insert(key, current + amount);
        
        Ok(())
    }

    pub fn remove_pending_intent(
        &self,
        user_address: &str,
        asset: &str,
        amount: u128,
    ) -> Result<(), String> {
        let mut balances = self.balances.write().map_err(|e| e.to_string())?;
        
        let key = (user_address.to_string(), asset.to_string());
        let current = balances.get(&key).copied().unwrap_or(0);
        
        if current >= amount {
            balances.insert(key, current - amount);
        } else {
            balances.remove(&key);
        }
        
        Ok(())
    }

    pub fn get_pending_balance(&self, user_address: &str, asset: &str) -> Result<u128, String> {
        let balances = self.balances.read().map_err(|e| e.to_string())?;
        
        let key = (user_address.to_string(), asset.to_string());
        Ok(balances.get(&key).copied().unwrap_or(0))
    }

    pub fn check_available_balance(
        &self,
        user_address: &str,
        asset: &str,
        on_chain_balance: u128,
        new_intent_amount: u128,
    ) -> Result<bool, String> {
        let pending = self.get_pending_balance(user_address, asset)?;
        
        Ok(pending + new_intent_amount <= on_chain_balance)
    }
}
