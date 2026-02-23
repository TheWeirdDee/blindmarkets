import { x25519 } from '@noble/curves/ed25519';
import { CryptoError, ValidationError } from './errors';
import { Intent } from './types';
import { bytesToHex, hexToBytes, normalizeHex } from './utils';

export type EncryptedPayload = {
  ciphertextHex: string;
  clientPublicKeyHex: string;
  encryptedSessionKeyHex: string;
};

export function generateKeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const privateKey = x25519.utils.randomPrivateKey();
  const publicKey = x25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

export async function encryptIntentForGateway(
  intent: Intent,
  gatewayPublicKeyHex: string
): Promise<EncryptedPayload> {
  const gatewayPublicKey = hexToBytes(normalizeHex(gatewayPublicKeyHex));
  if (gatewayPublicKey.length !== 32) {
    throw new ValidationError('Gateway public key must be 32 bytes');
  }

  const { privateKey, publicKey } = generateKeyPair();
  const sharedSecret = x25519.getSharedSecret(privateKey, gatewayPublicKey);
  const sessionKey = new Uint8Array(32);
  getWebCrypto().getRandomValues(sessionKey);
  const plaintext = new TextEncoder().encode(JSON.stringify(serializeIntent(intent)));
  const ciphertext = await aesGcmEncrypt(sessionKey, plaintext);
  const encryptedSessionKey = await aesGcmEncrypt(sharedSecret.slice(0, 32), sessionKey);

  return {
    ciphertextHex: bytesToHex(ciphertext),
    clientPublicKeyHex: bytesToHex(publicKey),
    encryptedSessionKeyHex: bytesToHex(encryptedSessionKey),
  };
}

export async function decryptIntentFromGateway(
  ciphertextHex: string,
  gatewayPublicKeyHex: string,
  clientPrivateKey: Uint8Array
): Promise<Uint8Array> {
  const gatewayPublicKey = hexToBytes(normalizeHex(gatewayPublicKeyHex));
  if (gatewayPublicKey.length !== 32) {
    throw new ValidationError('Gateway public key must be 32 bytes');
  }
  const sharedSecret = x25519.getSharedSecret(clientPrivateKey, gatewayPublicKey);
  const ciphertext = hexToBytes(normalizeHex(ciphertextHex));
  return aesGcmDecrypt(sharedSecret.slice(0, 32), ciphertext);
}

function serializeIntent(intent: Intent): Record<string, string | number> {
  return {
    intent_id: intent.intentId,
    user_address: intent.userAddress,
    asset_in: intent.assetIn,
    asset_out: intent.assetOut,
    amount: intent.amount.toString(),
    amount_commitment: intent.amountCommitment,
    min_output: intent.minOutput.toString(),
    max_fee_bps: intent.maxFeeBps,
    deadline: intent.deadline.toString(),
    privacy_mode: privacyModeToNumber(intent.privacyMode),
    nonce: intent.nonce,
  };
}

function privacyModeToNumber(mode: Intent['privacyMode']): number {
  if (mode === 'PUBLIC') {
    return 0;
  }
  if (mode === 'HIDDEN_AMOUNT') {
    return 1;
  }
  return 2;
}

async function aesGcmEncrypt(key: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const crypto = getWebCrypto();
  const nonce = new Uint8Array(12);
  crypto.getRandomValues(nonce);
  const imported = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, imported, plaintext)
  );
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce, 0);
  combined.set(ciphertext, nonce.length);
  return combined;
}

async function aesGcmDecrypt(key: Uint8Array, ciphertextWithNonce: Uint8Array): Promise<Uint8Array> {
  if (ciphertextWithNonce.length < 13) {
    throw new CryptoError('Ciphertext too short');
  }
  const crypto = getWebCrypto();
  const nonce = ciphertextWithNonce.slice(0, 12);
  const ciphertext = ciphertextWithNonce.slice(12);
  const imported = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, imported, ciphertext);
    return new Uint8Array(plaintext);
  } catch (error) {
    throw new CryptoError(`Decryption failed: ${String(error)}`);
  }
}

function getWebCrypto(): Crypto {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new CryptoError('WebCrypto is not available in this environment');
  }
  return globalThis.crypto;
}
