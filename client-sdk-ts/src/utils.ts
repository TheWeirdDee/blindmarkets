import { ValidationError } from './errors';

export function normalizeHex(value: string): string {
  if (!value) {
    throw new ValidationError('Hex value is required');
  }
  return value.startsWith('0x') ? value : `0x${value}`;
}

export function assertHex(value: string, label: string): void {
  const normalized = normalizeHex(value);
  const hex = normalized.slice(2);
  if (!hex || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new ValidationError(`${label} must be valid hex`);
  }
}

export function hexToBytes(value: string): Uint8Array {
  assertHex(value, 'hex');
  const hex = normalizeHex(value).slice(2);
  if (hex.length % 2 !== 0) {
    throw new ValidationError('hex length must be even');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export function bigintToHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

export function nowUnixSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}
