import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import MobileTabNav from '@/components/layout/MobileTabNav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col md:pl-16 xl:pl-[220px]">
        <AppHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-[76px] sm:px-6 md:pb-8">
          {children}
        </main>
        <MobileTabNav />
      </div>
    </div>
  );
}
