'use client';

import { useState } from 'react';
import { useIntentStore } from '../state/useIntentStore';

type StarknetProvider = {
  enable: () => Promise<string[]>;
  selectedAddress?: string;
};

export default function WalletConnect() {
  const { setWalletAddress, walletAddress } = useIntentStore();
  const [status, setStatus] = useState<string | null>(null);

  const connectWallet = async (providerKey: 'starknet' | 'starknet_braavos' | 'starknet_argentX') => {
    setStatus(null);
    const provider = (window as unknown as Record<string, StarknetProvider | undefined>)[providerKey];
    if (!provider) {
      setStatus('Wallet provider not detected in this browser.');
      return;
    }
    try {
      const accounts = await provider.enable();
      const address = accounts?.[0] ?? provider.selectedAddress;
      if (!address) {
        setStatus('No account returned from wallet.');
        return;
      }
      setWalletAddress(address);
      setStatus('Wallet connected.');
    } catch (error) {
      setStatus(`Wallet connection failed: ${String(error)}`);
    }
  };

  return (
    <div className="glass-card glass-card-hover p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Wallets</p>
      <div className="mt-3 grid gap-2">
        <button
          onClick={() => connectWallet('starknet_argentX')}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-secondary"
        >
          Connect Argent
        </button>
        <button
          onClick={() => connectWallet('starknet_braavos')}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-secondary"
        >
          Connect Braavos
        </button>
        <button
          onClick={() => connectWallet('starknet')}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-secondary"
        >
          Connect Injected
        </button>
      </div>
      <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary">
        {walletAddress ? `Connected: ${walletAddress}` : 'Not connected'}
      </div>
      {status && (
        <p className="mt-2 text-xs text-text-muted">{status}</p>
      )}
    </div>
  );
}
