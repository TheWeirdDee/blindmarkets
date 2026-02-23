use crate::{Intent, SdkError};
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng as AesOsRng},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use rand_core::OsRng;
use x25519_dalek::{PublicKey, StaticSecret};

const NONCE_SIZE: usize = 12;

pub struct EncryptionKey {
    cipher: Aes256Gcm,
    key_bytes: [u8; 32],
}

impl EncryptionKey {
    pub fn generate() -> Self {
        let key = Aes256Gcm::generate_key(&mut AesOsRng);
        let cipher = Aes256Gcm::new(&key);
        let mut key_bytes = [0u8; 32];
        key_bytes.copy_from_slice(&key);
        Self { cipher, key_bytes }
    }

    pub fn from_bytes(key_bytes: &[u8]) -> Result<Self, SdkError> {
        if key_bytes.len() != 32 {
            return Err(SdkError::EncryptionError(
                "Key must be 32 bytes".to_string()
            ));
        }

        let key = aes_gcm::Key::<Aes256Gcm>::from_slice(key_bytes);
        let cipher = Aes256Gcm::new(key);
        let mut key_buf = [0u8; 32];
        key_buf.copy_from_slice(key_bytes);
        Ok(Self { cipher, key_bytes: key_buf })
    }

    pub fn export_key_bytes(&self) -> [u8; 32] {
        self.key_bytes
    }

    pub fn encrypt_intent(&self, intent: &Intent) -> Result<Vec<u8>, SdkError> {
        let intent_json = serde_json::to_string(intent)
            .map_err(|e| SdkError::EncryptionError(format!("Serialization failed: {}", e)))?;

        let mut nonce_bytes = [0u8; NONCE_SIZE];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = self.cipher
            .encrypt(nonce, intent_json.as_bytes())
            .map_err(|e| SdkError::EncryptionError(format!("Encryption failed: {}", e)))?;

        let mut result = nonce_bytes.to_vec();
        result.extend_from_slice(&ciphertext);

        Ok(result)
    }

    pub fn decrypt_intent(&self, encrypted_data: &[u8]) -> Result<Intent, SdkError> {
        if encrypted_data.len() < NONCE_SIZE {
            return Err(SdkError::EncryptionError(
                "Invalid encrypted data".to_string()
            ));
        }

        let nonce = Nonce::from_slice(&encrypted_data[..NONCE_SIZE]);
        let ciphertext = &encrypted_data[NONCE_SIZE..];

        let plaintext = self.cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| SdkError::EncryptionError(format!("Decryption failed: {}", e)))?;

        let intent: Intent = serde_json::from_slice(&plaintext)
            .map_err(|e| SdkError::EncryptionError(format!("Deserialization failed: {}", e)))?;

        Ok(intent)
    }
}

pub fn encrypt_intent_for_gateway(
    intent: &Intent,
    gateway_public_key: &[u8],
) -> Result<EncryptedIntentPayload, SdkError> {
    let keypair = ECDHKeyPair::generate();
    let shared_secret = keypair.compute_shared_secret(gateway_public_key)?;
    let encryption_key = EncryptionKey::generate();
    let encrypted = encryption_key.encrypt_intent(intent)?;
    let encrypted_session_key = keypair.encrypt_for(
        gateway_public_key,
        &encryption_key.export_key_bytes()
    )?;

    Ok(EncryptedIntentPayload {
        ciphertext_hex: format!("0x{}", hex::encode(encrypted)),
        client_public_key_hex: format!("0x{}", hex::encode(keypair.public_key())),
        encrypted_session_key_hex: format!("0x{}", hex::encode(encrypted_session_key)),
    })
}

pub struct EncryptedIntentPayload {
    pub ciphertext_hex: String,
    pub client_public_key_hex: String,
    pub encrypted_session_key_hex: String,
}

/// ECDH key exchange implementation
pub struct ECDHKeyPair {
    private_key: StaticSecret,
    public_key: PublicKey,
}

impl ECDHKeyPair {
    pub fn generate() -> Self {
        let private_key = StaticSecret::random_from_rng(OsRng);
        let public_key = PublicKey::from(&private_key);
        Self { private_key, public_key }
    }

    pub fn from_private_key(private_key: [u8; 32]) -> Self {
        let private_key = StaticSecret::from(private_key);
        let public_key = PublicKey::from(&private_key);
        Self { private_key, public_key }
    }

    pub fn public_key(&self) -> [u8; 32] {
        self.public_key.to_bytes()
    }

    pub fn compute_shared_secret(&self, other_public_key: &[u8]) -> Result<[u8; 32], SdkError> {
        if other_public_key.len() != 32 {
            return Err(SdkError::EncryptionError("Invalid public key length".to_string()));
        }
        let mut key_bytes = [0u8; 32];
        key_bytes.copy_from_slice(other_public_key);
        let other = PublicKey::from(key_bytes);
        Ok(self.private_key.diffie_hellman(&other).to_bytes())
    }

