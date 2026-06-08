'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background items-center justify-center">
        <LoadingSpinner size="lg" />
        <span className="text-zinc-500 text-sm mt-4 font-medium animate-pulse">Loading session...</span>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row px-4 sm:px-6 lg:px-8 py-6 gap-6">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <div className="h-full rounded-2xl border border-border/40 bg-secondary/10 p-4 sm:p-6 min-h-[calc(100vh-10rem)]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
