import { hash } from 'starknet';
import { keccak_256 } from '@noble/hashes/sha3';
import { ValidationError } from './errors.js';
import type { Intent, PrivacyMode, IntentCommitment } from './types.js';

export class IntentBuilder {
  private _userAddress?: string;
  private _assetIn?: string;
  private _assetOut?: string;
  private _amount?: bigint;
  private _minOutput?: bigint;
  private _maxFeeBps?: number;
  private _deadlineSeconds?: bigint;
  private _privacyMode: PrivacyMode = 'PUBLIC';

  userAddress(address: string): this { this._userAddress = address; return this; }
  assetIn(address: string): this { this._assetIn = address; return this; }
  assetOut(address: string): this { this._assetOut = address; return this; }
  amount(value: bigint): this { this._amount = value; return this; }
  minOutput(value: bigint): this { this._minOutput = value; return this; }
  maxFeeBps(bps: number): this { this._maxFeeBps = bps; return this; }
  deadlineSeconds(seconds: bigint): this { this._deadlineSeconds = seconds; return this; }
  privacyMode(mode: PrivacyMode): this { this._privacyMode = mode; return this; }

  build(): Intent {
    if (!this._userAddress) throw new ValidationError('userAddress is required');
    if (!this._assetIn) throw new ValidationError('assetIn is required');
    if (!this._assetOut) throw new ValidationError('assetOut is required');
    if (this._amount === undefined) throw new ValidationError('amount is required');
    if (this._minOutput === undefined) throw new ValidationError('minOutput is required');
    if (this._maxFeeBps === undefined) throw new ValidationError('maxFeeBps is required');
    if (this._deadlineSeconds === undefined) throw new ValidationError('deadlineSeconds is required');

    const nonce = generateNonce();
    const deadline = BigInt(Math.floor(Date.now() / 1000)) + this._deadlineSeconds;

    const amountCommitment = pedersenHash(bigintToHex(this._amount), nonce);
    const intentHash = computeIntentHash({
      userAddress: this._userAddress,
      assetIn: this._assetIn,
      assetOut: this._assetOut,
      amountCommitment,
      minOutput: this._minOutput,
      maxFeeBps: this._maxFeeBps,
      deadline,
      privacyMode: this._privacyMode,
      nonce,
    });
    const intentId = computeIntentId(this._userAddress, nonce, intentHash);

    return {
      intentId,
      intentHash,
      userAddress: normalizeHex(this._userAddress),
      assetIn: normalizeHex(this._assetIn),
      assetOut: normalizeHex(this._assetOut),
      amount: this._amount,
      amountCommitment,
      minOutput: this._minOutput,
      maxFeeBps: this._maxFeeBps,
      deadline,
      privacyMode: this._privacyMode,
      nonce,
    };
  }
}

export function createCommitment(intent: Intent): IntentCommitment {
  return {
    intentId: intent.intentId,
    intentHash: intent.intentHash,
    amountCommitment: intent.amountCommitment,
    minOutput: intent.minOutput,
    maxFeeBps: intent.maxFeeBps,
    deadline: intent.deadline,
    privacyMode: intent.privacyMode,
    nonce: intent.nonce,
  };
}

const STARKNET_P = BigInt('0x0800000000000011000000000000000000000000000000000000000000000001');

function generateNonce(): string {
  const entropy = new Uint8Array(32);
  globalThis.crypto.getRandomValues(entropy);
  const time = new Uint8Array(new BigUint64Array([BigInt(Date.now())]).buffer);
  const combined = new Uint8Array(entropy.length + time.length);
  combined.set(entropy, 0);
  combined.set(time, entropy.length);
  const raw = BigInt(bytesToHex(keccak_256(combined)));
  return normalizeHex((raw % STARKNET_P).toString(16));
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
  if (mode === 'PUBLIC') return bigintToHex(0n);
  if (mode === 'HIDDEN_AMOUNT') return bigintToHex(1n);
  return bigintToHex(2n);
}

type PedersenHashFn = (left: string, right: string) => string;

function pedersenHash(left: string, right: string): string {
  const h = hash as unknown as { pedersen?: PedersenHashFn; computePedersenHash?: PedersenHashFn };
  const fn = h.pedersen ?? h.computePedersenHash;
  if (!fn) throw new Error('Pedersen hash not available in starknet.js');
  return fn(normalizeHex(left), normalizeHex(right));
}

function normalizeHex(value: string): string {
  return value.startsWith('0x') ? value : `0x${value}`;
}

function bigintToHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}
