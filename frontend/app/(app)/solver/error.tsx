'use client';

type SolverErrorProps = {
  error: Error;
  reset: () => void;
};

export default function SolverError({ error, reset }: SolverErrorProps) {
  return (
    <div className="glass-card space-y-4 p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Solver Error</p>
      <p className="text-sm text-text-secondary">
        {error.message || 'Failed to load solver desk.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white"
      >
        Retry
      </button>
    </div>
  );
}
