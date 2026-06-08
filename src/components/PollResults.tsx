'use client';

import React from 'react';

interface OptionResult {
  id: string;
  option_text: string;
  votes_count: number;
  percentage: number;
}

interface PollResultsProps {
  options: OptionResult[];
  totalVotes: number;
  votedOptionId: string | null;
  onVote: (optionId: string) => void;
  disabled?: boolean;
}

export default function PollResults({
  options,
  votedOptionId,
  onVote,
  disabled,
}: PollResultsProps) {
  return (
    <div className="space-y-2.5">
      {options.map((opt) => {
        const isSelected = votedOptionId === opt.id;
        
        return (
          <div
            key={opt.id}
            onClick={() => !disabled && onVote(opt.id)}
            className={`relative rounded-xl border p-3.5 cursor-pointer overflow-hidden transition-all select-none ${
              isSelected
                ? 'border-indigo-500/50 bg-indigo-950/5'
                : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-750'
            } ${disabled ? 'pointer-events-none opacity-85' : ''}`}
          >
            {/* Visual background progress bar */}
            <div
              className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ${
                isSelected ? 'bg-indigo-600/10' : 'bg-zinc-800/15'
              }`}
              style={{ width: `${opt.percentage}%` }}
            />

            {/* Option Details */}
            <div className="relative flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border text-[10px] ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-500 text-white font-bold'
                      : 'border-zinc-750 bg-zinc-950 text-transparent'
                  }`}
                >
                  ✓
                </div>
                <span className={`font-medium ${isSelected ? 'text-indigo-400' : 'text-zinc-200'}`}>
                  {opt.option_text}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-semibold">
                <span>{opt.percentage.toFixed(0)}%</span>
                <span className="text-zinc-650">•</span>
                <span>{opt.votes_count} {opt.votes_count === 1 ? 'vote' : 'votes'}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
