'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/20">
              K
            </div>
            <span className="text-xl font-bold tracking-tight text-white bg-clip-text">
              Kealvi<span className="text-indigo-500">.</span>
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-sm">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
                  {user.isAdmin ? (
                    <ShieldAlert className="h-3.5 w-3.5 text-indigo-400" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                </div>
                <span className="max-w-[120px] truncate font-medium text-zinc-200">
                  {user.name}
                </span>
                
                {user.isAdmin && (
                  <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                    Mod
                  </span>
                )}
                {user.isGuest && !user.isAdmin && (
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 border border-zinc-700">
                    Guest
                  </span>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-border hover:border-red-500/30 bg-background hover:bg-red-500/10 px-3 py-1.5 text-sm text-zinc-400 hover:text-red-400 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
