import Link from 'next/link';
import IntentComposer from '../components/IntentComposer';
import PrivacyModeBadge from '../components/PrivacyModeBadge';
import BatchTimeline from '../components/BatchTimeline';
import SolverFillPreview from '../components/SolverFillPreview';
import RiskDisclosurePanel from '../components/RiskDisclosurePanel';
import AuditLogView from '../components/AuditLogView';
import BrandMark from '../components/BrandMark';
import NavigationBar from '../components/NavigationBar';

export default function HomePage() {
  const auditReportsUrl = process.env.NEXT_PUBLIC_AUDIT_REPORTS_URL;

  return (
    <main className="relative z-10 min-h-screen pb-20 pt-8 sm:pt-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 sm:px-6 lg:px-8">
        <NavigationBar variant="landing" />

        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-text-muted">Blind Bitcoin Intent Markets</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl lg:text-6xl">
              Private BTC execution on Starknet, without leaking the trade before it lands.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
              Encrypt the order, store it at the gateway, commit it from the wallet, and let solvers compete on price after the intent is in the batch.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/intent" className="rounded-xl bg-accent-primary px-6 py-3 text-center text-sm font-semibold text-white shadow-[0_0_28px_rgba(0,209,255,0.18)]">
                Open Intent Desk
              </Link>
              <Link href="/analytics" className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-center text-sm font-semibold text-text-secondary">
                View Batch Data
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <PrivacyModeBadge
                variant="public"
                description="Visible routing when speed matters more than concealment."
              />
              <PrivacyModeBadge
                variant="hiddenAmount"
                description="Hide order size while keeping the pair visible to solvers."
              />
              <PrivacyModeBadge
                variant="maxPrivacy"
                description="Hide both size and direction until the execution path is ready."
              />
            </div>
          </div>
          <div className="glass-card gradient-border overflow-hidden p-5">
            <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5">
              <div className="flex items-center justify-between gap-4">
                <BrandMark subtitle="How it works" />
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Example
                </span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Intent pair</p>
                  <p className="mt-2 text-xl font-semibold">BTC → USDC</p>
                  <p className="mt-1 text-sm text-text-secondary">Solver spread held until the batch closes.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Batch window</p>
                  <p className="mt-2 text-xl font-semibold">30 seconds</p>
                  <p className="mt-1 text-sm text-text-secondary">Wallet commit first, solver routing second.</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-text-muted">
                  <span>Execution steps</span>
                  <span>Hidden Amount mode</span>
                </div>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm text-text-secondary">
                    <span>Gateway storage</span>
                    <span className="text-text-primary">Encrypted</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm text-text-secondary">
                    <span>Wallet commit</span>
                    <span className="text-text-primary">On-chain</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm text-text-secondary">
                    <span>Solver competition</span>
                    <span className="text-text-primary">After close</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="intent-composer" className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <IntentComposer />
          <BatchTimeline />
        </section>

        <section id="risk-disclosure" className="grid gap-6 lg:grid-cols-3">
          <SolverFillPreview />
          <RiskDisclosurePanel />
          <AuditLogView />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {[
            { title: 'Ciphertext First', desc: 'The gateway receives encrypted payloads, not a plain order ticket.' },
            { title: 'Batch Auction', desc: 'Orders collect inside short windows, then solvers compete on the filled route.' },
            { title: 'BTC-Focused Flow', desc: 'Built for BTC pairs, bridge-aware settlement, and Starknet execution.' }
          ].map((item) => (
            <div key={item.title} className="glass-card glass-card-hover p-6">
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{item.desc}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Encrypt and submit',
              description: 'Create the intent locally, encrypt it for the gateway, and store the ciphertext off-chain.',
            },
            {
              step: '02',
              title: 'Commit from the wallet',
              description: 'The wallet sends the on-chain commit, so the user still controls the transaction boundary.',
            },
            {
              step: '03',
              title: 'Clear and settle',
              description: 'After the batch closes, solvers compete and the settlement path is recorded for review.',
            },
          ].map((item) => (
            <div key={item.step} className="glass-card p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-text-muted">{item.step}</p>
              <h3 className="mt-3 text-2xl font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-text-secondary">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col items-center justify-between gap-6 rounded-[24px] border border-white/10 bg-white/5 px-6 py-8 text-center sm:px-8 lg:flex-row lg:text-left">
          <div>
            <h3 className="text-2xl font-semibold">Ready to route your BTC intent?</h3>
            <p className="mt-2 text-sm text-text-secondary">Connect the wallet, commit on-chain, and monitor the batch from one desk.</p>
          </div>
          <Link href="/dashboard" className="rounded-xl bg-accent-primary px-6 py-3 text-sm font-semibold text-white">
            Launch Dashboard
          </Link>
        </section>

        <footer className="border-t border-white/10 pt-6 text-xs text-text-muted">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <BrandMark subtitle="Blind BTC intent protocol" />
            <div className="flex flex-wrap gap-4">
              <Link href="/intent">Intent Desk</Link>
              <Link href="/analytics">Analytics</Link>
              {auditReportsUrl ? (
                <a href={auditReportsUrl} target="_blank" rel="noreferrer">Audit Reports</a>
              ) : (
                <Link href="#risk-disclosure">Audit Reports</Link>
              )}
              <Link href="/dashboard#intent-history">Status</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
