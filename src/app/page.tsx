'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { MessageSquare, Vote, Sparkles, Shield, User, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function LandingPage() {
  const { user, joinAsGuest, loginWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();

  // Mode states: 'guest', 'login', 'signup'
  const [authMode, setAuthMode] = useState<'guest' | 'login' | 'signup'>('guest');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (authMode === 'guest') {
        if (!nickname.trim()) {
          throw new Error('Please enter a nickname to join.');
        }
        await joinAsGuest(nickname);
        router.push('/dashboard');
      } else if (authMode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please fill in all fields.');
        }
        await loginWithEmail(email, password);
        router.push('/dashboard');
      } else if (authMode === 'signup') {
        if (!email.trim() || !password || !nickname.trim()) {
          throw new Error('Please fill in all fields.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        await signUpWithEmail(email, password, nickname);
        setSuccessMsg('Account created successfully! You can now log in.');
        setAuthMode('login');
        setPassword('');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: MessageSquare,
      title: 'Live Q&A Feed',
      description: 'Submit questions anonymously or with your nickname. Upvote questions and view live tallies as they update real-time.',
    },
    {
      icon: Vote,
      title: 'Real-time Polling',
      description: 'Create multi-option polls. Watch vote bars animate live, and change your vote dynamically if you change your mind.',
    },
    {
      icon: Sparkles,
      title: 'Gemini AI Utilities',
      description: 'Filter spam or toxic inputs automatically with AI Moderation, summarize questions on demand, and extract poll insights.',
    },
    {
      icon: Shield,
      title: 'Moderator Controls',
      description: 'Pin important questions to the top, delete inappropriate or off-topic submissions, and oversee the session.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-indigo-600/30">
      {/* Header */}
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/20">
            K
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Kealvi<span className="text-indigo-500">.</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
          {!isSupabaseConfigured && (
            <span className="rounded bg-yellow-500/10 px-2.5 py-1 text-yellow-500 border border-yellow-500/20">
              Demo Sandbox (No DB)
            </span>
          )}
          {isSupabaseConfigured && (
            <span className="rounded bg-emerald-500/10 px-2.5 py-1 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center w-full">
          {/* Left Column: Hero Text */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next-Gen Live Audience Q&A</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Real-time interaction, <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-500 bg-clip-text text-transparent">
                powered by Gemini AI
              </span>
            </h1>
            <p className="text-zinc-400 text-base sm:text-lg max-w-xl leading-relaxed">
              Kealvi lets speakers, event hosts, and classrooms run live, beautiful Q&As and instant polls. Connect with your audience in real-time, moderate spam with AI, and summarize discussions in one click.
            </p>

            {/* Features Mini-list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {features.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div key={feat.title} className="flex gap-3 items-start">
                    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-900 border border-border text-indigo-400 flex-shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-zinc-200">{feat.title}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{feat.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Interaction Auth Box */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-2xl border border-border bg-secondary/30 p-6 sm:p-8 glow-indigo animate-fade-in">
              <div className="mb-6 flex gap-2 border-b border-border/50 pb-4">
                <button
                  onClick={() => {
                    setAuthMode('guest');
                    setError('');
                  }}
                  className={`flex-1 py-2 text-center text-sm font-medium rounded-lg transition-all cursor-pointer ${
                    authMode === 'guest'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Join as Guest
                </button>
                <button
                  onClick={() => {
                    if (!isSupabaseConfigured) {
                      setError('Supabase is not configured yet. Guest mode is active.');
                      return;
                    }
                    setAuthMode('login');
                    setError('');
                  }}
                  className={`flex-1 py-2 text-center text-sm font-medium rounded-lg transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Email Log In
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400 flex gap-2 items-start">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nickname Field */}
                {(authMode === 'guest' || authMode === 'signup') && (
                  <div>
                    <label htmlFor="nickname" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Nickname / Display Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        id="nickname"
                        type="text"
                        placeholder="Enter nickname..."
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                {/* Email Field */}
                {(authMode === 'login' || authMode === 'signup') && (
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                {/* Password Field */}
                {(authMode === 'login' || authMode === 'signup') && (
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all active:scale-98 disabled:opacity-50"
                >
                  <span>
                    {loading ? 'Joining...' : authMode === 'guest' ? 'Join Live Board' : authMode === 'login' ? 'Sign In' : 'Sign Up'}
                  </span>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              {/* Toggle Login/Signup */}
              {authMode !== 'guest' && (
                <div className="mt-4 text-center text-xs text-zinc-500">
                  {authMode === 'login' ? (
                    <p>
                      Don&apos;t have an account?{' '}
                      <button
                        onClick={() => {
                          setAuthMode('signup');
                          setError('');
                        }}
                        className="font-semibold text-indigo-400 hover:underline cursor-pointer"
                      >
                        Create account
                      </button>
                    </p>
                  ) : (
                    <p>
                      Already have an account?{' '}
                      <button
                        onClick={() => {
                          setAuthMode('login');
                          setError('');
                        }}
                        className="font-semibold text-indigo-400 hover:underline cursor-pointer"
                      >
                        Log in
                      </button>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/20 py-6 text-center text-xs text-zinc-600">
        <p>© 2026 Kealvi. Open Source Live Q&A and Polls platform.</p>
      </footer>
    </div>
  );
}
