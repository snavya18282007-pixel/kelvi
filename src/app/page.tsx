'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LandingPage() {
  const { user, loading, joinAsGuest } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user) {
      router.push('/dashboard');
    } else {
      // Auto-assign a random guest name and redirect to dashboard
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const guestName = `Guest #${randomId}`;
      
      joinAsGuest(guestName)
        .then(() => {
          router.push('/dashboard');
        })
        .catch(err => {
          console.error('Failed to auto-join as guest:', err);
        });
    }
  }, [user, loading, router, joinAsGuest]);

  return (
    <div className="flex min-h-screen flex-col bg-background items-center justify-center">
      <LoadingSpinner size="lg" />
      <span className="text-zinc-550 text-sm mt-4 font-medium animate-pulse">Entering Live Q&A Board...</span>
    </div>
  );
}
