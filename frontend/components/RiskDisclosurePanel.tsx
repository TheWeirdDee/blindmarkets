'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

export default function RiskDisclosurePanel() {
  const bridgeRisk = process.env.NEXT_PUBLIC_BRIDGE_RISK ?? '—';
  const custodyModel = process.env.NEXT_PUBLIC_CUSTODY_MODEL ?? '—';
  const settlementTime = process.env.NEXT_PUBLIC_SETTLEMENT_TIME ?? '—';
  const settlementNote = process.env.NEXT_PUBLIC_SETTLEMENT_NOTE ?? '';
  const auditReportsUrl = process.env.NEXT_PUBLIC_AUDIT_REPORTS_URL ?? '';
  const [showRisks, setShowRisks] = useState(false);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass-card glass-card-hover p-6"
    >
      <div className="flex items-center gap-2">
        <span>⚠</span>
        <h3 className="text-lg font-semibold">Risk Disclosure</h3>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Bridge</span>
          <span className="text-accent-warning">{bridgeRisk}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Custody</span>
          <span>{custodyModel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Settlement Time</span>
          <span>{settlementTime}</span>
        </div>
        {settlementNote && (
          <p className="text-xs text-text-muted">{settlementNote}</p>
        )}
      </div>

      <button
        onClick={() => setShowRisks((prev) => !prev)}
        className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-text-secondary"
      >
        {showRisks ? 'What could go wrong? ▴' : 'What could go wrong? ▾'}
      </button>
      {showRisks && (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-text-secondary">
          Bridge risk, solver failure risk, and settlement timing risk can affect outcomes. Review terms before execution.
        </div>
      )}
      {auditReportsUrl ? (
        <a
          href={auditReportsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block w-full rounded-xl bg-white/10 px-4 py-2 text-center text-xs text-text-secondary"
        >
          View audit reports →
        </a>
      ) : (
        <a href="/analytics" className="mt-3 block w-full rounded-xl bg-white/10 px-4 py-2 text-center text-xs text-text-secondary">
          View audit reports →
        </a>
      )}
    </motion.section>
  );
}
