'use client';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  const [selectedIntentIds, setSelectedIntentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showLookup, setShowLookup] = useState(false);
  const [lookupId, setLookupId] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const lookupInputRef = useRef<HTMLInputElement>(null);

  const statusQuery = useMemo(() => {
    if (statusFilter === 'All') {
      return null;
    }
    return statusFilter.toUpperCase().replace(/\s+/g, '_');
  }, [statusFilter]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIntentIds.includes(item.intent_id)),
    [items, selectedIntentIds]
  );

  useEffect(() => {
    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
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
    intervalId = setInterval(run, 10000);
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [statusQuery]);

  useEffect(() => {
    setSelectedIntentIds((current) => current.filter((id) => items.some((item) => item.intent_id === id)));
  }, [items]);

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
            onClick={() => {
              setShowLookup((prev) => !prev);
              setLookupId('');
              setActionMessage(null);
              if (!showLookup) {
                setTimeout(() => lookupInputRef.current?.focus(), 50);
              }
            }}
            className={`rounded-lg border px-3 py-2 text-xs text-text-secondary ${showLookup ? 'border-accent-primary/50 bg-accent-primary/10' : 'border-white/10 bg-white/5'}`}
          >
            Lookup
          </button>
        </div>
      </div>

      {showLookup && (
        <div className="mt-3 flex items-center gap-2">
          <input
            ref={lookupInputRef}
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                await runLookup(lookupId, setActionMessage, setIsLookingUp);
              }
              if (e.key === 'Escape') {
                setShowLookup(false);
              }
            }}
            placeholder="Intent ID (0x...)"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent-primary/50"
          />
          <button
            disabled={!lookupId.trim() || isLookingUp}
            onClick={() => runLookup(lookupId, setActionMessage, setIsLookingUp)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary disabled:opacity-40"
          >
            {isLookingUp ? '...' : 'Go'}
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {['All', 'Awaiting Onchain', 'Pending', 'Auction', 'Settled', 'Canceled', 'Onchain Failed'].map((filter) => (
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

      <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/4">
        {isLoading && (
          <div className="px-4 py-3 text-sm text-text-secondary">Loading intents...</div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="px-4 py-3 text-sm text-text-secondary">No intents found.</div>
        )}
        {!isLoading && items.length > 0 ? (
          <div className="max-h-[19rem] space-y-2 overflow-y-auto p-2">
            {items.map((intent) => {
              const isSelected = selectedIntentIds.includes(intent.intent_id);
              return (
                <button
                  key={intent.intent_id}
                  type="button"
                  onClick={() => {
                    setSelectedIntentIds((current) =>
                      current.includes(intent.intent_id)
                        ? current.filter((id) => id !== intent.intent_id)
                        : [...current, intent.intent_id]
                    );
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? 'border-accent-primary/60 bg-accent-primary/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-4 w-4 rounded-full border ${
                        isSelected ? 'border-accent-primary bg-accent-primary' : 'border-white/20'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm text-text-primary">
                          {truncateHex(intent.intent_id, 10)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-text-secondary">
                          {formatStatusLabel(intent.status)}
                        </span>
                        <span className="text-xs text-text-muted">Batch {intent.batch_id}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                        <span>User {truncateHex(intent.user_address, 8)}</span>
                        <span>{formatRelativeTime(intent.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Selected Intents</p>
            <p className="mt-1 text-xs text-text-secondary">
              Select rows to inspect or copy their IDs. Gateway decryption stays solver-side.
            </p>
          </div>
          {selectedIntentIds.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelectedIntentIds([])}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary"
            >
              Clear
            </button>
          ) : null}
        </div>

        {selectedItems.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">No intents selected yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {selectedItems.map((intent) => (
              <div
                key={intent.intent_id}
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-xs text-text-secondary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Intent ID</p>
                    <p
                      className="mt-1 break-all font-mono text-[11px] leading-relaxed text-text-primary"
                      title={intent.intent_id}
                    >
                      {intent.intent_id}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 uppercase tracking-[0.16em] text-[10px]">
                    {formatStatusLabel(intent.status)}
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  <div className="rounded-lg border border-white/8 bg-white/5 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">User</p>
                    <p
                      className="mt-1 break-all font-mono text-[11px] leading-relaxed text-text-secondary"
                      title={intent.user_address}
                    >
                      {intent.user_address}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[11px] text-text-muted">
                    <span>Batch {intent.batch_id}</span>
                    <span>{formatRelativeTime(intent.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={selectedIntentIds.length === 0}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(selectedIntentIds.join('\n'));
              setActionMessage(`Copied ${selectedIntentIds.length} intent ID${selectedIntentIds.length === 1 ? '' : 's'}.`);
            } catch {
              setActionMessage('Failed to copy selected intent IDs.');
            }
          }}
          className="mt-4 w-full rounded-xl bg-white/10 px-4 py-3 text-xs text-text-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          Copy selected intent IDs
        </button>
      </div>
      {actionMessage && (
        <p className="mt-2 text-xs text-text-muted">{actionMessage}</p>
      )}
    </motion.section>
  );
}

async function runLookup(
  intentId: string,
  setActionMessage: (msg: string | null) => void,
  setIsLookingUp: (v: boolean) => void,
) {
  const trimmed = intentId.trim();
  if (!trimmed) return;
  setIsLookingUp(true);
  setActionMessage(null);
  try {
    const response = await fetch(`/api/gateway/intents/${trimmed}`);
    if (!response.ok) {
      setActionMessage(`Intent ${trimmed} not found.`);
      return;
    }
    const payload = await response.json();
    setActionMessage(`${trimmed}: ${payload.status ?? 'unknown'} — batch ${payload.batch_id ?? '—'}`);
  } catch {
    setActionMessage('Failed to query intent status.');
  } finally {
    setIsLookingUp(false);
  }
}

function formatRelativeTime(value: string): string {
  const parsed = parseGatewayTimestamp(value);
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

function parseGatewayTimestamp(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return Number.NaN;
  }

  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  if (/([zZ]|[+-]\d{2}:\d{2})$/.test(normalized)) {
    return Date.parse(normalized);
  }

  return Date.parse(`${normalized}Z`);
}

function formatStatusLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function truncateHex(value: string, visible: number): string {
  if (value.length <= visible * 2 + 2) {
    return value;
  }
  return `${value.slice(0, visible)}…${value.slice(-visible)}`;
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
