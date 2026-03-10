import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body>
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  );
}
