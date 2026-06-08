'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, MessageSquareCode } from 'lucide-react';

interface Question {
  content: string;
  votes_count: number;
}

interface AIInsightCardProps {
  questions: Question[];
}

export default function AIInsightCard({ questions }: AIInsightCardProps) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateSummary = async () => {
    if (questions.length === 0) {
      setError('No questions available to summarize.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const formattedQuestions = questions.map(q => ({
        content: q.content,
        votes_count: q.votes_count
      }));

      const res = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questions: formattedQuestions }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate summary.');
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred while generating AI summary.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/5 p-5 glow-indigo space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex-shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-zinc-200">AI Summary Engine</h3>
            <p className="text-[11px] text-zinc-550">Synthesize active questions into primary themes</p>
          </div>
        </div>

        <button
          onClick={generateSummary}
          disabled={loading || questions.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-850 border border-transparent px-3 py-1.5 text-xs font-semibold text-white shadow-md cursor-pointer transition-all active:scale-95 disabled:pointer-events-none"
        >
          {loading ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Analyzing feed...</span>
            </>
          ) : (
            <>
              <MessageSquareCode className="h-3.5 w-3.5" />
              <span>Summarize ({questions.length})</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {summary && (
        <div className="rounded-xl bg-zinc-950/50 border border-border p-4 text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-1.5 animate-fade-in whitespace-pre-wrap">
          {summary}
        </div>
      )}
    </div>
  );
}
