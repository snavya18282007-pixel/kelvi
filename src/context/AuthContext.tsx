'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface UserSession {
  id: string;
  name: string;
  email?: string;
  isAdmin: boolean;
  isGuest: boolean;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  joinAsGuest: (nickname: string) => Promise<UserSession>;
  loginWithEmail: (email: string, password: string) => Promise<UserSession>;
  signUpWithEmail: (email: string, password: string, nickname: string) => Promise<void>;
  promoteToAdmin: (code: string) => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session on mount
  useEffect(() => {
    async function loadSession() {
      try {
        // 1. Check if we have an active Supabase Session
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const email = session.user.email || '';
            const nickname = session.user.user_metadata?.nickname || email.split('@')[0];
            
            // Check if saved admin passcode is valid
            const savedCode = localStorage.getItem('qa_admin_code');
            const adminCode = process.env.NEXT_PUBLIC_MODERATOR_CODE || 'admin123';
            const isAdmin = savedCode === adminCode;

            setUser({
              id: session.user.id,
              name: nickname,
              email: email,
              isAdmin: isAdmin,
              isGuest: false,
            });
            setLoading(false);
            return;
          }
        }

        // 2. Check local storage for Guest User
        const guestId = localStorage.getItem('qa_guest_id');
        const guestName = localStorage.getItem('qa_guest_name');
        if (guestId && guestName) {
          const savedCode = localStorage.getItem('qa_admin_code');
          const adminCode = process.env.NEXT_PUBLIC_MODERATOR_CODE || 'admin123';
          const isAdmin = savedCode === adminCode;

          setUser({
            id: guestId,
            name: guestName,
            isAdmin: isAdmin,
            isGuest: true,
          });
        }
      } catch (err) {
        console.error('Error loading session:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSession();

    // Listen to Auth changes if Supabase is available
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            const email = session.user.email || '';
            const nickname = session.user.user_metadata?.nickname || email.split('@')[0];
            const savedCode = localStorage.getItem('qa_admin_code');
            const adminCode = process.env.NEXT_PUBLIC_MODERATOR_CODE || 'admin123';
            
            setUser({
              id: session.user.id,
              name: nickname,
              email: email,
              isAdmin: savedCode === adminCode,
              isGuest: false,
            });
          } else {
            // Keep guest session if it exists, otherwise set to null
            const guestId = localStorage.getItem('qa_guest_id');
            const guestName = localStorage.getItem('qa_guest_name');
            if (guestId && guestName) {
              const savedCode = localStorage.getItem('qa_admin_code');
              const adminCode = process.env.NEXT_PUBLIC_MODERATOR_CODE || 'admin123';
              setUser({
                id: guestId,
                name: guestName,
                isAdmin: savedCode === adminCode,
                isGuest: true,
              });
            } else {
              setUser(null);
            }
          }
          setLoading(false);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const joinAsGuest = async (nickname: string): Promise<UserSession> => {
    const trimmed = nickname.trim();
    if (!trimmed) throw new Error('Nickname cannot be empty');

    const guestId = `guest_${crypto.randomUUID()}`;
    localStorage.setItem('qa_guest_id', guestId);
    localStorage.setItem('qa_guest_name', trimmed);

    const session: UserSession = {
      id: guestId,
      name: trimmed,
      isAdmin: false,
      isGuest: true,
    };
    
    setUser(session);
    return session;
  };

  const loginWithEmail = async (email: string, password: string): Promise<UserSession> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured yet. Please configure it in .env.local');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned from login');

    const nickname = data.user.user_metadata?.nickname || email.split('@')[0];
    const savedCode = localStorage.getItem('qa_admin_code');
    const adminCode = process.env.NEXT_PUBLIC_MODERATOR_CODE || 'admin123';

    // Clear guest info if transitioning to email login
    localStorage.removeItem('qa_guest_id');
    localStorage.removeItem('qa_guest_name');

    const session: UserSession = {
      id: data.user.id,
      name: nickname,
      email: data.user.email,
      isAdmin: savedCode === adminCode,
      isGuest: false,
    };

    setUser(session);
    return session;
  };

  const signUpWithEmail = async (email: string, password: string, nickname: string): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured yet. Please configure it in .env.local');
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: nickname.trim(),
        },
      },
    });

    if (error) throw error;
  };

  const promoteToAdmin = (code: string): boolean => {
    const adminCode = process.env.NEXT_PUBLIC_MODERATOR_CODE || 'admin123';
    if (code === adminCode) {
      localStorage.setItem('qa_admin_code', code);
      setUser(prev => {
        if (!prev) return null;
        return { ...prev, isAdmin: true };
      });
      return true;
    }
    return false;
  };

  const logout = async () => {
    // Clear everything locally
    localStorage.removeItem('qa_guest_id');
    localStorage.removeItem('qa_guest_name');
    localStorage.removeItem('qa_admin_code');
    
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        joinAsGuest,
        loginWithEmail,
        signUpWithEmail,
        promoteToAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
