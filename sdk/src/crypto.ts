import { x25519 } from '@noble/curves/ed25519';
import type { Intent, EncryptedIntent } from './types.js';

export async function encryptIntentForGateway(
  intent: Intent,
  gatewayPublicKeyHex: string
): Promise<EncryptedIntent> {
  const gatewayPublicKey = hexToBytes(gatewayPublicKeyHex);
  if (gatewayPublicKey.length !== 32) {
    throw new Error('Gateway public key must be 32 bytes');
  }

  const privateKey = x25519.utils.randomPrivateKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const sharedSecret = x25519.getSharedSecret(privateKey, gatewayPublicKey);

  const sessionKey = new Uint8Array(32);
  globalThis.crypto.getRandomValues(sessionKey);

  const plaintext = new TextEncoder().encode(JSON.stringify(serializeIntent(intent)));
  const ciphertext = await aesGcmEncrypt(sessionKey, plaintext);
  const encryptedSessionKey = await aesGcmEncrypt(sharedSecret.slice(0, 32), sessionKey);

  return {
    ciphertextHex: bytesToHex(ciphertext),
    clientPublicKeyHex: bytesToHex(publicKey),
    encryptedSessionKeyHex: bytesToHex(encryptedSessionKey),
  };
}

async function aesGcmEncrypt(key: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const crypto = globalThis.crypto;
  if (!crypto?.subtle) throw new Error('WebCrypto is not available');
  const nonce = new Uint8Array(12);
  crypto.getRandomValues(nonce);
  const imported = await crypto.subtle.importKey('raw', key.buffer as ArrayBuffer, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, imported, plaintext.buffer as ArrayBuffer)
  );
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce, 0);
  combined.set(ciphertext, nonce.length);
  return combined;
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
  if (mode === 'PUBLIC') return 0;
  if (mode === 'HIDDEN_AMOUNT') return 1;
  return 2;
}

function hexToBytes(value: string): Uint8Array {
  const hex = value.startsWith('0x') ? value.slice(2) : value;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}
