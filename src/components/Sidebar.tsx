'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, BarChart3, Shield, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = [
    {
      href: '/dashboard',
      label: 'Q&A Feed',
      icon: MessageSquare,
      exact: true,
    },
    {
      href: '/dashboard/polls',
      label: 'Polls',
      icon: BarChart3,
      exact: false,
    },
    {
      href: '/dashboard/admin',
      label: 'Admin Panel',
      icon: Shield,
      exact: false,
    },
  ];

  return (
    <aside className="w-full md:w-64 flex-shrink-0 md:border-r border-border bg-background p-4 md:py-6">
      <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
        {links.map((link) => {
          const Icon = link.icon;
          // Determine if active
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-secondary/50 border border-transparent'
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{link.label}</span>
              {link.label === 'Admin Panel' && user?.isAdmin && (
                <span className="ml-auto hidden md:inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-8 hidden md:block rounded-2xl border border-border bg-secondary/20 p-4">
        <div className="flex gap-2.5 items-start text-xs text-zinc-500">
          <Info className="h-4 w-4 text-zinc-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-zinc-400 mb-1">Real-time Session</p>
            <p className="leading-relaxed">Questions and poll answers update instantly for everyone connected.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
