import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

export default function PublicFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:justify-between">
        <div>
          <BrandMark subtitle="Blind BTC intent protocol" />
          <p className="mt-2 text-xs text-text-muted">Copyright 2026 BlindMarkets</p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm text-text-secondary sm:grid-cols-3">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Protocol</p>
            <Link href="/desk" className="block">Desk</Link>
            <Link href="/history" className="block">History</Link>
            <Link href="/analytics" className="block">Analytics</Link>
            <Link href="/risk" className="block">Risk</Link>
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Resources</p>
            <Link href="/docs" className="block">Docs</Link>
            <a href="https://github.com/winsznx/blindmarkets" target="_blank" rel="noreferrer" className="block">GitHub</a>
            <Link href="/docs/contracts" className="block">Audit Reports</Link>
            <Link href="/docs/api" className="block">Status</Link>
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Network</p>
            <p>Starknet Sepolia</p>
            <p>Bitcoin Intent Protocol</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
