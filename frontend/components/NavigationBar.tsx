import Link from 'next/link';
import PublicNav from '@/components/layout/PublicNav';
import BrandMark from '@/components/BrandMark';

type NavigationBarProps = {
  variant?: 'landing' | 'app';
};

export default function NavigationBar({ variant = 'app' }: NavigationBarProps) {
  if (variant === 'landing') {
    return <PublicNav />;
  }

  return (
    <nav className="glass-card flex items-center justify-between gap-4 rounded-2xl px-4 py-3">
      <Link href="/desk">
        <BrandMark subtitle="Execution desk" />
      </Link>
      <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.2em] text-text-muted">
        <Link href="/desk">Desk</Link>
        <Link href="/history">History</Link>
        <Link href="/analytics">Analytics</Link>
        <Link href="/risk">Risk</Link>
        <Link href="/docs">Docs</Link>
      </div>
      <Link
        href="/connect"
        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-text-secondary"
      >
        Connect Wallet
      </Link>
    </nav>
  );
}
