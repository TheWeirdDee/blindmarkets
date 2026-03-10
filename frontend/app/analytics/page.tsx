import ExecutionChart from '../../components/ExecutionChart';
import NavigationBar from '../../components/NavigationBar';
import RiskDisclosurePanel from '../../components/RiskDisclosurePanel';

export default function AnalyticsPage() {
  return (
    <main className="relative z-10 min-h-screen pb-16 pt-5 sm:pt-7">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <NavigationBar variant="app" />
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Analytics</p>
          <h1 className="text-3xl font-semibold">Batch Performance</h1>
        </header>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <ExecutionChart />
          <RiskDisclosurePanel />
        </section>
      </div>
    </main>
  );
}