    pub fn encrypt_for(&self, other_public_key: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, SdkError> {
        let shared_secret = self.compute_shared_secret(other_public_key)?;
        let encryption_key = EncryptionKey::from_bytes(&shared_secret)?;
        
        let mut nonce_bytes = [0u8; NONCE_SIZE];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        
        let ciphertext = encryption_key.cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| SdkError::EncryptionError(format!("Encryption failed: {}", e)))?;
        
        let mut result = nonce_bytes.to_vec();
        result.extend_from_slice(&ciphertext);
        
        Ok(result)
    }

    pub fn decrypt_from(&self, other_public_key: &[u8], ciphertext_with_nonce: &[u8]) -> Result<Vec<u8>, SdkError> {
        if ciphertext_with_nonce.len() < NONCE_SIZE {
            return Err(SdkError::EncryptionError("Ciphertext too short".to_string()));
        }

        let shared_secret = self.compute_shared_secret(other_public_key)?;
        let encryption_key = EncryptionKey::from_bytes(&shared_secret)?;
        
        let nonce = Nonce::from_slice(&ciphertext_with_nonce[..NONCE_SIZE]);
        let ciphertext = &ciphertext_with_nonce[NONCE_SIZE..];
        
        let plaintext = encryption_key.cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| SdkError::EncryptionError(format!("Decryption failed: {}", e)))?;
        
        Ok(plaintext)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{IntentBuilder, PrivacyMode};

    #[test]
    fn test_encryption_roundtrip() {
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

        let key = EncryptionKey::generate();
        
        let encrypted = key.encrypt_intent(&intent).unwrap();
        let decrypted = key.decrypt_intent(&encrypted).unwrap();

        assert_eq!(intent.intent_id, decrypted.intent_id);
        assert_eq!(intent.amount, decrypted.amount);
    }

    #[test]
    fn test_encryption_with_wrong_key() {
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

        let key1 = EncryptionKey::generate();
        let key2 = EncryptionKey::generate();
        
        let encrypted = key1.encrypt_intent(&intent).unwrap();
        let result = key2.decrypt_intent(&encrypted);

        assert!(result.is_err());
    }

    #[test]
    fn test_ecdh_key_generation() {
        let keypair = ECDHKeyPair::generate();
        assert_eq!(keypair.public_key().len(), 32);
    }

    #[test]
    fn test_ecdh_shared_secret_symmetry() {
        let alice = ECDHKeyPair::generate();
        let bob = ECDHKeyPair::generate();
        
        let alice_shared = alice.compute_shared_secret(bob.public_key()).unwrap();
        let bob_shared = bob.compute_shared_secret(alice.public_key()).unwrap();
        
        assert_eq!(alice_shared, bob_shared);
    }

    #[test]
    fn test_ecdh_encryption_decryption() {
        let alice = ECDHKeyPair::generate();
        let bob = ECDHKeyPair::generate();
        
        let plaintext = b"Secret intent data for solver";
        
        let ciphertext = alice.encrypt_for(bob.public_key(), plaintext).unwrap();
        let decrypted = bob.decrypt_from(alice.public_key(), &ciphertext).unwrap();
        
        assert_eq!(plaintext.to_vec(), decrypted);
    }

    #[test]
    fn test_ecdh_wrong_key_fails() {
        let alice = ECDHKeyPair::generate();
        let bob = ECDHKeyPair::generate();
        let eve = ECDHKeyPair::generate();
        
        let plaintext = b"Secret message";
        
        let ciphertext = alice.encrypt_for(bob.public_key(), plaintext).unwrap();
        
        // Eve tries to decrypt with wrong key
        let result = eve.decrypt_from(alice.public_key(), &ciphertext);
        assert!(result.is_err());
    }

    #[test]
    fn test_ecdh_intent_encryption() {
        let user = ECDHKeyPair::generate();
        let solver = ECDHKeyPair::generate();
        
        let intent = IntentBuilder::new()
            .user_address("0xUSER".to_string())
            .asset_in("0xBTC".to_string())
            .asset_out("0xUSDC".to_string())
            .amount(1_500_000)
            .min_output(50_000_000)
            .max_fee_bps(50)
            .deadline_seconds(3600)
            .privacy_mode(PrivacyMode::FullyHidden)
            .build()
            .unwrap();
        
        let intent_json = serde_json::to_vec(&intent).unwrap();
        
        let encrypted = user.encrypt_for(solver.public_key(), &intent_json).unwrap();
        let decrypted = solver.decrypt_from(user.public_key(), &encrypted).unwrap();
        
        let decrypted_intent: Intent = serde_json::from_slice(&decrypted).unwrap();
        
        assert_eq!(intent.intent_id, decrypted_intent.intent_id);
        assert_eq!(intent.amount, decrypted_intent.amount);
    }
}
