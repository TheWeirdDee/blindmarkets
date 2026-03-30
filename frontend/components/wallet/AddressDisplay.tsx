'use client';

import { Copy, ExternalLink } from 'lucide-react';

type AddressDisplayProps = {
  address: string;
  truncate?: boolean;
};

function truncateAddress(address: string): string {
  if (address.length < 12) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function resolveExplorerBaseUrl(): string {
  return process.env.NEXT_PUBLIC_STARKNET_NETWORK === 'mainnet'
    ? 'https://starkscan.co'
    : 'https://sepolia.starkscan.co';
}

export default function AddressDisplay({ address, truncate = true }: AddressDisplayProps) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-text-secondary">
      <span className="font-mono text-mono">{truncate ? truncateAddress(address) : address}</span>
      <button
        type="button"
        className="rounded border border-white/10 bg-white/5 p-1 hover:text-text-primary"
        onClick={async () => {
          await navigator.clipboard.writeText(address);
        }}
        aria-label="Copy wallet address"
      >
        <Copy className="h-3 w-3" />
      </button>
      <a
        href={`${resolveExplorerBaseUrl()}/contract/${address}`}
        target="_blank"
        rel="noreferrer"
        className="rounded border border-white/10 bg-white/5 p-1 hover:text-text-primary"
        aria-label="Open on Starkscan"
      >
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
