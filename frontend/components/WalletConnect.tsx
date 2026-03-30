'use client';

import { useEffect, useState } from 'react';
import { useIntentStore } from '../state/useIntentStore';
import {
  WALLET_PROVIDERS,
  connectWallet,
  restoreWalletSession,
  truncateAddress,
  type WalletProviderKey,
} from '../lib/starkzap-wallet';

export default function WalletConnect() {
  const {
    wallet,
    walletAddress,
    walletProviderKey,
    setWalletSession,
    clearWalletSession,
  } = useIntentStore();
  const [status, setStatus] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<WalletProviderKey | null>(null);

  useEffect(() => {
    if (!walletProviderKey || wallet) {
      return;
    }

    let isMounted = true;
    restoreWalletSession(walletProviderKey).then((session) => {
      if (!isMounted) {
        return;
      }
      if (session) {
        setWalletSession(session.wallet, session.address, session.providerKey);
      } else {
        clearWalletSession();
      }
    });

    return () => {
      isMounted = false;
    };
  }, [clearWalletSession, setWalletSession, wallet, walletProviderKey]);

  const onConnect = async (providerKey: WalletProviderKey) => {
    setStatus(null);
    setIsConnecting(providerKey);
    try {
      const session = await connectWallet(providerKey);
      setWalletSession(session.wallet, session.address, session.providerKey);
      document.cookie = `blindmarkets-wallet=${session.address}; path=/; SameSite=Lax`;
      setStatus(`Connected ${providerLabel(providerKey)} wallet.`);
    } catch (error) {
      setStatus(`Wallet connection failed: ${String(error)}`);
    } finally {
      setIsConnecting(null);
    }
  };

  return (
    <div className="glass-card glass-card-hover p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Wallets</p>
        {walletAddress ? (
          <button
            type="button"
            onClick={() => {
              clearWalletSession();
              document.cookie = 'blindmarkets-wallet=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
              setStatus('Wallet session cleared on this device.');
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-text-secondary"
          >
            Disconnect
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2">
        {WALLET_PROVIDERS.map((provider) => (
          <button
            key={provider.key}
            type="button"
            onClick={() => onConnect(provider.key)}
            disabled={isConnecting !== null}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-secondary disabled:opacity-50"
          >
            {isConnecting === provider.key ? `Connecting ${provider.label}...` : `Connect ${provider.label}`}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary">
        {walletAddress
          ? `${providerLabel(walletProviderKey)}: ${truncateAddress(walletAddress)}`
          : 'Not connected'}
      </div>

      {status ? <p className="mt-2 text-xs text-text-muted">{status}</p> : null}
    </div>
  );
}

function providerLabel(providerKey: WalletProviderKey | null): string {
  return WALLET_PROVIDERS.find((provider) => provider.key === providerKey)?.label ?? 'Wallet';
}
