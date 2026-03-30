'use client';

type RootErrorProps = {
  error: Error;
  reset: () => void;
};

export default function RootError({ error, reset }: RootErrorProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Application Error</p>
      <h1 className="text-2xl font-semibold text-text-primary">Something went wrong</h1>
      <p className="max-w-xl text-sm text-text-secondary">
        {error.message || 'The app failed to load this route.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white"
      >
        Retry
      </button>
    </main>
  );
}
