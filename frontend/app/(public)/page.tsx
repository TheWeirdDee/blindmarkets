import Link from 'next/link';
import { Lock, LockOpen, ShieldCheck } from 'lucide-react';

const problemCards = [
  {
    title: 'Front-run before it lands',
    description: 'Public mempool visibility leaks pre-execution alpha.',
  },
  {
    title: 'No price improvement',
    description: 'AMM-first routing cannot compete with private solver auctions.',
  },
  {
    title: 'Sandwich attacks on size',
    description: 'Large BTC orders are systematically exploited in public flow.',
  },
];

const solutionBlocks = [
  {
    title: 'Ciphertext First',
    description:
      'Gateway receives AES-256-GCM encrypted payloads, so plaintext intent details stay client-side until settlement.',
  },
  {
    title: 'Batch Clearing',
    description:
      'Intents aggregate in deterministic 30-second windows, removing ordering edge as a structural advantage.',
  },
  {
    title: 'Competitive Solver Market',
    description:
      'Bonded solvers bid to clear the batch with best execution under user constraints and fee ceilings.',
  },
  {
    title: 'ZK Settlement',
    description:
      'Cairo settlement paths verify correctness on Starknet with objective constraint enforcement.',
  },
];

const privacyCards = [
  {
    title: 'Public',
    description: 'Pair, size, and direction visible from submission.',
    icon: LockOpen,
    color: 'text-privacy-public',
  },
  {
    title: 'Hidden Amount',
    description: 'Pair and direction visible, notional hidden until batch close.',
    icon: Lock,
    color: 'text-privacy-medium',
  },
  {
    title: 'Max Privacy',
    description: 'Size and direction hidden until execution.',
    icon: ShieldCheck,
    color: 'text-privacy-high',
  },
];

const riskRows = [
  { label: 'Bridge risk', value: 'Medium' },
  { label: 'Custody model', value: 'Multi-sig 7-of-10' },
  { label: 'Settlement time', value: '60-120 min' },
];

export default function PublicHomePage() {
  return (
    <main className="relative overflow-hidden pb-16">
      <section className="relative mx-auto mt-8 w-full max-w-7xl px-4 sm:px-6">
        <div className="glass-card p-6 sm:p-10">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-text-muted">
            Built on Starknet x Bitcoin
          </span>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">
            Private BTC execution on Starknet, without leaking the trade before it lands.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
            Encrypt the order, commit from the wallet, then let bonded solvers compete after the intent enters the batch window.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/desk" className="rounded-xl bg-accent-primary px-6 py-3 text-center text-sm font-semibold text-white">
              Open Intent Desk
            </Link>
            <Link href="/analytics" className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-center text-sm font-semibold text-text-secondary">
              View Batch Data
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Intent Preview</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-bg-surface p-4">
                <p className="text-xs text-text-muted">Pair</p>
                <p className="mt-1 text-lg font-semibold">BTC - USDC</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-bg-surface p-4">
                <p className="text-xs text-text-muted">Privacy</p>
                <p className="mt-1 text-lg font-semibold text-privacy-high">Max Privacy</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-bg-surface p-4">
                <p className="text-xs text-text-muted">Batch Window</p>
                <p className="mt-1 text-lg font-semibold">30s rolling</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6">
        <p className="text-xs uppercase tracking-[0.25em] text-text-muted">The Problem</p>
        <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">
          Every public mempool tells the market what you are about to do.
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {problemCards.map((card) => (
            <article key={card.title} className="glass-card p-5">
              <h3 className="text-lg font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6">
        <p className="text-xs uppercase tracking-[0.25em] text-text-muted">Solution</p>
        <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Execution privacy, by protocol design.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {solutionBlocks.map((block) => (
            <article key={block.title} className="glass-card p-5">
              <h3 className="text-xl font-semibold">{block.title}</h3>
              <p className="mt-2 text-sm leading-7 text-text-secondary">{block.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6">
        <h2 className="text-3xl font-semibold sm:text-4xl">Choose how much you reveal.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {privacyCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="glass-card p-5">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${card.color}`} />
                  <h3 className="text-lg font-semibold">{card.title}</h3>
                </div>
                <p className="mt-2 text-sm text-text-secondary">{card.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6">
        <h2 className="text-3xl font-semibold sm:text-4xl">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            'Encrypt and submit: create intent locally and store ciphertext at gateway.',
            'Commit from wallet: commitment hash lands on IntentRegistry on Starknet.',
            'Clear and settle: solvers bid, winner settles batch under contract checks.',
          ].map((step, index) => (
            <article key={step} className="glass-card p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Step {index + 1}</p>
              <p className="mt-2 text-sm leading-7 text-text-secondary">{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="risk" className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6">
        <div className="glass-card p-6">
          <h2 className="text-3xl font-semibold sm:text-4xl">We publish everything that can go wrong.</h2>
          <div className="mt-5 divide-y divide-white/10 rounded-xl border border-white/10">
            {riskRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-text-secondary">{row.label}</span>
                <span className="font-semibold text-text-primary">{row.value}</span>
              </div>
            ))}
          </div>
          <Link href="/docs/contracts" className="mt-5 inline-flex text-sm text-accent-primary">
            View audit reports
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6">
        <div className="glass-card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold">Ready to route your first BTC intent?</h2>
            <p className="mt-1 text-sm text-text-secondary">Connect, submit, and track settlement from one desk.</p>
          </div>
          <Link href="/desk" className="rounded-xl bg-accent-primary px-6 py-3 text-sm font-semibold text-white">
            Open Intent Desk
          </Link>
        </div>
      </section>
    </main>
  );
}
