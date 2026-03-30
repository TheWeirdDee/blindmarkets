'use client';

import Link from 'next/link';
import { useIntentStore } from '@/state/useIntentStore';
import AddressDisplay from '@/components/wallet/AddressDisplay';

type WalletStatusProps = {
  compact?: boolean;
};

export default function WalletStatus({ compact = false }: WalletStatusProps) {
  const walletAddress = useIntentStore((state) => state.walletAddress);

  if (!walletAddress) {
    return (
      <Link
        href="/connect"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-text-secondary"
      >
        Connect
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
      <AddressDisplay address={walletAddress} truncate={compact} />
    </div>
  );
}
