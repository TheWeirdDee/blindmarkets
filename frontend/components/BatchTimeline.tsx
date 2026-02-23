'use client';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type BatchListItem = {
  batch_id: string;
  close_time: number;
  intent_count: number;
  auction_deadline: number;
  status: string;
  created_at: string;
  settled_at?: string | null;
  failure_reason?: string | null;
  failed_at?: string | null;
};

type BatchListResponse = {
  batches: BatchListItem[];
  limit: number;
  offset: number;
};

export default function BatchTimeline() {
  const [latestBatch, setLatestBatch] = useState<BatchListItem | null>(null);
  const [recentBatches, setRecentBatches] = useState<BatchListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [timing, setTiming] = useState<{ label: string; progressPercent: number }>({
    label: '—',
    progressPercent: 0,
  });

  useEffect(() => {
    let isMounted = true;
    setTiming(computeNextBatchTiming());
    const interval = setInterval(() => {
      setTiming(computeNextBatchTiming());
    }, 1000);
    const run = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/gateway/batches?limit=5');
        if (!response.ok) {
          return;
        }
        const data: BatchListResponse = await response.json();
        if (isMounted) {
          setLatestBatch(data.batches?.[0] ?? null);
          setRecentBatches(data.batches ?? []);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    run();
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass-card glass-card-hover p-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Next Batch</h3>
        <span className="text-sm text-text-secondary">
          ⏱ {timing.label}
        </span>
      </div>

      <div className="mt-4 h-2 rounded-full bg-white/5">
        <div className={`h-2 rounded-full bg-accent-primary ${progressWidthClass(timing.progressPercent)}`} />
      </div>
      <p className="mt-2 text-xs text-text-muted">
        {timing.progressPercent}% elapsed
      </p>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-text-muted">
          {latestBatch ? `Last Batch #${latestBatch.batch_id}` : 'Last Batch'}
        </p>
        {isLoading && (
          <p className="mt-3 text-sm text-text-secondary">Loading batch data...</p>
        )}
        {!isLoading && latestBatch && (
          <ul className="mt-3 space-y-1 text-sm text-text-secondary">
            <li>• {latestBatch.intent_count} intents</li>
            <li>• Status: {formatBatchStatus(latestBatch)}</li>
            <li>• Closed {formatRelativeTime(latestBatch.close_time)}</li>
            {latestBatch.failed_at && (
              <li>• Failed {formatRelativeTime(toEpochSeconds(latestBatch.failed_at))}</li>
            )}
          </ul>
        )}
        {!isLoading && !latestBatch && (
          <p className="mt-3 text-sm text-text-secondary">No batch history yet.</p>
        )}
      </div>

      <button
        onClick={() => setShowHistory((prev) => !prev)}
        className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-text-secondary"
      >
        Recent Batches {showHistory ? '▴' : '▾'}
      </button>

      {showHistory && (
        <div className="mt-3 space-y-2">
          {recentBatches.map((batch) => (
            <div
              key={batch.batch_id}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary"
            >
              <div className="flex items-center justify-between">
                <span>Batch #{batch.batch_id}</span>
                <span>{batch.intent_count} intents</span>
              </div>
              <div className="mt-1 text-[11px] text-text-muted">
                Closed {formatRelativeTime(batch.close_time)} · {formatBatchStatus(batch)}
              </div>
            </div>
          ))}
          {!isLoading && recentBatches.length === 0 && (
            <p className="text-xs text-text-muted">No batch history yet.</p>
          )}
        </div>
      )}
    </motion.section>
  );
}

function computeNextBatchTiming(): { label: string; progressPercent: number } {
  const windowSeconds = Number(process.env.NEXT_PUBLIC_BATCH_WINDOW_SECONDS ?? 0);
  const genesisTimestamp = Number(process.env.NEXT_PUBLIC_GENESIS_TIMESTAMP ?? 0);
  if (!windowSeconds || !genesisTimestamp) {
    return { label: '—', progressPercent: 0 };
  }

  const now = Math.floor(Date.now() / 1000);
  const elapsed = Math.max(0, now - genesisTimestamp);
  const position = elapsed % windowSeconds;
  const remaining = windowSeconds - position;
  const progress = Math.min(100, Math.max(0, Math.floor((position / windowSeconds) * 100)));
  return { label: `${remaining}s`, progressPercent: progress };
}

function progressWidthClass(progressPercent: number): string {
  const bucket = Math.max(0, Math.min(10, Math.round(progressPercent / 10)));
  const classes = [
    'w-[0%]',
    'w-[10%]',
    'w-[20%]',
    'w-[30%]',
    'w-[40%]',
    'w-[50%]',
    'w-[60%]',
    'w-[70%]',
    'w-[80%]',
    'w-[90%]',
    'w-[100%]'
  ];
  return classes[bucket];
}

function formatRelativeTime(epochSeconds: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - epochSeconds);
  if (diff < 60) {
    return `${diff}s ago`;
  }
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatBatchStatus(batch: BatchListItem): string {
  if (batch.status.toUpperCase() === 'FAILED') {
    return batch.failure_reason ? `FAILED (${batch.failure_reason})` : 'FAILED';
  }
  return batch.status;
}

function toEpochSeconds(value: string | number | null | undefined): number {
  if (!value) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) {
    return asNumber;
  }
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) {
    return Math.floor(parsed / 1000);
  }
  return 0;
}
