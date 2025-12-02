'use client';

import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '@/hooks/useAuth';
import { redirect } from 'next/navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  if (!user && !loading) redirect('/login');
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="lg:ml-64">
        <Header user={user} logout={logout}/>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

