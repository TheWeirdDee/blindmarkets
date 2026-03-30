import PublicFooter from '@/components/layout/PublicFooter';
import PublicNav from '@/components/layout/PublicNav';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <PublicNav />
      {children}
      <PublicFooter />
    </div>
  );
}
