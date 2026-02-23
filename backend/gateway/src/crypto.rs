use aes_gcm::{Aes256Gcm, Nonce, aead::{Aead, KeyInit}};
use rand::RngCore;
use x25519_dalek::{PublicKey, StaticSecret};

pub struct EncryptionPayload {
    pub ciphertext_hex: String,
    pub sender_public_key_hex: String,
}

pub fn public_key_from_private(private_key_hex: &str) -> Result<String, String> {
    let private_key = decode_key_32(private_key_hex, "gateway_private_key")?;
    let private_key = StaticSecret::from(private_key);
    let public_key = PublicKey::from(&private_key).to_bytes();
    Ok(format!("0x{}", hex::encode(public_key)))
}

pub fn decrypt_from_client(
    ciphertext_hex: &str,
    encrypted_session_key_hex: &str,
    client_public_key_hex: &str,
    gateway_private_key_hex: &str,
) -> Result<Vec<u8>, String> {
    let ciphertext = hex::decode(ciphertext_hex.trim_start_matches("0x"))
        .map_err(|e| format!("Invalid ciphertext hex: {}", e))?;
    if ciphertext.len() < 12 {
        return Err("Ciphertext too short".to_string());
    }

    let encrypted_session_key = hex::decode(encrypted_session_key_hex.trim_start_matches("0x"))
        .map_err(|e| format!("Invalid encrypted session key hex: {}", e))?;
    if encrypted_session_key.len() < 12 {
        return Err("Encrypted session key too short".to_string());
    }

    let gateway_private_key = decode_key_32(gateway_private_key_hex, "gateway_private_key")?;
    let client_public_key = decode_key_32(client_public_key_hex, "client_public_key")?;

    let private_key = StaticSecret::from(gateway_private_key);
    let public_key = PublicKey::from(client_public_key);
    let shared_secret = private_key.diffie_hellman(&public_key).to_bytes();

    let cipher = Aes256Gcm::new_from_slice(&shared_secret)
        .map_err(|_| "Invalid shared secret".to_string())?;
    let session_nonce = Nonce::from_slice(&encrypted_session_key[..12]);
    let session_key = cipher
        .decrypt(session_nonce, &encrypted_session_key[12..])
        .map_err(|e| format!("Session key decryption failed: {}", e))?;
    if session_key.len() != 32 {
        return Err("Session key must be 32 bytes".to_string());
    }

    let session_cipher = Aes256Gcm::new_from_slice(&session_key)
        .map_err(|_| "Invalid session key".to_string())?;
    let nonce = Nonce::from_slice(&ciphertext[..12]);
    let plaintext = session_cipher
        .decrypt(nonce, &ciphertext[12..])
        .map_err(|e| format!("Decryption failed: {}", e))?;

    Ok(plaintext)
}

pub fn encrypt_for_solver(
    plaintext: &[u8],
    gateway_private_key_hex: &str,
    solver_public_key_hex: &str,
) -> Result<EncryptionPayload, String> {
    let gateway_private_key = decode_key_32(gateway_private_key_hex, "gateway_private_key")?;
    let solver_public_key = decode_key_32(solver_public_key_hex, "solver_public_key")?;

    let private_key = StaticSecret::from(gateway_private_key);
    let public_key = PublicKey::from(solver_public_key);
    let shared_secret = private_key.diffie_hellman(&public_key).to_bytes();

    let cipher = Aes256Gcm::new_from_slice(&shared_secret)
        .map_err(|_| "Invalid shared secret".to_string())?;
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);

    let gateway_public_key = PublicKey::from(&private_key).to_bytes();

    Ok(EncryptionPayload {
        ciphertext_hex: format!("0x{}", hex::encode(combined)),
        sender_public_key_hex: format!("0x{}", hex::encode(gateway_public_key)),
    })
}

fn decode_key_32(value: &str, label: &str) -> Result<[u8; 32], String> {
    let decoded = hex::decode(value.trim_start_matches("0x"))
        .map_err(|e| format!("Invalid {} hex: {}", label, e))?;
    if decoded.len() != 32 {
        return Err(format!("{} must be 32 bytes", label));
    }
    let mut key = [0u8; 32];
    key.copy_from_slice(&decoded);
    Ok(key)
}
