'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Clock, Crosshair, ShieldAlert } from 'lucide-react';

const MOBILE_LINKS = [
  { href: '/desk', label: 'Desk', icon: Crosshair },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/risk', label: 'Risk', icon: ShieldAlert },
];

export default function MobileTabNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-bg-base/95 px-2 py-2 backdrop-blur md:hidden">
      <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-2">
        {MOBILE_LINKS.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] ${
                isActive ? 'bg-white/10 text-text-primary' : 'text-text-secondary'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
