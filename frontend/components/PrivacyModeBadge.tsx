import clsx from 'clsx';

const variants = {
  public: {
    label: 'Public',
    icon: '🔓',
    color: 'text-text-muted',
    bg: 'bg-white/5'
  },
  hiddenAmount: {
    label: 'Hidden Amount',
    icon: '🔒',
    color: 'text-accent-warning',
    bg: 'bg-yellow-500/10'
  },
  maxPrivacy: {
    label: 'Max Privacy',
    icon: '🔐',
    color: 'text-accent-success',
    bg: 'bg-emerald-500/10'
  }
};

export type PrivacyModeBadgeProps = {
  variant: keyof typeof variants;
  description: string;
};

export default function PrivacyModeBadge({ variant, description }: PrivacyModeBadgeProps) {
  const config = variants[variant];

  return (
    <div className={clsx('glass-card glass-card-hover p-4', config.bg)}>
      <div className="flex items-center gap-3">
        <span className={clsx('text-lg', config.color)}>{config.icon}</span>
        <div>
          <p className="text-sm font-semibold">{config.label}</p>
          <p className="text-xs text-text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}
