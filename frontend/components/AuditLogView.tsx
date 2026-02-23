'use client';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

type IntentListItem = {
  intent_id: string;
  user_address: string;
  status: string;
  batch_id: string;
  created_at: string;
};

type IntentListResponse = {
  intents: IntentListItem[];
  limit: number;
  offset: number;
};

export default function AuditLogView() {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [items, setItems] = useState<IntentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const statusQuery = useMemo(() => {
    if (statusFilter === 'All') {
      return null;
    }
    return statusFilter.toUpperCase().replace(/\s+/g, '_');
  }, [statusFilter]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '10');
      if (statusQuery) {
        params.set('status', statusQuery);
      }
      try {
        const response = await fetch(`/api/gateway/intents?${params.toString()}`);
        if (!response.ok) {
          setItems([]);
          return;
        }
        const data: IntentListResponse = await response.json();
        if (isMounted) {
          setItems(data.intents ?? []);
        }
      } catch {
        if (isMounted) {
          setItems([]);
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
    };
  }, [statusQuery]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass-card glass-card-hover p-6"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-semibold">Intent History</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCsv(items)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary"
          >
            Export CSV
          </button>
          <button
            onClick={async () => {
              const intentId = window.prompt('Enter intent ID (0x...)');
              if (!intentId) {
                return;
              }
              try {
                const response = await fetch(`/api/gateway/intents/${intentId}`);
                if (!response.ok) {
                  setActionMessage(`Intent ${intentId} not found.`);
                  return;
                }
                const payload = await response.json();
                setActionMessage(`Intent ${intentId}: ${payload.status ?? 'unknown'} (batch ${payload.batch_id ?? '—'})`);
              } catch {
                setActionMessage('Failed to query intent status.');
              }
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary"
          >
            🔍
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {['All', 'Pending', 'Settled', 'Canceled', 'Onchain Failed'].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`rounded-full border px-3 py-1 text-text-secondary ${
              statusFilter === filter
                ? 'border-accent-primary/60 bg-accent-primary/10 text-text-primary'
                : 'border-white/10 bg-white/5'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
        <div className="grid grid-cols-5 gap-2 bg-white/5 px-4 py-2 text-xs text-text-muted">
          <span>ID</span>
          <span>User</span>
          <span>Batch</span>
          <span>Status</span>
          <span>Time</span>
        </div>
        {isLoading && (
          <div className="px-4 py-3 text-sm text-text-secondary">Loading intents...</div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="px-4 py-3 text-sm text-text-secondary">No intents found.</div>
        )}
        {items.map((intent) => (
          <div key={intent.intent_id} className="grid grid-cols-5 gap-2 px-4 py-3 text-sm text-text-secondary">
            <span className="truncate">{intent.intent_id}</span>
            <span className="truncate">{intent.user_address}</span>
            <span>{intent.batch_id}</span>
            <span>{intent.status}</span>
            <span>{formatRelativeTime(intent.created_at)}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          setActionMessage('Decryption is available in solver workflows. Opening intent composer.');
          window.location.href = '/intent';
        }}
        className="mt-4 w-full rounded-xl bg-white/10 px-4 py-3 text-xs text-text-secondary"
      >
        Decrypt selected intents
      </button>
      {actionMessage && (
        <p className="mt-2 text-xs text-text-muted">{actionMessage}</p>
      )}
    </motion.section>
  );
}

function formatRelativeTime(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  const diffMs = Date.now() - parsed;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) {
    return `${diffSec}s ago`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function downloadCsv(items: IntentListItem[]) {
  if (!items.length) {
    return;
  }
  const header = ['intent_id', 'user_address', 'status', 'batch_id', 'created_at'];
  const rows = items.map((item) => [
    item.intent_id,
    item.user_address,
    item.status,
    item.batch_id,
    item.created_at
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'intent-history.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
