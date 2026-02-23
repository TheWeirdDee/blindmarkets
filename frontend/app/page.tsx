import Link from 'next/link';
import IntentComposer from '../components/IntentComposer';
import PrivacyModeBadge from '../components/PrivacyModeBadge';
import BatchTimeline from '../components/BatchTimeline';
import SolverFillPreview from '../components/SolverFillPreview';
import RiskDisclosurePanel from '../components/RiskDisclosurePanel';
import AuditLogView from '../components/AuditLogView';

export default function HomePage() {
  const auditReportsUrl = process.env.NEXT_PUBLIC_AUDIT_REPORTS_URL;

  return (
    <main className="relative z-10 min-h-screen px-6 pb-20 pt-10 md:px-12 lg:px-20">
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10" />
          <span className="text-sm uppercase tracking-[0.3em] text-text-muted">BlindMarkets</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard#wallets" className="text-xs text-text-secondary">Login</Link>
          <Link href="#intent-composer" className="rounded-full bg-accent-primary px-4 py-2 text-xs font-semibold text-white">Get Started</Link>
        </div>
      </nav>

      <section className="mt-16 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-text-muted">Blind Bitcoin Intent Markets</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
            Private, MEV-Resistant Execution for Bitcoin
          </h1>
          <p className="mt-4 max-w-xl text-sm text-text-secondary">
            Institutional-grade batch clearing on Starknet with encrypted intent flow, solver auctions, and auditable settlement.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted"
              placeholder="Enter email for access"
            />
            <Link href="/intent" className="rounded-xl bg-accent-primary px-6 py-3 text-center text-sm font-semibold text-white">
              Get Started →
            </Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <PrivacyModeBadge
              variant="public"
              description="Transparent execution with auditability."
            />
            <PrivacyModeBadge
              variant="hiddenAmount"
              description="Conceal size with balanced latency."
            />
            <PrivacyModeBadge
              variant="maxPrivacy"
              description="Conceal both size and direction."
            />
          </div>
        </div>
        <div className="glass-card gradient-border p-5">
          <div className="h-64 rounded-2xl border border-white/10 bg-white/5" />
          <p className="mt-4 text-xs text-text-muted">Dashboard preview (live execution window)</p>
        </div>
      </section>

      <section id="intent-composer" className="mt-20 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <IntentComposer />
        <BatchTimeline />
      </section>

      <section id="risk-disclosure" className="mt-10 grid gap-6 lg:grid-cols-3">
        <SolverFillPreview />
        <RiskDisclosurePanel />
        <AuditLogView />
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-3">
        {[
          { title: 'Privacy First', desc: 'Encrypted orders and solver commitments remove MEV leakage.' },
          { title: 'Batch Clearing', desc: 'Deterministic windows align liquidity for best execution.' },
          { title: 'Solver Network', desc: 'Competing solvers drive price improvement and fee efficiency.' }
        ].map((item) => (
          <div key={item.title} className="glass-card glass-card-hover p-6">
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-text-secondary">{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="mt-20 grid gap-8 lg:grid-cols-[1fr_1fr_1fr]">
        <div className="glass-card p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-text-muted">How It Works</p>
          <h3 className="mt-2 text-2xl font-semibold">1 → 2 → 3</h3>
          <p className="mt-2 text-sm text-text-secondary">Intent submission, solver auction, settlement across bridges.</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Security</p>
          <h3 className="mt-2 text-2xl font-semibold">Audited Architecture</h3>
          <p className="mt-2 text-sm text-text-secondary">Proof verification, solver bonds, and slashing enforcement.</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Compliance</p>
          <h3 className="mt-2 text-2xl font-semibold">Institutional Controls</h3>
          <p className="mt-2 text-sm text-text-secondary">Role-based access, audit logs, and reporting exports.</p>
        </div>
      </section>

      <section className="mt-16 flex flex-col items-center justify-between gap-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center lg:flex-row lg:text-left">
        <div>
          <h3 className="text-2xl font-semibold">Ready to route your BTC intents?</h3>
          <p className="mt-2 text-sm text-text-secondary">Connect wallets and start with protected execution.</p>
        </div>
        <Link href="/dashboard" className="rounded-xl bg-accent-primary px-6 py-3 text-sm font-semibold text-white">
          Launch Dashboard
        </Link>
      </section>

      <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-text-muted">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span>© 2026 BlindMarkets Protocol</span>
          <div className="flex flex-wrap gap-4">
            <Link href="/intent">Docs</Link>
            <Link href="/analytics">Security</Link>
            {auditReportsUrl ? (
              <a href={auditReportsUrl} target="_blank" rel="noreferrer">Audit Reports</a>
            ) : (
              <Link href="#risk-disclosure">Audit Reports</Link>
            )}
            <Link href="/dashboard#intent-history">Status</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
