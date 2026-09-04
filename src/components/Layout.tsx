import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/sonner';

export function Layout() {
  return (
    <div className="h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6"><Outlet /></main>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
