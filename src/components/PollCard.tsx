'use client';

import React, { useState } from 'react';
import { BarChart3, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import PollResults from './PollResults';

interface PollOption {
  id: string;
  option_text: string;
}

interface Poll {
  id: string;
  title: string;
  created_at: string;
}

interface OptionWithResult extends PollOption {
  votes_count: number;
  percentage: number;
}

interface PollCardProps {
  poll: Poll;
  options: PollOption[];
  votes: Array<{ option_id: string; user_id: string }>;
  currentUserId: string;
  onVote: (pollId: string, optionId: string) => void;
  onChangeVote: (pollId: string) => void;
  onDelete?: () => void;
  isAdmin?: boolean;
}

export default function PollCard({
  poll,
  options,
  votes,
  currentUserId,
  onVote,
  onChangeVote,
  onDelete,
  isAdmin,
}: PollCardProps) {
  const [insight, setInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightError, setInsightError] = useState('');

  // 1. Calculate votes tally
  const totalVotes = votes.length;
  const votedRow = votes.find((v) => v.user_id === currentUserId);
  const votedOptionId = votedRow ? votedRow.option_id : null;

  const optionsWithResults: OptionWithResult[] = options.map((opt) => {
    const optVotes = votes.filter((v) => v.option_id === opt.id).length;
    const percentage = totalVotes > 0 ? (optVotes / totalVotes) * 100 : 0;
    
    return {
      ...opt,
      votes_count: optVotes,
      percentage,
    };
  });

  const getAIInsights = async () => {
    setLoadingInsight(true);
    setInsightError('');
    try {
      const formattedOptions = optionsWithResults.map((opt) => ({
        text: opt.option_text,
        votes: opt.votes_count,
      }));

      const res = await fetch('/api/ai-poll-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollTitle: poll.title,
          options: formattedOptions,
          totalVotes,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate insights');
      }

      const data = await res.json();
      setInsight(data.insight);
    } catch (err) {
      console.error(err);
      setInsightError('Could not generate insights at this time.');
    } finally {
      setLoadingInsight(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-zinc-550">
            <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
            <span>Poll</span>
            <span>•</span>
            <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} cast</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white leading-snug">{poll.title}</h3>
        </div>

        {isAdmin && onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-zinc-550 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
            title="Delete Poll"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <PollResults
        options={optionsWithResults}
        totalVotes={totalVotes}
        votedOptionId={votedOptionId}
        onVote={(optionId) => onVote(poll.id, optionId)}
        disabled={votedOptionId !== null}
      />

      <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-3 flex-wrap">
        {votedOptionId ? (
          <button
            onClick={() => onChangeVote(poll.id)}
            className="text-xs text-zinc-400 hover:text-white underline cursor-pointer font-semibold"
          >
            Change your vote
          </button>
        ) : (
          <span className="text-xs text-zinc-550 italic">Select an option to cast your vote</span>
        )}

        {totalVotes > 0 && (
          <button
            onClick={getAIInsights}
            disabled={loadingInsight}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-400 px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
          >
            {loadingInsight ? (
              <RefreshCw className="h-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            <span>AI Insights</span>
          </button>
        )}
      </div>

      {insightError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400 animate-fade-in">
          {insightError}
        </div>
      )}

      {insight && (
        <div className="rounded-xl bg-zinc-950/50 border border-border p-3.5 text-xs text-zinc-300 leading-relaxed space-y-1 animate-fade-in flex gap-2 items-start border-l-2 border-indigo-500/50">
          <Sparkles className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <div>
            <span className="font-semibold text-zinc-200 block text-[11px] uppercase tracking-wider mb-0.5">Gemini Insight</span>
            {insight}
          </div>
        </div>
      )}
    </div>
  );
}
