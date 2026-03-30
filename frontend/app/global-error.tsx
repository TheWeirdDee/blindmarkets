'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg-base text-text-primary">
        <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Global Error</p>
          <h1 className="text-2xl font-semibold">A critical app error occurred</h1>
          <p className="max-w-xl text-sm text-text-secondary">
            {error.message || 'An unrecoverable rendering error occurred.'}
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </main>
      </body>
    </html>
  );
}
