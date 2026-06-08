'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import QuestionCard from '@/components/QuestionCard';
import SearchBar from '@/components/SearchBar';
import AIInsightCard from '@/components/AIInsightCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Send, Sparkles, MessageSquare, Flame, Clock, AlertCircle } from 'lucide-react';

interface Question {
  id: string;
  content: string;
  author: string;
  votes_count: number;
  is_pinned: boolean;
  created_at: string;
}

export default function QADashboard() {
  const { user } = useAuth();
  
  // State variables
  const [questions, setQuestions] = useState<Question[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'votes' | 'recent'>('votes');
  
  // AI Smart Suggestion Keywords
  const [smartKeywords, setSmartKeywords] = useState<string[]>([]);
  const [generatingKeywords, setGeneratingKeywords] = useState(false);
  
  // Alert/Error states
  const [modError, setModError] = useState('');
  const dbNotice = !isSupabaseConfigured;

  // Load questions and user votes
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          // 1. Fetch questions from Supabase
          const { data: qData, error: qError } = await supabase
            .from('questions')
            .select('*')
            .order('created_at', { ascending: false });

          if (qError) throw qError;
          setQuestions(qData || []);

          // 2. Fetch user's votes from Supabase
          if (user) {
            const { data: vData, error: vError } = await supabase
              .from('question_votes')
              .select('question_id')
              .eq('user_id', user.id);

            if (vError) throw vError;
            
            const voteSet = new Set<string>();
            vData?.forEach(v => voteSet.add(v.question_id));
            setMyVotes(voteSet);
          }
        } else {
          // Fallback to local storage mock data for sandbox
          const mockQ = localStorage.getItem('mock_questions');
          if (mockQ) {
            setQuestions(JSON.parse(mockQ));
          } else {
            const initialMock: Question[] = [
              {
                id: 'mock-1',
                content: 'Welcome to Kealvi! This is a mock sandbox question because Supabase is not configured yet. Set up your environment variables to connect your real database.',
                author: 'System',
                votes_count: 5,
                is_pinned: true,
                created_at: new Date(Date.now() - 3600000).toISOString(),
              },
              {
                id: 'mock-2',
                content: 'How does the Gemini AI integration work? Can it moderate questions in other languages?',
                author: 'Audience Member',
                votes_count: 3,
                is_pinned: false,
                created_at: new Date(Date.now() - 1800000).toISOString(),
              }
            ];
            setQuestions(initialMock);
            localStorage.setItem('mock_questions', JSON.stringify(initialMock));
          }

          // Mock user votes from local storage
          const mockVotes = localStorage.getItem(`mock_votes_${user?.id}`);
          if (mockVotes) {
            setMyVotes(new Set(JSON.parse(mockVotes)));
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // Real-time Database Subscription
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel('questions-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newQ = payload.new as Question;
            setQuestions((prev) => {
              if (prev.some((q) => q.id === newQ.id)) return prev;
              return [newQ, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedQ = payload.new as Question;
            setQuestions((prev) =>
              prev.map((q) => (q.id === updatedQ.id ? updatedQ : q))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setQuestions((prev) => prev.filter((q) => q.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Handlers
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newQuestionText.trim();
    if (!text) return;

    setSubmitting(true);
    setModError('');

    try {
      // 1. Moderate with Gemini AI
      const modRes = await fetch('/api/ai-moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });

      if (!modRes.ok) {
        throw new Error('AI Moderation failed to respond.');
      }

      const modData = await modRes.json();
      if (!modData.approved) {
        setModError(`Flagged by AI: ${modData.reason}`);
        setSubmitting(false);
        return;
      }

      const authorName = user?.name || 'Anonymous';

      if (isSupabaseConfigured && supabase) {
        // Insert to Supabase
        const { error } = await supabase
          .from('questions')
          .insert({
            content: text,
            author: authorName,
            votes_count: 0,
            is_pinned: false,
          });

        if (error) throw error;
      } else {
        // Mock insert in Sandbox mode
        const newQ: Question = {
          id: `mock-${crypto.randomUUID()}`,
          content: text,
          author: authorName,
          votes_count: 0,
          is_pinned: false,
          created_at: new Date().toISOString(),
        };

        setQuestions(prev => {
          const updated = [newQ, ...prev];
          localStorage.setItem('mock_questions', JSON.stringify(updated));
          return updated;
        });
      }

      setNewQuestionText('');
    } catch (err) {
      console.error(err);
      const errMsg = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Error creating question.';
      setModError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoteToggle = async (questionId: string) => {
    if (!user) return;
    
    const wasVoted = myVotes.has(questionId);
    
    // Optimistic UI updates
    const nextVotes = new Set(myVotes);
    if (wasVoted) {
      nextVotes.delete(questionId);
    } else {
      nextVotes.add(questionId);
    }
    setMyVotes(nextVotes);

    if (!isSupabaseConfigured || !supabase) {
      // Sandbox mode upvote logic
      setQuestions(prev => {
        const updated = prev.map(q => {
          if (q.id === questionId) {
            return {
              ...q,
              votes_count: wasVoted ? Math.max(0, q.votes_count - 1) : q.votes_count + 1,
            };
          }
          return q;
        });
        localStorage.setItem('mock_questions', JSON.stringify(updated));
        return updated;
      });
      localStorage.setItem(`mock_votes_${user.id}`, JSON.stringify(Array.from(nextVotes)));
      return;
    }

    try {
      if (wasVoted) {
        // Delete vote row
        const { error } = await supabase
          .from('question_votes')
          .delete()
          .match({ question_id: questionId, user_id: user.id });

        if (error) throw error;
      } else {
        // Insert vote row
        const { error } = await supabase
          .from('question_votes')
          .insert({ question_id: questionId, user_id: user.id });

        if (error) throw error;
      }
    } catch (err) {
      console.error('Failed to submit vote:', err);
      // Revert optimistic updates
      const revertVotes = new Set(myVotes);
      setMyVotes(revertVotes);
    }
  };

  // Moderator actions on Dashboard
  const handlePinToggle = async (questionId: string, currentPinned: boolean) => {
    if (!user?.isAdmin) return;

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
      console.error('Failed to pin question:', err);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!user?.isAdmin) return;

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
      console.error('Failed to delete question:', err);
    }
  };

  // Generate Smart Keywords from Gemini
  const handleGenerateKeywords = async () => {
    if (questions.length === 0) return;
    setGeneratingKeywords(true);

    try {
      const res = await fetch('/api/ai-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questions.map(q => ({ content: q.content }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSmartKeywords(data.keywords || []);
      }
    } catch (err) {
      console.error('Error generating keywords:', err);
    } finally {
      setGeneratingKeywords(false);
    }
  };

  // Filter and Sort calculation
  const filteredQuestions = questions
    .filter(q => q.content.toLowerCase().includes(searchQuery.toLowerCase()) || q.author.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Pinned questions always stay on top
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;

      // Then sort by votes or recent
      if (sortBy === 'votes') {
        if (b.votes_count !== a.votes_count) {
          return b.votes_count - a.votes_count;
        }
      }
      // Fallback/Recent sort
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="space-y-6">
      {/* DB setup warning notice */}
      {dbNotice && (
        <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/5 p-4 text-xs sm:text-sm text-yellow-500 flex gap-3 items-start animate-fade-in">
          <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Local Sandbox Mode Active</p>
            <p className="text-zinc-400">
              Your Supabase keys are not set. Submissions will be stored in your browser session. To configure database storage and enable multi-device real-time sync, update the environment keys in your `.env.local` file.
            </p>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <MessageSquare className="h-5.5 w-5.5 text-indigo-500" />
            <span>Questions & Answers</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">Ask questions, vote on suggestions, and explore topics.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-550">Sort by:</span>
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setSortBy('votes')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                sortBy === 'votes' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Flame className="h-3 w-3 text-amber-500" />
              <span>Popular</span>
            </button>
            <button
              onClick={() => setSortBy('recent')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                sortBy === 'recent' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Clock className="h-3 w-3 text-indigo-400" />
              <span>Recent</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Insight Card (Top level collapsible summary widget) */}
      {questions.length > 0 && <AIInsightCard questions={questions} />}

      {/* Input box */}
      <form onSubmit={handleCreateQuestion} className="space-y-2.5">
        <div className="relative rounded-2xl border border-border bg-card focus-within:border-indigo-500/50 p-4 transition-all">
          <textarea
            placeholder="Type your question here (moderated by Gemini AI)..."
            value={newQuestionText}
            onChange={(e) => {
              setNewQuestionText(e.target.value);
              if (modError) setModError('');
            }}
            rows={3}
            disabled={submitting}
            className="w-full bg-transparent resize-none text-sm text-white placeholder-zinc-550 border-0 focus:outline-none focus:ring-0 leading-relaxed"
          />
          <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Gemini Moderation Enabled</span>
            </div>
            <button
              type="submit"
              disabled={submitting || !newQuestionText.trim()}
              className="flex items-center gap-1.5 cursor-pointer rounded-xl bg-indigo-650 hover:bg-indigo-600 disabled:bg-zinc-900 disabled:text-zinc-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all active:scale-95 disabled:pointer-events-none"
            >
              <span>{submitting ? 'Analyzing...' : 'Ask Question'}</span>
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>
        {modError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 animate-fade-in flex gap-2 items-start">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{modError}</span>
          </div>
        )}
      </form>

      {/* Search and Filters */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        suggestions={smartKeywords}
        onSuggestionClick={setSearchQuery}
        onGenerateSuggestions={handleGenerateKeywords}
        isGeneratingSuggestions={generatingKeywords}
      />

      {/* Questions List */}
      {loading ? (
        <div className="py-12">
          <LoadingSpinner size="md" />
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-zinc-500">
          <p className="font-semibold text-sm">No questions found</p>
          <p className="text-xs text-zinc-550 mt-1">Be the first to ask a question or try a different search!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              hasVoted={myVotes.has(q.id)}
              onVoteToggle={() => handleVoteToggle(q.id)}
              onPinToggle={() => handlePinToggle(q.id, q.is_pinned)}
              onDelete={() => handleDeleteQuestion(q.id)}
              isAdmin={user?.isAdmin}
              voteDisabled={submitting}
            />
          ))}
        </div>
      )}
    </div>
  );
}
