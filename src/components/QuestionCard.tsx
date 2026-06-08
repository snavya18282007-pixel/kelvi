'use client';

import React from 'react';
import { Pin, Trash2 } from 'lucide-react';
import VoteButton from './VoteButton';

interface Question {
  id: string;
  content: string;
  author: string;
  votes_count: number;
  is_pinned: boolean;
  created_at: string;
}

interface QuestionCardProps {
  question: Question;
  hasVoted: boolean;
  onVoteToggle: () => void;
  onPinToggle?: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
  voteDisabled?: boolean;
}

export default function QuestionCard({
  question,
  hasVoted,
  onVoteToggle,
  onPinToggle,
  onDelete,
  isAdmin,
  voteDisabled,
}: QuestionCardProps) {
  
  // Clean relative time converter
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`rounded-2xl border bg-card p-5 transition-all animate-fade-in ${
        question.is_pinned
          ? 'border-indigo-500/40 bg-gradient-to-r from-indigo-950/10 to-transparent glow-indigo'
          : 'border-border/60 hover:border-zinc-800'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-350">{question.author}</span>
            <span>•</span>
            <span>{getRelativeTime(question.created_at)}</span>
            {question.is_pinned && (
              <span className="flex items-center gap-1 text-indigo-400 font-medium">
                <Pin className="h-3 w-3 fill-indigo-400" />
                <span>Pinned</span>
              </span>
            )}
          </div>
          <p className="text-zinc-200 text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap pt-1">
            {question.content}
          </p>
        </div>

        {/* Action button container */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-850">
              {onPinToggle && (
                <button
                  onClick={onPinToggle}
                  className={`p-1.5 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-zinc-800 transition-all cursor-pointer ${
                    question.is_pinned ? 'text-indigo-400 bg-indigo-500/10' : ''
                  }`}
                  title={question.is_pinned ? 'Unpin Question' : 'Pin Question'}
                >
                  <Pin className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-1.5 rounded-lg text-zinc-550 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                  title="Delete Question"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          <VoteButton
            votesCount={question.votes_count}
            hasVoted={hasVoted}
            onVoteToggle={onVoteToggle}
            disabled={voteDisabled}
          />
        </div>
      </div>
    </div>
  );
}
