use crate::{Intent, IntentCommitment, PrivacyMode, SdkError};
use rand::RngCore;
use sha3::{Digest, Keccak256};
use starknet_crypto::{FieldElement, pedersen_hash};

pub struct IntentBuilder {
    user_address: Option<String>,
    asset_in: Option<String>,
    asset_out: Option<String>,
    amount: Option<u128>,
    min_output: Option<u128>,
    max_fee_bps: Option<u16>,
    deadline: Option<u64>,
    nonce: Option<String>,
    privacy_mode: PrivacyMode,
}

impl IntentBuilder {
    pub fn new() -> Self {
        Self {
            user_address: None,
            asset_in: None,
            asset_out: None,
            amount: None,
            min_output: None,
            max_fee_bps: None,
            deadline: None,
            nonce: None,
            privacy_mode: PrivacyMode::Public,
        }
    }

    pub fn user_address(mut self, address: String) -> Self {
        self.user_address = Some(address);
        self
    }

    pub fn asset_in(mut self, asset: String) -> Self {
        self.asset_in = Some(asset);
        self
    }

    pub fn asset_out(mut self, asset: String) -> Self {
        self.asset_out = Some(asset);
        self
    }

    pub fn amount(mut self, amount: u128) -> Self {
        self.amount = Some(amount);
        self
    }

    pub fn min_output(mut self, min_output: u128) -> Self {
        self.min_output = Some(min_output);
        self
    }

    pub fn max_fee_bps(mut self, max_fee_bps: u16) -> Self {
        self.max_fee_bps = Some(max_fee_bps);
        self
    }

    pub fn deadline_seconds(mut self, seconds_from_now: u64) -> Self {
        let now = current_unix_seconds();
        self.deadline = Some(now + seconds_from_now);
        self
    }

    pub fn deadline_timestamp(mut self, timestamp: u64) -> Self {
        self.deadline = Some(timestamp);
        self
    }

    pub fn nonce(mut self, nonce: String) -> Self {
        self.nonce = Some(nonce);
        self
    }

    pub fn privacy_mode(mut self, mode: PrivacyMode) -> Self {
        self.privacy_mode = mode;
        self
    }

    pub fn build(self) -> Result<Intent, SdkError> {
        let user_address = self.user_address
            .ok_or_else(|| SdkError::InvalidIntent("user_address required".to_string()))?;
        
        let asset_in = self.asset_in
            .ok_or_else(|| SdkError::InvalidIntent("asset_in required".to_string()))?;
        
        let asset_out = self.asset_out
            .ok_or_else(|| SdkError::InvalidIntent("asset_out required".to_string()))?;
        
        let amount = self.amount
            .ok_or_else(|| SdkError::InvalidIntent("amount required".to_string()))?;
        
        let min_output = self.min_output
            .ok_or_else(|| SdkError::InvalidIntent("min_output required".to_string()))?;

        let max_fee_bps = self.max_fee_bps
            .ok_or_else(|| SdkError::InvalidIntent("max_fee_bps required".to_string()))?;
        
        let deadline = self.deadline
            .ok_or_else(|| SdkError::InvalidIntent("deadline required".to_string()))?;

        // Validation
        if amount == 0 {
            return Err(SdkError::InvalidIntent("amount must be > 0".to_string()));
        }

        if min_output == 0 {
            return Err(SdkError::InvalidIntent("min_output must be > 0".to_string()));
        }

        if max_fee_bps > 10_000 {
            return Err(SdkError::InvalidIntent("max_fee_bps must be <= 10000".to_string()));
        }

        let now = current_unix_seconds();

        if deadline <= now {
            return Err(SdkError::InvalidIntent("deadline must be in the future".to_string()));
        }

        if asset_in == asset_out {
            return Err(SdkError::InvalidIntent("asset_in and asset_out must be different".to_string()));
        }

        let nonce = self.nonce.unwrap_or_else(generate_nonce);
        let nonce_felt = felt_from_hex(&nonce)?;
        let amount_commitment = compute_amount_commitment(amount, &nonce_felt);
        let intent_hash = compute_intent_hash(
            &user_address,
            &asset_in,
            &asset_out,
            amount_commitment,
            min_output,
            max_fee_bps,
            deadline,
            self.privacy_mode.clone(),
            &nonce_felt
        )?;
        let intent_id = compute_intent_id(&user_address, &nonce_felt, &intent_hash)?;
        let amount_commitment_hex = felt_to_hex(&amount_commitment);

        Ok(Intent {
            intent_id,
            user_address,
            asset_in,
            asset_out,
            amount,
            amount_commitment: amount_commitment_hex,
            min_output,
            max_fee_bps,
            deadline,
            privacy_mode: self.privacy_mode,
            nonce,
        })
    }
}

impl Default for IntentBuilder {
    fn default() -> Self {
        Self::new()
    }
}

pub fn create_commitment(intent: &Intent) -> Result<IntentCommitment, SdkError> {
    let nonce_felt = felt_from_hex(&intent.nonce)?;
    let amount_commitment = felt_from_hex(&intent.amount_commitment)?;
    let min_output_commitment = compute_amount_commitment(intent.min_output, &nonce_felt);
    let intent_hash = compute_intent_hash(
        &intent.user_address,
        &intent.asset_in,
        &intent.asset_out,
        amount_commitment,
        intent.min_output,
        intent.max_fee_bps,
        intent.deadline,
        intent.privacy_mode.clone(),
        &nonce_felt
    )?;

    Ok(IntentCommitment {
        intent_id: intent.intent_id.clone(),
        user_address: intent.user_address.clone(),
        intent_hash: felt_to_hex(&intent_hash),
        amount_commitment: felt_to_hex(&amount_commitment),
        min_output_commitment: felt_to_hex(&min_output_commitment),
        max_fee_bps: intent.max_fee_bps,
        deadline: intent.deadline,
        privacy_mode: intent.privacy_mode.clone() as u8,
        nonce: intent.nonce.clone(),
    })
}

