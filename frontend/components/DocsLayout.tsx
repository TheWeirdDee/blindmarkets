'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

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

function SidebarNav({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <Link
        href="/docs"
        onClick={onLinkClick}
        className="text-sm font-semibold text-text-primary mb-8 block"
      >
        BlindMarkets Docs
      </Link>
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
    </>
  );
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row pt-8 sm:pt-10">

      {/* Mobile top bar */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3 mx-2 mb-4 glass-card rounded-2xl"
      >
        <span className="text-sm font-semibold text-text-primary">Docs</span>
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
          <SidebarNav onLinkClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 sticky top-10 h-[calc(100vh-2.5rem)] overflow-y-auto px-4 py-6 border-r"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <SidebarNav />
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 px-4 sm:px-8 md:px-12 pb-24">
        {children}
      </main>
    </div>
  );
}
