'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

const nav = [
  {
    section: 'Overview',
    links: [
      { href: '/docs', label: 'Introduction' },
      { href: '/docs/how-it-works', label: 'How It Works' },
    ],
  },
  {
    section: 'For Traders',
    links: [
      { href: '/docs/traders', label: 'Placing an Order' },
      { href: '/docs/privacy', label: 'Privacy Modes' },
    ],
  },
  {
    section: 'For Developers',
    links: [
      { href: '/docs/sdk', label: 'TypeScript SDK' },
      { href: '/docs/api', label: 'API Reference' },
      { href: '/docs/self-hosting', label: 'Self-Hosting' },
    ],
  },
  {
    section: 'Contracts',
    links: [
      { href: '/docs/contracts', label: 'Deployed Addresses' },
    ],
  },
];

// X (Twitter) logo as inline SVG — lucide-react doesn't have the new X mark
function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col h-full">
      {/* Logo / back link */}
      <div className="mb-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mb-3"
          onClick={onLinkClick}
        >
          <ArrowLeft size={12} />
          Back to app
        </Link>
        <Link
          href="/docs"
          onClick={onLinkClick}
          className="flex items-center gap-2 no-underline group"
        >
          {/* Brand icon */}
          <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true">
            <defs>
              <linearGradient id="dl-bg" x1="8" x2="56" y1="8" y2="56" gradientUnits="userSpaceOnUse">
                <stop stopColor="#09131c"/>
                <stop offset="1" stopColor="#121212"/>
              </linearGradient>
              <linearGradient id="dl-stroke" x1="10" x2="54" y1="12" y2="52" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00d1ff"/>
                <stop offset="1" stopColor="#ff9f1c"/>
              </linearGradient>
            </defs>
            <rect x="4" y="4" width="56" height="56" rx="18" fill="url(#dl-bg)" stroke="url(#dl-stroke)" strokeWidth="2"/>
            <path d="M12 32C18.4 22.4 25.4 17.6 32 17.6C38.6 17.6 45.6 22.4 52 32" fill="none" stroke="#e9f9ff" strokeLinecap="round" strokeWidth="3" opacity="0.92"/>
            <path d="M12 32C18.4 41.6 25.4 46.4 32 46.4C38.6 46.4 45.6 41.6 52 32" fill="none" stroke="#7bdfff" strokeLinecap="round" strokeWidth="3" opacity="0.72"/>
            <rect x="24" y="24" width="4" height="16" rx="2" fill="#00d1ff"/>
            <rect x="30" y="18" width="4" height="28" rx="2" fill="#f5f5f5"/>
            <rect x="36" y="24" width="4" height="16" rx="2" fill="#ff9f1c"/>
          </svg>
          <span className="text-sm font-semibold text-text-primary group-hover:text-white transition-colors">
            BlindMarkets
          </span>
        </Link>
      </div>

      {/* Nav groups */}
      <div className="flex-1">
        {nav.map((group) => (
          <div key={group.section} className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2 px-2">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.links.map((link) => {
                const active = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onLinkClick}
                      className={`block px-2 py-1.5 rounded-lg text-sm transition-colors ${
                        active
                          ? 'font-medium'
                          : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
                      }`}
                      style={active ? { color: 'var(--accent-primary)', background: 'rgba(0,209,255,0.06)' } : {}}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="pt-4 mt-2 flex items-center gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <a
          href="https://x.com/blindmarkets"
          target="_blank"
          rel="noreferrer"
          className="text-text-muted hover:text-text-primary transition-colors"
          aria-label="@blindmarkets on X"
        >
          <XIcon size={14} />
        </a>
        <a
          href="https://github.com/winsznx/blindmarkets"
          target="_blank"
          rel="noreferrer"
          className="text-text-muted hover:text-text-primary transition-colors text-xs"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row pt-8 sm:pt-10">

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 mx-2 mb-4 glass-card rounded-2xl">
        <Link href="/docs" className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 64 64" aria-hidden="true">
            <defs>
              <linearGradient id="dm-bg" x1="8" x2="56" y1="8" y2="56" gradientUnits="userSpaceOnUse">
                <stop stopColor="#09131c"/>
                <stop offset="1" stopColor="#121212"/>
              </linearGradient>
              <linearGradient id="dm-stroke" x1="10" x2="54" y1="12" y2="52" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00d1ff"/>
                <stop offset="1" stopColor="#ff9f1c"/>
              </linearGradient>
            </defs>
            <rect x="4" y="4" width="56" height="56" rx="18" fill="url(#dm-bg)" stroke="url(#dm-stroke)" strokeWidth="2"/>
            <path d="M12 32C18.4 22.4 25.4 17.6 32 17.6C38.6 17.6 45.6 22.4 52 32" fill="none" stroke="#e9f9ff" strokeLinecap="round" strokeWidth="3" opacity="0.92"/>
            <path d="M12 32C18.4 41.6 25.4 46.4 32 46.4C38.6 46.4 45.6 41.6 52 32" fill="none" stroke="#7bdfff" strokeLinecap="round" strokeWidth="3" opacity="0.72"/>
            <rect x="24" y="24" width="4" height="16" rx="2" fill="#00d1ff"/>
            <rect x="30" y="18" width="4" height="28" rx="2" fill="#f5f5f5"/>
            <rect x="36" y="24" width="4" height="16" rx="2" fill="#ff9f1c"/>
          </svg>
          <span className="text-sm font-semibold text-text-primary">Docs</span>
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="text-text-muted hover:text-text-primary transition-colors text-sm"
        >
          {mobileOpen ? 'Close ✕' : '☰ Menu'}
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden mx-2 mb-4 glass-card rounded-2xl px-4 py-6">
          <SidebarContent onLinkClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 sticky top-10 h-[calc(100vh-2.5rem)] overflow-y-auto px-4 py-6 border-r"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <SidebarContent />
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 px-4 sm:px-8 md:px-12 pb-24">
        {children}
      </main>
    </div>
  );
}
