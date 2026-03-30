import type { Metadata } from 'next';
import './globals.css';
import { ScrollToTop } from '@/components/ScrollToTop';
import StoreHydrator from '@/components/StoreHydrator';

export const metadata: Metadata = {
  title: 'BlindMarkets',
  description: 'Private Bitcoin intent execution on Starknet. Submit encrypted orders, commit from your wallet, let solvers compete on price after the batch closes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <StoreHydrator />
        <ScrollToTop />
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  );
}
