import IntentComposer from '../../components/IntentComposer';
import SolverFillPreview from '../../components/SolverFillPreview';
import RiskDisclosurePanel from '../../components/RiskDisclosurePanel';

export default function IntentPage() {
  return (
    <main className="min-h-screen px-6 pb-16 pt-10 md:px-12 lg:px-20">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Intent Creation</p>
        <h1 className="text-3xl font-semibold">Compose a Private Intent</h1>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <IntentComposer />
        <div className="space-y-6">
          <SolverFillPreview />
          <RiskDisclosurePanel />
        </div>
      </section>
    </main>
  );
}
