import { hash } from 'starknet';
import { keccak_256 } from '@noble/hashes/sha3';
import { Intent, IntentCommitment, PrivacyMode } from './types';
import { ValidationError } from './errors';
import { bytesToHex, normalizeHex, nowUnixSeconds } from './utils';

type BuilderParams = {
  userAddress?: string;
  assetIn?: string;
  assetOut?: string;
  amount?: bigint;
  minOutput?: bigint;
  maxFeeBps?: number;
  deadline?: bigint;
  nonce?: string;
  privacyMode?: PrivacyMode;
};

export class IntentBuilder {
  private params: BuilderParams = {};

  userAddress(value: string): this {
    this.params.userAddress = normalizeHex(value);
    return this;
  }

  assetIn(value: string): this {
    this.params.assetIn = normalizeHex(value);
    return this;
  }

  assetOut(value: string): this {
    this.params.assetOut = normalizeHex(value);
    return this;
  }

  amount(value: bigint): this {
    this.params.amount = value;
    return this;
  }

  minOutput(value: bigint): this {
    this.params.minOutput = value;
    return this;
  }

  maxFeeBps(value: number): this {
    this.params.maxFeeBps = value;
    return this;
  }

  deadlineSeconds(secondsFromNow: bigint): this {
    this.params.deadline = nowUnixSeconds() + secondsFromNow;
    return this;
  }

  deadlineTimestamp(timestamp: bigint): this {
    this.params.deadline = timestamp;
    return this;
  }

  nonce(value: string): this {
    this.params.nonce = normalizeHex(value);
    return this;
  }

  privacyMode(value: PrivacyMode): this {
    this.params.privacyMode = value;
    return this;
  }

  build(): Intent {
    const userAddress = this.requiredHex(this.params.userAddress, 'userAddress');
    const assetIn = this.requiredHex(this.params.assetIn, 'assetIn');
    const assetOut = this.requiredHex(this.params.assetOut, 'assetOut');
    const amount = this.requiredBigint(this.params.amount, 'amount');
    const minOutput = this.requiredBigint(this.params.minOutput, 'minOutput');
    const maxFeeBps = this.requiredNumber(this.params.maxFeeBps, 'maxFeeBps');
    const deadline = this.requiredBigint(this.params.deadline, 'deadline');
    const privacyMode = this.params.privacyMode ?? 'PUBLIC';

    if (amount <= 0n) {
      throw new ValidationError('amount must be greater than 0');
    }
    if (minOutput <= 0n) {
      throw new ValidationError('minOutput must be greater than 0');
    }
    if (assetIn === assetOut) {
      throw new ValidationError('assetIn and assetOut must be different');
    }
    if (deadline <= nowUnixSeconds()) {
      throw new ValidationError('deadline must be in the future');
    }
    if (maxFeeBps < 0 || maxFeeBps > 10_000) {
      throw new ValidationError('maxFeeBps must be between 0 and 10000');
    }

    const nonce = this.params.nonce ?? generateNonce();
    const amountCommitment = pedersenHash(bigintToHex(amount), nonce);
    const intentHash = computeIntentHash({
      userAddress,
      assetIn,
      assetOut,
      amountCommitment,
      minOutput,
      maxFeeBps,
      deadline,
      privacyMode,
      nonce,
    });
    const intentId = computeIntentId(userAddress, nonce, intentHash);

    return {
      intentId,
      userAddress,
      assetIn,
      assetOut,
      amount,
      amountCommitment,
      minOutput,
      maxFeeBps,
      deadline,
      privacyMode,
      nonce,
    };
  }

  private requiredHex(value: string | undefined, label: string): string {
    if (!value) {
      throw new ValidationError(`${label} is required`);
    }
    return normalizeHex(value);
  }

  private requiredBigint(value: bigint | undefined, label: string): bigint {
    if (value === undefined || value === null) {
      throw new ValidationError(`${label} is required`);
    }
    return value;
  }

  private requiredNumber(value: number | undefined, label: string): number {
    if (value === undefined || value === null || Number.isNaN(value)) {
      throw new ValidationError(`${label} is required`);
    }
    return value;
  }
}

export function createCommitment(intent: Intent): IntentCommitment {
  const amountCommitment = intent.amountCommitment;
  const minOutputCommitment = pedersenHash(bigintToHex(intent.minOutput), intent.nonce);
  const intentHash = computeIntentHash({
    userAddress: intent.userAddress,
    assetIn: intent.assetIn,
    assetOut: intent.assetOut,
    amountCommitment,
    minOutput: intent.minOutput,
    maxFeeBps: intent.maxFeeBps,
    deadline: intent.deadline,
    privacyMode: intent.privacyMode,
    nonce: intent.nonce,
  });

  return {
    intentId: intent.intentId,
    userAddress: intent.userAddress,
    intentHash,
    amountCommitment,
    minOutputCommitment,
    maxFeeBps: intent.maxFeeBps,
    deadline: intent.deadline,
    privacyMode: intent.privacyMode,
    nonce: intent.nonce,
  };
}

function generateNonce(): string {
  if (!globalThis.crypto?.getRandomValues) {
    throw new ValidationError('crypto.getRandomValues not available');
  }
  const entropy = new Uint8Array(32);
  globalThis.crypto.getRandomValues(entropy);
  const timestamp = new Uint8Array(new BigUint64Array([BigInt(Date.now())]).buffer);
  const combined = new Uint8Array(entropy.length + timestamp.length);
  combined.set(entropy, 0);
  combined.set(timestamp, entropy.length);
  const hashBytes = keccak_256(combined);
  return bytesToHex(hashBytes);
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
  if (mode === 'PUBLIC') {
    return bigintToHex(0n);
  }
  if (mode === 'HIDDEN_AMOUNT') {
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
  throw new ValidationError('Pedersen hash function not available in starknet.js');
}

function bigintToHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}
