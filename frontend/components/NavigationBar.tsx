import Link from 'next/link';
import BrandMark from './BrandMark';

type NavigationBarProps = {
  variant?: 'landing' | 'app';
};

export default function NavigationBar({ variant = 'app' }: NavigationBarProps) {
  const isLanding = variant === 'landing';

  return (
    <nav className="glass-card relative overflow-hidden rounded-[24px] mx-2 sm:mx-0 px-4 py-3 sm:px-5 sm:py-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,209,255,0.1),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,28,0.08),transparent_34%)]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="min-w-0">
          <BrandMark
            subtitle={isLanding ? 'Private BTC intents' : 'Starknet execution desk'}
          />
        </Link>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] uppercase tracking-[0.22em] text-text-muted sm:text-xs">
          {isLanding ? (
            <>
              <Link href="#intent-composer" className="transition-colors hover:text-text-primary">Compose</Link>
              <Link href="#risk-disclosure" className="transition-colors hover:text-text-primary">Risk</Link>
              <Link href="/dashboard#intent-history" className="transition-colors hover:text-text-primary">History</Link>
              <Link href="/analytics" className="transition-colors hover:text-text-primary">Analytics</Link>
              <Link href="/docs" className="transition-colors hover:text-text-primary">Docs</Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className="transition-colors hover:text-text-primary">Dashboard</Link>
              <Link href="/intent" className="transition-colors hover:text-text-primary">Intent</Link>
              <Link href="/analytics" className="transition-colors hover:text-text-primary">Analytics</Link>
              <Link href="/dashboard#intent-history" className="transition-colors hover:text-text-primary">History</Link>
              <Link href="/docs" className="transition-colors hover:text-text-primary">Docs</Link>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {isLanding ? (
            <>
              <Link
                href="/dashboard#wallets"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
              >
                Open Desk
              </Link>
              <Link
                href="#intent-composer"
                className="rounded-full bg-accent-primary px-4 py-2 text-xs font-semibold text-white shadow-[0_0_24px_rgba(0,209,255,0.18)]"
              >
                Start Intent
              </Link>
            </>
          ) : (
            <Link
              href="/dashboard#wallets"
              className="rounded-full bg-accent-primary px-4 py-2 text-xs font-semibold text-white shadow-[0_0_24px_rgba(0,209,255,0.18)]"
            >
              Connect Wallet
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
