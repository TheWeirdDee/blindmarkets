import NavigationBar from './NavigationBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative z-10 min-h-screen pb-16 pt-8 sm:pt-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <NavigationBar variant="app" />
        {children}
      </div>
    </main>
  );
}
