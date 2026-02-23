'use client';

import { motion } from 'framer-motion';

export default function SolverFillPreview() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass-card glass-card-hover p-6"
    >
      <h3 className="text-lg font-semibold">Estimated Fill</h3>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex justify-between text-xs text-text-muted">
          <span>Min</span>
          <span>Expected</span>
          <span>Max</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span>—</span>
          <span className="text-accent-primary">—</span>
          <span>—</span>
        </div>
        <div className="mt-4 h-2 rounded-full bg-white/5">
          <div className="h-2 w-[0%] rounded-full bg-accent-success" />
        </div>
        <div className="mt-4 text-xs text-text-secondary">
          vs AMM: —
        </div>
        <div className="text-xs text-text-muted">Solver fee: —</div>
      </div>

      <p className="mt-4 text-xs text-text-muted">⚠ This is an estimate.</p>
    </motion.section>
  );
}
