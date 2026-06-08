'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import PollCard from '@/components/PollCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { BarChart3, Plus, X, Check } from 'lucide-react';

interface Poll {
  id: string;
  title: string;
  created_at: string;
}

interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
}

interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
}

export default function PollsPage() {
  const { user } = useAuth();
  
  // Data State
  const [polls, setPolls] = useState<Poll[]>([]);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [optionInputs, setOptionInputs] = useState<string[]>(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch all polls, options, and votes
  useEffect(() => {
    async function fetchPollData() {
      setLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          // 1. Fetch Polls
          const { data: pData, error: pError } = await supabase
            .from('polls')
            .select('*')
            .order('created_at', { ascending: false });
          if (pError) throw pError;
          setPolls(pData || []);

          // 2. Fetch Options
          const { data: oData, error: oError } = await supabase
            .from('poll_options')
            .select('*');
          if (oError) throw oError;
          setOptions(oData || []);

          // 3. Fetch Votes
          const { data: vData, error: vError } = await supabase
            .from('poll_votes')
            .select('*');
          if (vError) throw vError;
          setVotes(vData || []);
        } else {
          // Local Storage Sandbox Mock Data
          const mockP = localStorage.getItem('mock_polls');
          const mockO = localStorage.getItem('mock_poll_options');
          const mockV = localStorage.getItem('mock_poll_votes');

          if (mockP && mockO && mockV) {
            setPolls(JSON.parse(mockP));
            setOptions(JSON.parse(mockO));
            setVotes(JSON.parse(mockV));
          } else {
            // Seed initial polls
            const initialPolls: Poll[] = [
              {
                id: 'poll-1',
                title: 'Which frontend frameworks are you using for production in 2026?',
                created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
              }
            ];
            const initialOptions: PollOption[] = [
              { id: 'opt-1', poll_id: 'poll-1', option_text: 'Next.js (App Router)' },
              { id: 'opt-2', poll_id: 'poll-1', option_text: 'Vite + React SPA' },
              { id: 'opt-3', poll_id: 'poll-1', option_text: 'SvelteKit / Nuxt' },
              { id: 'opt-4', poll_id: 'poll-1', option_text: 'Other / Custom bundler' },
            ];
            const initialVotes: PollVote[] = [
              { id: 'v-1', poll_id: 'poll-1', option_id: 'opt-1', user_id: 'user-mock-1' },
              { id: 'v-2', poll_id: 'poll-1', option_id: 'opt-1', user_id: 'user-mock-2' },
              { id: 'v-3', poll_id: 'poll-1', option_id: 'opt-2', user_id: 'user-mock-3' },
            ];

            setPolls(initialPolls);
            setOptions(initialOptions);
            setVotes(initialVotes);

            localStorage.setItem('mock_polls', JSON.stringify(initialPolls));
            localStorage.setItem('mock_poll_options', JSON.stringify(initialOptions));
            localStorage.setItem('mock_poll_votes', JSON.stringify(initialVotes));
          }
        }
      } catch (err) {
        console.error('Error fetching poll data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPollData();
  }, []);

  // Real-time Poll subscriptions
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const pollsCh = supabase
      .channel('polls-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, payload => {
        if (payload.eventType === 'INSERT') {
          setPolls(prev => [payload.new as Poll, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setPolls(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    const optionsCh = supabase
      .channel('options-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_options' }, payload => {
        if (payload.eventType === 'INSERT') {
          setOptions(prev => [...prev, payload.new as PollOption]);
        } else if (payload.eventType === 'DELETE') {
          setOptions(prev => prev.filter(o => o.id !== payload.old.id));
        }
      })
      .subscribe();

    const votesCh = supabase
      .channel('votes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, payload => {
        if (payload.eventType === 'INSERT') {
          setVotes(prev => [...prev, payload.new as PollVote]);
        } else if (payload.eventType === 'DELETE') {
          setVotes(prev => prev.filter(v => v.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(pollsCh);
        supabase.removeChannel(optionsCh);
        supabase.removeChannel(votesCh);
      }
    };
  }, []);

  // Poll Form Handlers
  const handleAddOptionInput = () => {
    if (optionInputs.length >= 6) return; // Cap at 6 options
    setOptionInputs([...optionInputs, '']);
  };

  const handleRemoveOptionInput = (index: number) => {
    if (optionInputs.length <= 2) return; // Keep at least 2
    setOptionInputs(optionInputs.filter((_, i) => i !== index));
  };

  const handleOptionInputChange = (index: number, val: string) => {
    const updated = [...optionInputs];
    updated[index] = val;
    setOptionInputs(updated);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    const title = pollTitle.trim();
    if (!title) {
      setFormError('Please enter a poll title.');
      return;
    }

    const validOptions = optionInputs.map(opt => opt.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      setFormError('Please enter at least 2 valid options.');
      return;
    }

    setSubmitting(true);

    try {
      if (isSupabaseConfigured && supabase) {
        // 1. Create Poll row
        const { data: pollData, error: pollError } = await supabase
          .from('polls')
          .insert({ title })
          .select()
          .single();

        if (pollError) throw pollError;

        // 2. Create Option rows
        const optionsToInsert = validOptions.map(text => ({
          poll_id: pollData.id,
          option_text: text,
        }));

        const { error: optError } = await supabase
          .from('poll_options')
          .insert(optionsToInsert);

        if (optError) throw optError;
      } else {
        // Mock Sandbox insert
        const pollId = `poll-${crypto.randomUUID()}`;
        const newPoll: Poll = {
          id: pollId,
          title,
          created_at: new Date().toISOString(),
        };

        const newOptions: PollOption[] = validOptions.map((text, idx) => ({
          id: `opt-${pollId}-${idx}-${crypto.randomUUID()}`,
          poll_id: pollId,
          option_text: text,
        }));

        setPolls(prev => {
          const updated = [newPoll, ...prev];
          localStorage.setItem('mock_polls', JSON.stringify(updated));
          return updated;
        });

        setOptions(prev => {
          const updated = [...prev, ...newOptions];
          localStorage.setItem('mock_poll_options', JSON.stringify(updated));
          return updated;
        });
      }

      // Reset form states
      setPollTitle('');
      setOptionInputs(['', '']);
      setShowCreateForm(false);
    } catch (err) {
      console.error(err);
      const errMsg = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Failed to create poll.';
      setFormError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Voting action handlers
  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) return;

    // Local state check to prevent double votes
    const hasVoted = votes.some(v => v.poll_id === pollId && v.user_id === user.id);
    if (hasVoted) return;

    const newVote: PollVote = {
      id: `v-${crypto.randomUUID()}`,
      poll_id: pollId,
      option_id: optionId,
      user_id: user.id,
    };

    // Optimistic state update
    setVotes(prev => [...prev, newVote]);

    if (!isSupabaseConfigured || !supabase) {
      // Sandbox mode upvote persist
      localStorage.setItem('mock_poll_votes', JSON.stringify([...votes, newVote]));
      return;
    }

    try {
      const { error } = await supabase
        .from('poll_votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: user.id,
        });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to submit poll vote:', err);
      // Revert optimistic update
      setVotes(prev => prev.filter(v => v.id !== newVote.id));
    }
  };

  const handleChangeVote = async (pollId: string) => {
    if (!user) return;

    const voteToRemove = votes.find(v => v.poll_id === pollId && v.user_id === user.id);
    if (!voteToRemove) return;

    // Optimistic UI updates
    setVotes(prev => prev.filter(v => v.id !== voteToRemove.id));

    if (!isSupabaseConfigured || !supabase) {
      // Sandbox mode update persist
      localStorage.setItem('mock_poll_votes', JSON.stringify(votes.filter(v => v.id !== voteToRemove.id)));
      return;
    }

    try {
      const { error } = await supabase
        .from('poll_votes')
        .delete()
        .match({ poll_id: pollId, user_id: user.id });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to remove poll vote:', err);
      // Revert optimistic update
      setVotes(prev => [...prev, voteToRemove]);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!user?.isAdmin) return;

    if (!isSupabaseConfigured || !supabase) {
      setPolls(prev => {
        const updated = prev.filter(p => p.id !== pollId);
        localStorage.setItem('mock_polls', JSON.stringify(updated));
        return updated;
      });
      setOptions(prev => {
        const updated = prev.filter(o => o.poll_id !== pollId);
        localStorage.setItem('mock_poll_options', JSON.stringify(updated));
        return updated;
      });
      setVotes(prev => {
        const updated = prev.filter(v => v.poll_id !== pollId);
        localStorage.setItem('mock_poll_votes', JSON.stringify(updated));
        return updated;
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to delete poll:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="h-5.5 w-5.5 text-indigo-500" />
            <span>Interactive Polls</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">Vote on open topics or build a new poll to gather feedback.</p>
        </div>
        
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md cursor-pointer transition-all active:scale-95"
        >
          {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span>{showCreateForm ? 'Cancel' : 'Create Poll'}</span>
        </button>
      </div>

      {/* Create Poll Form Collapsible */}
      {showCreateForm && (
        <form onSubmit={handleCreatePoll} className="rounded-2xl border border-border bg-card p-5 space-y-4 animate-fade-in">
          <h2 className="text-sm font-semibold text-zinc-200">New Poll Details</h2>
          
          {formError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
              {formError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label htmlFor="poll-title-input" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Poll Question / Title
              </label>
              <input
                id="poll-title-input"
                type="text"
                placeholder="What would you like to ask your audience?"
                value={pollTitle}
                onChange={(e) => setPollTitle(e.target.value)}
                className="w-full rounded-xl border border-border bg-input py-2.5 px-4 text-sm text-white placeholder-zinc-550 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Options
              </label>
              {optionInputs.map((input, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    value={input}
                    onChange={(e) => handleOptionInputChange(idx, e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-input py-2 px-3.5 text-sm text-white placeholder-zinc-550 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    disabled={submitting}
                  />
                  {optionInputs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOptionInput(idx)}
                      className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      disabled={submitting}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

              {optionInputs.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOptionInput}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer pl-1"
                  disabled={submitting}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add another option</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 cursor-pointer rounded-xl bg-indigo-650 hover:bg-indigo-600 disabled:bg-zinc-900 disabled:text-zinc-650 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition-all active:scale-95"
            >
              <Check className="h-4 w-4" />
              <span>{submitting ? 'Creating...' : 'Launch Poll'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Polls Feed */}
      {loading ? (
        <div className="py-12">
          <LoadingSpinner size="md" />
        </div>
      ) : polls.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-zinc-550">
          <p className="font-semibold text-sm">No polls active</p>
          <p className="text-xs text-zinc-600 mt-1">Create a poll above to start surveying the audience!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            const pollOpts = options.filter(o => o.poll_id === poll.id);
            const pollVotes = votes.filter(v => v.poll_id === poll.id);
            
            return (
              <PollCard
                key={poll.id}
                poll={poll}
                options={pollOpts}
                votes={pollVotes}
                currentUserId={user?.id || ''}
                onVote={handleVote}
                onChangeVote={handleChangeVote}
                onDelete={() => handleDeletePoll(poll.id)}
                isAdmin={user?.isAdmin}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