fn generate_nonce() -> String {
    let mut entropy = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut entropy);
    let now = current_unix_nanos();
    let mut hasher = Keccak256::new();
    hasher.update(&entropy);
    hasher.update(now);
    let hash = hasher.finalize();
    format!("0x{}", hex::encode(hash))
}

fn current_unix_seconds() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_else(|_| std::time::Duration::from_secs(0))
        .as_secs()
}

fn current_unix_nanos() -> [u8; 16] {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_else(|_| std::time::Duration::from_secs(0))
        .as_nanos()
        .to_le_bytes()
}

fn compute_amount_commitment(amount: u128, nonce: &FieldElement) -> FieldElement {
    let amount_felt = FieldElement::from(amount);
    pedersen_hash(&amount_felt, nonce)
}

fn compute_intent_hash(
    user_address: &str,
    asset_in: &str,
    asset_out: &str,
    amount_commitment: FieldElement,
    min_output: u128,
    max_fee_bps: u16,
    deadline: u64,
    privacy_mode: PrivacyMode,
    nonce: &FieldElement
) -> Result<FieldElement, SdkError> {
    let user = felt_from_hex(user_address)?;
    let asset_in_felt = felt_from_hex(asset_in)?;
    let asset_out_felt = felt_from_hex(asset_out)?;
    let deadline_felt = FieldElement::from(deadline);
    let privacy_felt = FieldElement::from(privacy_mode as u8);

    let mut hash = pedersen_hash(&user, &asset_in_felt);
    hash = pedersen_hash(&hash, &asset_out_felt);
    hash = pedersen_hash(&hash, &amount_commitment);

    let min_output_low = FieldElement::from(min_output);
    let min_output_high = FieldElement::ZERO;
    let min_output_hash = pedersen_hash(&min_output_low, &min_output_high);
    hash = pedersen_hash(&hash, &min_output_hash);
    hash = pedersen_hash(&hash, &FieldElement::from(max_fee_bps));
    hash = pedersen_hash(&hash, &deadline_felt);
    hash = pedersen_hash(&hash, &privacy_felt);
    hash = pedersen_hash(&hash, nonce);
    Ok(hash)
}

fn compute_intent_id(
    user_address: &str,
    nonce: &FieldElement,
    intent_hash: &FieldElement,
) -> Result<String, SdkError> {
    let user = felt_from_hex(user_address)?;
    let inner = pedersen_hash(&user, nonce);
    Ok(felt_to_hex(&pedersen_hash(&inner, intent_hash)))
}

fn felt_from_hex(value: &str) -> Result<FieldElement, SdkError> {
    let normalized = if value.starts_with("0x") {
        value.to_string()
    } else {
        format!("0x{}", value)
    };
    FieldElement::from_hex_be(&normalized)
        .map_err(|e| SdkError::InvalidIntent(format!("Invalid felt hex {}: {}", value, e)))
}

fn felt_to_hex(value: &FieldElement) -> String {
    format!("{value:#x}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_intent_builder_valid() {
        let intent = IntentBuilder::new()
            .user_address("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd".to_string())
            .asset_in("0xaaaabbbbccccddddeeeeffff0000111122223333444455556666777788889999".to_string())
            .asset_out("0xbbbbccccddddeeeeffff0000111122223333444455556666777788889999aaaa".to_string())
            .amount(1_000_000)
            .min_output(95_000_000)
            .max_fee_bps(50)
            .deadline_seconds(3600)
            .privacy_mode(PrivacyMode::HiddenAmount)
            .build()
            .unwrap();

        assert_eq!(intent.user_address, "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd");
        assert_eq!(intent.amount, 1_000_000);
    }

    #[test]
    fn test_intent_builder_missing_field() {
        let result = IntentBuilder::new()
            .user_address("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd".to_string())
            .amount(1_000_000)
            .build();

        assert!(result.is_err());
    }

    #[test]
    fn test_intent_builder_zero_amount() {
        let result = IntentBuilder::new()
            .user_address("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd".to_string())
            .asset_in("0xaaaabbbbccccddddeeeeffff0000111122223333444455556666777788889999".to_string())
            .asset_out("0xbbbbccccddddeeeeffff0000111122223333444455556666777788889999aaaa".to_string())
            .amount(0)
            .min_output(95_000_000)
            .max_fee_bps(50)
            .deadline_seconds(3600)
            .build();

        assert!(result.is_err());
    }

    #[test]
    fn test_commitment_creation() {
        let intent = IntentBuilder::new()
            .user_address("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd".to_string())
            .asset_in("0xaaaabbbbccccddddeeeeffff0000111122223333444455556666777788889999".to_string())
            .asset_out("0xbbbbccccddddeeeeffff0000111122223333444455556666777788889999aaaa".to_string())
            .amount(1_000_000)
            .min_output(95_000_000)
            .max_fee_bps(50)
            .deadline_seconds(3600)
            .build()
            .unwrap();

        let commitment = create_commitment(&intent).unwrap();
        
        assert!(commitment.intent_hash.starts_with("0x"));
        assert!(commitment.amount_commitment.starts_with("0x"));
    }
}
