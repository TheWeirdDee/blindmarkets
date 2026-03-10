import DocsLayout from '@/components/DocsLayout';

export const metadata = {
  title: 'BlindMarkets Docs',
  description: 'Documentation for traders, developers, and solvers.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DocsLayout>{children}</DocsLayout>;
}
