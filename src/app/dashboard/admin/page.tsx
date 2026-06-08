'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Shield, Pin, Trash2, Key, BarChart3, HelpCircle } from 'lucide-react';

interface Question {
  id: string;
  content: string;
  author: string;
  votes_count: number;
  is_pinned: boolean;
  created_at: string;
}

interface Poll {
  id: string;
  title: string;
  created_at: string;
}

export default function AdminPanel() {
  const { user, promoteToAdmin, loading: authLoading } = useAuth();
  
  // State variables
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [submittingPasscode, setSubmittingPasscode] = useState(false);
  
  const loading = authLoading || (user?.isAdmin && dataLoading);

  // Load questions and polls
  useEffect(() => {
    if (!user?.isAdmin) {
      return;
    }

    async function loadAdminData() {
      try {
        if (isSupabaseConfigured && supabase) {
          // Fetch all questions
          const { data: qData, error: qError } = await supabase
            .from('questions')
            .select('*')
            .order('created_at', { ascending: false });
          if (qError) throw qError;
          setQuestions(qData || []);

          // Fetch all polls
          const { data: pData, error: pError } = await supabase
            .from('polls')
            .select('*')
            .order('created_at', { ascending: false });
          if (pError) throw pError;
          setPolls(pData || []);
        } else {
          // Sandbox Mode Mock Data
          const mockQ = localStorage.getItem('mock_questions');
          if (mockQ) setQuestions(JSON.parse(mockQ));

          const mockP = localStorage.getItem('mock_polls');
          if (mockP) setPolls(JSON.parse(mockP));
        }
      } catch (err) {
        console.error('Failed to load admin data:', err);
      } finally {
        setDataLoading(false);
      }
    }

    loadAdminData();
  }, [user?.isAdmin]);

  // Real-time updates for Admin Panel
  useEffect(() => {
    if (!user?.isAdmin || !isSupabaseConfigured || !supabase) return;

    const questionsChannel = supabase
      .channel('admin-questions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, payload => {
        if (payload.eventType === 'INSERT') {
          setQuestions(prev => [payload.new as Question, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Question;
          setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
        } else if (payload.eventType === 'DELETE') {
          setQuestions(prev => prev.filter(q => q.id !== payload.old.id));
        }
      })
      .subscribe();

    const pollsChannel = supabase
      .channel('admin-polls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, payload => {
        if (payload.eventType === 'INSERT') {
          setPolls(prev => [payload.new as Poll, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setPolls(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(questionsChannel);
        supabase.removeChannel(pollsChannel);
      }
    };
  }, [user?.isAdmin]);

  // Action Handlers
  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError('');
    setSubmittingPasscode(true);

    // Simulate small latency for premium feel
    setTimeout(() => {
      const isOk = promoteToAdmin(passcode);
      if (isOk) {
        setPasscode('');
      } else {
        setPasscodeError('Invalid moderator passcode. Please try again.');
      }
      setSubmittingPasscode(false);
    }, 500);
  };

  const handlePinToggle = async (questionId: string, currentPinned: boolean) => {
    if (!isSupabaseConfigured || !supabase) {
      setQuestions(prev => {
        const updated = prev.map(q => q.id === questionId ? { ...q, is_pinned: !currentPinned } : q);
        localStorage.setItem('mock_questions', JSON.stringify(updated));
        return updated;
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_pinned: !currentPinned })
        .eq('id', questionId);

      if (error) throw error;
    } catch (err) {
      console.error('Admin fail pin:', err);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      setQuestions(prev => {
        const updated = prev.filter(q => q.id !== questionId);
        localStorage.setItem('mock_questions', JSON.stringify(updated));
        return updated;
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
    } catch (err) {
      console.error('Admin fail delete question:', err);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      setPolls(prev => {
        const updated = prev.filter(p => p.id !== pollId);
        localStorage.setItem('mock_polls', JSON.stringify(updated));
        return updated;
      });
      // Mock options and votes cascading deletion
      const mockO = localStorage.getItem('mock_poll_options');
      if (mockO) {
        const updatedO = JSON.parse(mockO).filter((o: { poll_id: string }) => o.poll_id !== pollId);
        localStorage.setItem('mock_poll_options', JSON.stringify(updatedO));
      }
      const mockV = localStorage.getItem('mock_poll_votes');
      if (mockV) {
        const updatedV = JSON.parse(mockV).filter((v: { poll_id: string }) => v.poll_id !== pollId);
        localStorage.setItem('mock_poll_votes', JSON.stringify(updatedV));
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;
    } catch (err) {
      console.error('Admin fail delete poll:', err);
    }
  };

  // 1. Passcode Gate if not Admin
  if (!user?.isAdmin) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 shadow-lg shadow-indigo-500/5">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Moderator Authorization</h1>
          <p className="text-xs text-zinc-400">
            Please enter your moderator passcode to access the pinning, deleting, and panel tools.
          </p>
        </div>

        <form onSubmit={handleVerifyPasscode} className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xl">
          {passcodeError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
              {passcodeError}
            </div>
          )}

          <div>
            <label htmlFor="passcode-input" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Moderator Passcode
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-550" />
              <input
                id="passcode-input"
                type="password"
                placeholder="Enter passcode..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-550 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                disabled={submittingPasscode}
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">
              Tip: The default local passcode is <code className="text-zinc-400 font-mono">admin123</code>.
            </p>
          </div>

          <button
            type="submit"
            disabled={submittingPasscode || !passcode}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 disabled:bg-zinc-900 disabled:text-zinc-650 py-3 text-sm font-semibold text-white shadow-lg transition-all active:scale-98"
          >
            <span>{submittingPasscode ? 'Verifying...' : 'Unlock Panel'}</span>
          </button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Dashboard Statistics
  const totalVotes = questions.reduce((sum, q) => sum + q.votes_count, 0);
  const pinnedQuestions = questions.filter(q => q.is_pinned).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Presenter Control Center</h1>
          <p className="text-xs text-zinc-400">Manage all Q&A questions, pin important topics, and oversee audience polls.</p>
        </div>
      </div>

      {/* Analytics stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-secondary/10 p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-550 block">Questions</span>
          <span className="text-xl font-black text-white">{questions.length}</span>
        </div>
        <div className="rounded-xl border border-border bg-secondary/10 p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-550 block">Total Upvotes</span>
          <span className="text-xl font-black text-white">{totalVotes}</span>
        </div>
        <div className="rounded-xl border border-border bg-secondary/10 p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-550 block">Pinned Items</span>
          <span className="text-xl font-black text-indigo-400">{pinnedQuestions}</span>
        </div>
        <div className="rounded-xl border border-border bg-secondary/10 p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-550 block">Active Polls</span>
          <span className="text-xl font-black text-white">{polls.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Left: Questions Manager (8 columns) */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-indigo-400" />
            <span>Moderate Questions ({questions.length})</span>
          </h2>

          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-8 text-center text-zinc-550 text-xs">
              No questions submitted yet.
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition-all ${
                    q.is_pinned 
                      ? 'border-indigo-500/30 bg-indigo-950/5' 
                      : 'border-zinc-850 bg-zinc-900/10'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-550">
                      <span className="font-semibold text-zinc-400">{q.author}</span>
                      <span>•</span>
                      <span>{q.votes_count} upvotes</span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-200 truncate">{q.content}</p>
                  </div>

                  <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-850 p-1 rounded-lg flex-shrink-0">
                    <button
                      onClick={() => handlePinToggle(q.id, q.is_pinned)}
                      className={`p-1.5 rounded text-zinc-500 hover:text-indigo-400 hover:bg-zinc-900 cursor-pointer ${
                        q.is_pinned ? 'text-indigo-400 bg-indigo-500/10' : ''
                      }`}
                      title={q.is_pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Polls Manager (5 columns) */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-indigo-400" />
            <span>Manage Polls ({polls.length})</span>
          </h2>

          {polls.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-8 text-center text-zinc-550 text-xs">
              No active polls.
            </div>
          ) : (
            <div className="space-y-2">
              {polls.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-zinc-850 bg-zinc-900/10 p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-zinc-200 font-semibold truncate">{p.title}</p>
                    <span className="text-[10px] text-zinc-550 block mt-0.5">
                      Created: {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeletePoll(p.id)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer flex-shrink-0"
                    title="Delete Poll"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
