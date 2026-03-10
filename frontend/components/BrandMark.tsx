import clsx from 'clsx';
import { useId } from 'react';

type BrandMarkProps = {
  className?: string;
  showText?: boolean;
  title?: string;
  subtitle?: string;
  iconClassName?: string;
};

export default function BrandMark({
  className,
  showText = true,
  title = 'BlindMarkets',
  subtitle = 'Private BTC intents',
  iconClassName,
}: BrandMarkProps) {
  const iconId = useId().replace(/:/g, '');
  const backgroundId = `${iconId}-bg`;
  const strokeId = `${iconId}-stroke`;
  const barsId = `${iconId}-bars`;

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className={clsx('h-11 w-11 shrink-0', iconClassName)}
      >
        <defs>
          <linearGradient id={backgroundId} x1="8" x2="56" y1="8" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#09131c" />
            <stop offset="1" stopColor="#121212" />
          </linearGradient>
          <linearGradient id={strokeId} x1="10" x2="54" y1="12" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00d1ff" />
            <stop offset="1" stopColor="#ff9f1c" />
          </linearGradient>
          <linearGradient id={barsId} x1="24" x2="40" y1="18" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f5f5f5" />
            <stop offset="0.55" stopColor="#00d1ff" />
            <stop offset="1" stopColor="#ff9f1c" />
          </linearGradient>
        </defs>
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="18"
          fill={`url(#${backgroundId})`}
          stroke={`url(#${strokeId})`}
          strokeWidth="2"
        />
        <path
          d="M12 32C18.4 22.4 25.4 17.6 32 17.6C38.6 17.6 45.6 22.4 52 32"
          fill="none"
          opacity="0.92"
          stroke="#e9f9ff"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d="M12 32C18.4 41.6 25.4 46.4 32 46.4C38.6 46.4 45.6 41.6 52 32"
          fill="none"
          opacity="0.72"
          stroke="#7bdfff"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d="M21 44L43 20"
          fill="none"
          opacity="0.38"
          stroke="#ff9f1c"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <rect x="24" y="24" width="4" height="16" rx="2" fill={`url(#${barsId})`} />
        <rect x="30" y="18" width="4" height="28" rx="2" fill="#f5f5f5" />
        <rect x="36" y="24" width="4" height="16" rx="2" fill={`url(#${barsId})`} />
      </svg>
      {showText ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-[0.08em] text-text-primary">
            {title}
          </p>
          <p className="truncate text-[11px] uppercase tracking-[0.24em] text-text-muted">
            {subtitle}
          </p>
        </div>
      ) : null}
    </div>
  );
}
