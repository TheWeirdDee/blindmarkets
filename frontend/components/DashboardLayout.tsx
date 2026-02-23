import NavigationBar from './NavigationBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-8">
      <NavigationBar />
      {children}
    </div>
  );
}
