import Link from 'next/link';
import IntentComposer from '../../components/IntentComposer';
import BatchTimeline from '../../components/BatchTimeline';
import SolverFillPreview from '../../components/SolverFillPreview';
import RiskDisclosurePanel from '../../components/RiskDisclosurePanel';
import AuditLogView from '../../components/AuditLogView';
import WalletConnect from '../../components/WalletConnect';

export default function DashboardPage() {
  return (
    <main className="min-h-screen px-6 pb-16 pt-10 md:px-12 lg:px-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Dashboard</p>
          <h1 className="text-3xl font-semibold">Execution Control Center</h1>
        </div>
        <Link href="/intent" className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white">
          Create Intent
        </Link>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <IntentComposer />
        <div id="wallets" className="space-y-6">
          <BatchTimeline />
          <WalletConnect />
        </div>
      </section>

      <section id="intent-history" className="mt-10 grid gap-6 lg:grid-cols-3">
        <SolverFillPreview />
        <RiskDisclosurePanel />
        <AuditLogView />
      </section>
    </main>
  );
}
