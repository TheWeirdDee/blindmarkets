'use client';

import { cairo, typedData } from 'starknet';
import type { WalletAccount } from 'starknet';
import type { IntentPayload } from './intentCrypto';

export type WalletProviderKey = 'starknet' | 'starknet_braavos' | 'starknet_argentX';

type InjectedWalletProvider = {
  id?: string;
  name?: string;
  version?: string;
  icon?: string;
  request: (args: { type: string; params?: Record<string, unknown> }) => Promise<unknown>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  off?: (event: string, listener: (...args: unknown[]) => void) => void;
  selectedAddress?: string;
};

type WalletWindow = Window & Record<WalletProviderKey, InjectedWalletProvider | undefined>;

export type ConnectedWalletSession = {
  account: WalletAccount;
  address: string;
  providerKey: WalletProviderKey;
};

export const WALLET_PROVIDERS: Array<{ key: WalletProviderKey; label: string }> = [
  { key: 'starknet_argentX', label: 'Argent' },
  { key: 'starknet_braavos', label: 'Braavos' },
  { key: 'starknet', label: 'Injected' },
];

export async function connectWallet(providerKey: WalletProviderKey): Promise<ConnectedWalletSession> {
  const provider = getInjectedProvider(providerKey);
  const { WalletAccount: WA } = await import('starknet');
  const account = new WA({ nodeUrl: resolveRpcUrl() }, provider as never) as WalletAccount;
  const accounts = await account.requestAccounts(false);
  const address = normalizeHex(accounts[0] ?? account.address ?? provider.selectedAddress ?? '');
  if (!address || address === '0x') {
    throw new Error('No account returned from wallet');
  }

  return {
    account,
    address,
    providerKey,
  };
}

export async function restoreWalletSession(
  providerKey: WalletProviderKey
): Promise<ConnectedWalletSession | null> {
  try {
    const provider = getInjectedProvider(providerKey);
    const { WalletAccount: WA } = await import('starknet');
    const account = new WA({ nodeUrl: resolveRpcUrl() }, provider as never) as WalletAccount;
    const accounts = await account.requestAccounts(true);
    const address = normalizeHex(accounts[0] ?? account.address ?? provider.selectedAddress ?? '');
    if (!address || address === '0x') {
      return null;
    }

    return {
      account,
      address,
      providerKey,
    };
  } catch {
    return null;
  }
}

export async function signIntentAuthorization(
  account: WalletAccount,
  intent: IntentPayload
): Promise<{ signature: string[]; authorizationHash: string }> {
  const authorization = buildIntentAuthorizationTypedData(intent);
  const signature = await account.signMessage(authorization);
  const authorizationHash = typedData.getMessageHash(authorization, intent.userAddress);

  return {
    signature: signature.map((value) => normalizeHex(String(value))),
    authorizationHash: normalizeHex(String(authorizationHash)),
  };
}

export function buildCommitIntentCall(intent: IntentPayload) {
  return {
    contractAddress: resolveIntentRegistryAddress(),
    entrypoint: 'commit_intent',
    calldata: [
      intent.intentId,
      intent.userAddress,
      intent.intentHash,
      intent.nonce,
      intent.assetIn,
      intent.assetOut,
      intent.amountCommitment,
      ...toUint256Calldata(intent.minOutput),
      numberToHex(intent.maxFeeBps),
      bigintToHex(intent.deadline),
      numberToHex(privacyModeToNumber(intent.privacyMode)),
      '0x0',
    ],
  };
}

export function buildCancelIntentCall(intentId: string) {
  return {
    contractAddress: resolveIntentRegistryAddress(),
    entrypoint: 'cancel_intent',
    calldata: [normalizeHex(intentId), '0x0'],
  };
}

export function truncateAddress(address: string): string {
  if (!address || address.length < 12) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function buildIntentAuthorizationTypedData(intent: IntentPayload) {
  return {
    types: {
      StarkNetDomain: [
        { name: 'name', type: 'string' },
        { name: 'chainId', type: 'felt' },
        { name: 'version', type: 'string' },
      ],
      IntentAuthorization: [
        { name: 'intent_hash', type: 'felt' },
        { name: 'intent_id', type: 'felt' },
        { name: 'nonce', type: 'felt' },
        { name: 'amount_commitment', type: 'felt' },
        { name: 'deadline', type: 'felt' },
      ],
    },
    primaryType: 'IntentAuthorization',
    domain: {
      name: 'BlindMarkets',
      chainId: resolveChainId(),
      version: '1',
    },
    message: {
      intent_hash: intent.intentHash,
      intent_id: intent.intentId,
      nonce: intent.nonce,
      amount_commitment: intent.amountCommitment,
      deadline: bigintToHex(intent.deadline),
    },
  };
}

function getInjectedProvider(providerKey: WalletProviderKey): InjectedWalletProvider {
  if (typeof window === 'undefined') {
    throw new Error('Wallet access is only available in the browser');
  }

  const provider = (window as unknown as WalletWindow)[providerKey];
  if (!provider) {
    throw new Error('Wallet provider not detected in this browser');
  }
  return provider;
}

function resolveRpcUrl(): string {
  const rpcUrl = process.env.NEXT_PUBLIC_STARKNET_RPC_URL;
  if (!rpcUrl) {
    throw new Error('NEXT_PUBLIC_STARKNET_RPC_URL is not configured');
  }
  return rpcUrl;
}

function resolveChainId(): string {
  const chainId = process.env.NEXT_PUBLIC_STARKNET_CHAIN_ID;
  if (!chainId) {
    throw new Error('NEXT_PUBLIC_STARKNET_CHAIN_ID is not configured');
  }
  return normalizeHex(chainId);
}

function resolveIntentRegistryAddress(): string {
  const contractAddress = process.env.NEXT_PUBLIC_INTENT_REGISTRY_ADDRESS;
  if (!contractAddress) {
    throw new Error('NEXT_PUBLIC_INTENT_REGISTRY_ADDRESS is not configured');
  }
  return normalizeHex(contractAddress);
}

function toUint256Calldata(value: bigint): [string, string] {
  const uintValue = cairo.uint256(value);
  return [normalizeHex(String(uintValue.low)), normalizeHex(String(uintValue.high))];
}

function privacyModeToNumber(mode: IntentPayload['privacyMode']): number {
  if (mode === 'public') {
    return 0;
  }
  if (mode === 'hidden-amount') {
    return 1;
  }
  return 2;
}

function normalizeHex(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return normalized;
  }
  if (normalized.startsWith('0x') || normalized.startsWith('0X')) {
    return `0x${normalized.slice(2).toLowerCase()}`;
  }
  if (/^\d+$/.test(normalized)) {
    return `0x${BigInt(normalized).toString(16)}`;
  }
  return `0x${normalized.toLowerCase()}`;
}

function bigintToHex(value: bigint): string {
  return normalizeHex(value.toString(16));
}

function numberToHex(value: number): string {
  return bigintToHex(BigInt(value));
}
