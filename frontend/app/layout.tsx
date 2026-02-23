import './globals.css';

export const metadata = {
  title: 'BlindMarkets Protocol',
  description: 'Private, MEV-resistant Bitcoin intent execution on Starknet.'
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
