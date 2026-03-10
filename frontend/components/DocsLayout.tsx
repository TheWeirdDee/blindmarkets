'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-white/8 px-4 py-8 sticky top-0 h-screen overflow-y-auto">
        <Link href="/docs" className="text-sm font-semibold text-white mb-8 block">
          BlindMarkets Docs
        </Link>
        {nav.map((group) => (
          <div key={group.section} className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2 px-2">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.links.map((link) => {
                const active = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`block px-2 py-1.5 rounded-lg text-sm transition-colors ${
                        active
                          ? 'bg-white/10 text-white font-medium'
                          : 'text-white/50 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 px-6 md:px-12 py-12 max-w-3xl">
        {children}
      </main>
    </div>
  );
}
