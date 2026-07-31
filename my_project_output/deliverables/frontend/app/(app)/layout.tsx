import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-[84px] flex-1 flex flex-col">
        <Header />
        <main className="p-6 md:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
