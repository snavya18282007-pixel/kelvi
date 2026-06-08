'use client';

import React from 'react';
import { ThumbsUp } from 'lucide-react';

interface VoteButtonProps {
  votesCount: number;
  hasVoted: boolean;
  onVoteToggle: () => void;
  disabled?: boolean;
}

export default function VoteButton({ votesCount, hasVoted, onVoteToggle, disabled }: VoteButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onVoteToggle();
      }}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold border transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
        hasVoted
          ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30 glow-indigo'
          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
      }`}
    >
      <ThumbsUp className={`h-3.5 w-3.5 transition-transform ${hasVoted ? 'fill-indigo-400 scale-110' : ''}`} />
      <span>{votesCount}</span>
    </button>
  );
}
