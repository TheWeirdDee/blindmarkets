use crate::{IntentCommitment, SdkError};
use starknet_crypto::{FieldElement, Signature, ecdsa_sign, ecdsa_verify, get_public_key};

pub struct StarknetSigner {
    private_key: String,
}

impl StarknetSigner {
    pub fn new(private_key: String) -> Self {
        Self { private_key }
    }

    pub fn sign_commitment(&self, commitment: &IntentCommitment) -> Result<Vec<String>, SdkError> {
        let message_hash = felt_from_hex(&commitment.intent_hash)?;
        let private_key = felt_from_hex(&self.private_key)?;

        let signature = ecdsa_sign(&private_key, &message_hash)
            .map_err(|e| SdkError::SignatureError(format!("Signing failed: {}", e)))?;

        Ok(vec![felt_to_hex(&signature.r), felt_to_hex(&signature.s)])
    }

    pub fn get_public_key(&self) -> Result<String, SdkError> {
        let private_key = felt_from_hex(&self.private_key)?;
        let public_key = get_public_key(&private_key);
        Ok(felt_to_hex(&public_key))
    }
}

pub fn verify_signature(
    commitment: &IntentCommitment,
    signature: &[String],
    public_key: &str,
) -> Result<bool, SdkError> {
    if signature.len() != 2 {
        return Err(SdkError::SignatureError(
            "Signature must have 2 components (r, s)".to_string()
        ));
    }

    let message_hash = felt_from_hex(&commitment.intent_hash)?;
    let public_key_felt = felt_from_hex(public_key)?;
    let r = felt_from_hex(&signature[0])?;
    let s = felt_from_hex(&signature[1])?;
    let sig = Signature { r, s };

    let is_valid = ecdsa_verify(&public_key_felt, &message_hash, &sig)
        .map_err(|e| SdkError::SignatureError(format!("Verification failed: {}", e)))?;

    Ok(is_valid)
}

fn felt_from_hex(value: &str) -> Result<FieldElement, SdkError> {
    let normalized = if value.starts_with("0x") {
        value.to_string()
    } else {
        format!("0x{}", value)
    };
    FieldElement::from_hex_be(&normalized)
        .map_err(|e| SdkError::SignatureError(format!("Invalid felt hex {}: {}", value, e)))
}

fn felt_to_hex(value: &FieldElement) -> String {
    format!("{value:#x}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{IntentBuilder, intent_builder::create_commitment};

    #[test]
    fn test_signing() {
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
        let signer = StarknetSigner::new("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string());
        
        let signature = signer.sign_commitment(&commitment).unwrap();
        
        assert_eq!(signature.len(), 2);
        assert!(signature[0].starts_with("0x"));
        assert!(signature[1].starts_with("0x"));
        
        // Verify signature components are 32 bytes
        let r_bytes = hex::decode(signature[0].trim_start_matches("0x")).unwrap();
        let s_bytes = hex::decode(signature[1].trim_start_matches("0x")).unwrap();
        assert_eq!(r_bytes.len(), 32);
        assert_eq!(s_bytes.len(), 32);
    }

    #[test]
    fn test_public_key_derivation() {
        let signer = StarknetSigner::new("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string());
        let public_key = signer.get_public_key().unwrap();
        
        assert!(public_key.starts_with("0x"));
    }

    #[test]
    fn test_signature_verification() {
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
        let signer = StarknetSigner::new("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string());
        
        let signature = signer.sign_commitment(&commitment).unwrap();
        let public_key = signer.get_public_key().unwrap();
        
        let is_valid = verify_signature(&commitment, &signature, &public_key).unwrap();
        assert!(is_valid);
    }
}
