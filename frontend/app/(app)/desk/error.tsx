'use client';

type DeskErrorProps = {
  error: Error;
  reset: () => void;
};

export default function DeskError({ error, reset }: DeskErrorProps) {
  return (
    <div className="glass-card space-y-4 p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Desk Error</p>
      <p className="text-sm text-text-secondary">
        {error.message || 'Failed to load the trading desk.'}
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
