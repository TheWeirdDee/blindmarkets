import ExecutionChart from '../../components/ExecutionChart';
import RiskDisclosurePanel from '../../components/RiskDisclosurePanel';

export default function AnalyticsPage() {
  return (
    <main className="min-h-screen px-6 pb-16 pt-10 md:px-12 lg:px-20">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Analytics</p>
        <h1 className="text-3xl font-semibold">Batch Performance</h1>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ExecutionChart />
        <RiskDisclosurePanel />
      </section>
    </main>
  );
}
