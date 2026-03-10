type CalloutType = 'note' | 'tip' | 'warning' | 'danger';

const configs: Record<CalloutType, { label: string; icon: string; bg: string; border: string; iconColor: string; labelColor: string }> = {
  note: {
    label: 'Note',
    icon: 'ℹ',
    bg: 'rgba(0,209,255,0.05)',
    border: 'rgba(0,209,255,0.2)',
    iconColor: '#00d1ff',
    labelColor: '#7bdfff',
  },
  tip: {
    label: 'Tip',
    icon: '✦',
    bg: 'rgba(34,197,94,0.05)',
    border: 'rgba(34,197,94,0.2)',
    iconColor: '#22c55e',
    labelColor: '#4ade80',
  },
  warning: {
    label: 'Warning',
    icon: '⚠',
    bg: 'rgba(251,146,60,0.05)',
    border: 'rgba(251,146,60,0.2)',
    iconColor: '#fb923c',
    labelColor: '#fdba74',
  },
  danger: {
    label: 'Danger',
    icon: '✕',
    bg: 'rgba(239,68,68,0.05)',
    border: 'rgba(239,68,68,0.2)',
    iconColor: '#ef4444',
    labelColor: '#f87171',
  },
};

export function DocCallout({
  type = 'note',
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}) {
  const c = configs[type];
  return (
    <div
      className="not-prose my-5 rounded-xl px-4 py-3.5 text-sm leading-relaxed"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="flex gap-2.5 items-start">
        <span className="shrink-0 mt-0.5 text-base leading-none" style={{ color: c.iconColor }}>
          {c.icon}
        </span>
        <div>
          {title ? (
            <p className="font-semibold mb-1" style={{ color: c.labelColor }}>{title}</p>
          ) : (
            <span className="font-semibold mr-1.5" style={{ color: c.labelColor }}>{c.label}</span>
          )}
          <span className="text-white/60">{children}</span>
        </div>
      </div>
    </div>
  );
}
