import { hash } from 'starknet';
import { keccak_256 } from '@noble/hashes/sha3';
import { x25519 } from '@noble/curves/ed25519';

export type PrivacyMode = 'public' | 'hidden-amount' | 'hidden-direction';

export type IntentPayload = {
  intentId: string;
  intentHash: string;
  userAddress: string;
  assetIn: string;
  assetOut: string;
  amount: bigint;
  amountCommitment: string;
  minOutput: bigint;
  maxFeeBps: number;
  deadline: bigint;
  privacyMode: PrivacyMode;
  nonce: string;
};

export type EncryptedIntentPayload = {
  ciphertextHex: string;
  clientPublicKeyHex: string;
  encryptedSessionKeyHex: string;
};

export function generateNonce(): string {
  const entropy = new Uint8Array(32);
  globalThis.crypto.getRandomValues(entropy);
  const time = new Uint8Array(new BigUint64Array([BigInt(Date.now())]).buffer);
  const combined = new Uint8Array(entropy.length + time.length);
  combined.set(entropy, 0);
  combined.set(time, entropy.length);
  return bytesToHex(keccak_256(combined));
}

export function buildIntent(input: {
  userAddress: string;
  assetIn: string;
  assetOut: string;
  amount: bigint;
  minOutput: bigint;
  maxFeeBps: number;
  deadline: bigint;
  privacyMode: PrivacyMode;
  nonce: string;
}): IntentPayload {
  const amountCommitment = pedersenHash(bigintToHex(input.amount), input.nonce);
  const intentHash = computeIntentHash({
    ...input,
    amountCommitment,
  });
  const intentId = computeIntentId(input.userAddress, input.nonce, intentHash);

  return {
    intentId,
    intentHash,
    userAddress: normalizeHex(input.userAddress),
    assetIn: normalizeHex(input.assetIn),
    assetOut: normalizeHex(input.assetOut),
    amount: input.amount,
    amountCommitment,
    minOutput: input.minOutput,
    maxFeeBps: input.maxFeeBps,
    deadline: input.deadline,
    privacyMode: input.privacyMode,
    nonce: input.nonce,
  };
}

export async function encryptIntentForGateway(
  intent: IntentPayload,
  gatewayPublicKeyHex: string
): Promise<EncryptedIntentPayload> {
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

function computeIntentHash(input: {
  userAddress: string;
  assetIn: string;
  assetOut: string;
  amountCommitment: string;
  minOutput: bigint;
  maxFeeBps: number;
  deadline: bigint;
  privacyMode: PrivacyMode;
  nonce: string;
}): string {
  let result = pedersenHash(input.userAddress, input.assetIn);
  result = pedersenHash(result, input.assetOut);
  result = pedersenHash(result, input.amountCommitment);
  const minOutputHash = pedersenHash(bigintToHex(input.minOutput), bigintToHex(0n));
  result = pedersenHash(result, minOutputHash);
  result = pedersenHash(result, bigintToHex(BigInt(input.maxFeeBps)));
  result = pedersenHash(result, bigintToHex(input.deadline));
  result = pedersenHash(result, privacyModeToHex(input.privacyMode));
  result = pedersenHash(result, input.nonce);
  return result;
}

function computeIntentId(userAddress: string, nonce: string, intentHash: string): string {
  const inner = pedersenHash(userAddress, nonce);
  return pedersenHash(inner, intentHash);
}

function privacyModeToHex(mode: PrivacyMode): string {
  if (mode === 'public') {
    return bigintToHex(0n);
  }
  if (mode === 'hidden-amount') {
    return bigintToHex(1n);
  }
  return bigintToHex(2n);
}

type PedersenHashFn = (left: string, right: string) => string;

function pedersenHash(left: string, right: string): string {
  const fn = resolvePedersenHash();
  return fn(normalizeHex(left), normalizeHex(right));
}

function resolvePedersenHash(): PedersenHashFn {
  const hasher = hash as unknown as {
    pedersen?: PedersenHashFn;
    computePedersenHash?: PedersenHashFn;
  };
  if (hasher.pedersen) {
    return hasher.pedersen;
  }
  if (hasher.computePedersenHash) {
    return hasher.computePedersenHash;
  }
  throw new Error('Pedersen hash function not available');
}

async function aesGcmEncrypt(key: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const crypto = globalThis.crypto;
  if (!crypto?.subtle) {
    throw new Error('WebCrypto is not available');
  }
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

function serializeIntent(intent: IntentPayload): Record<string, string | number> {
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

function privacyModeToNumber(mode: PrivacyMode): number {
  if (mode === 'public') {
    return 0;
  }
  if (mode === 'hidden-amount') {
    return 1;
  }
  return 2;
}

function normalizeHex(value: string): string {
  return value.startsWith('0x') ? value : `0x${value}`;
}

function hexToBytes(value: string): Uint8Array {
  const normalized = normalizeHex(value);
  const hex = normalized.slice(2);
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error('Invalid hex');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

function bigintToHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}
