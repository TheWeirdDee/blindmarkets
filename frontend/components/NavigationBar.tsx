import Link from 'next/link';

export default function NavigationBar() {
  return (
    <nav className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/10" />
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">BlindMarkets</p>
          <p className="text-sm font-semibold">Institutional Console</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-text-secondary">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/intent">Intent</Link>
        <Link href="/analytics">Analytics</Link>
        <Link href="/analytics#risk-disclosure">Risk</Link>
      </div>
      <Link href="/dashboard#wallets" className="rounded-full bg-accent-primary px-4 py-2 text-xs font-semibold text-white">
        Connect Wallet
      </Link>
    </nav>
  );
}
