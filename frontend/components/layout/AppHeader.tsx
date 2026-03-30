'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import WalletStatus from '@/components/wallet/WalletStatus';

const TITLE_MAP: Record<string, string> = {
  '/desk': 'Trading Desk',
  '/history': 'Intent History',
  '/analytics': 'Analytics',
  '/risk': 'Risk Monitor',
  '/solver': 'Solver Desk',
};

function computeCountdownLabel(): string {
  const windowSeconds = Number(process.env.NEXT_PUBLIC_BATCH_WINDOW_SECONDS ?? 0);
  const genesisTimestamp = Number(process.env.NEXT_PUBLIC_GENESIS_TIMESTAMP ?? 0);
  if (!windowSeconds || !genesisTimestamp) {
    return 'Batch --';
  }

  const now = Math.floor(Date.now() / 1000);
  const elapsed = Math.max(0, now - genesisTimestamp);
  const remaining = windowSeconds - (elapsed % windowSeconds);
  return `Batch ${remaining}s`;
}

export default function AppHeader() {
  const pathname = usePathname();
  const [countdownLabel, setCountdownLabel] = useState<string>(() => computeCountdownLabel());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownLabel(computeCountdownLabel());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const title = useMemo(() => {
    for (const [prefix, value] of Object.entries(TITLE_MAP)) {
      if (pathname.startsWith(prefix)) {
        return value;
      }
    }
    return 'BlindMarkets App';
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-bg-base/90 backdrop-blur md:left-16 xl:left-[220px]">
      <div className="mx-auto flex h-[60px] w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-text-secondary">
            {countdownLabel}
          </span>
          <WalletStatus compact />
        </div>
      </div>
    </header>
  );
}
