'use client';

import React from 'react';
import { Search, X, Sparkles } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  onGenerateSuggestions?: () => void;
  isGeneratingSuggestions?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  suggestions,
  onSuggestionClick,
  onGenerateSuggestions,
  isGeneratingSuggestions,
}: SearchBarProps) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-550" />
        <input
          type="text"
          placeholder="Search questions..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-9 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-550 hover:bg-zinc-800 hover:text-zinc-300 transition-all cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* AI Smart Search / Suggestions */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-550 flex items-center gap-1.5 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Smart Keywords:</span>
        </span>
        
        {suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestionClick(s)}
                className="rounded-full bg-zinc-900 border border-zinc-800 hover:border-indigo-500/30 text-zinc-400 hover:text-indigo-400 px-2.5 py-0.5 cursor-pointer transition-all"
              >
                {s}
              </button>
            ))}
            <button
              onClick={onGenerateSuggestions}
              disabled={isGeneratingSuggestions}
              className="text-zinc-550 hover:text-indigo-400 cursor-pointer font-medium pl-1 text-[11px]"
            >
              Refresh
            </button>
          </div>
        ) : (
          <button
            onClick={onGenerateSuggestions}
            disabled={isGeneratingSuggestions}
            className="text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer disabled:opacity-50"
          >
            {isGeneratingSuggestions ? 'Analyzing questions...' : 'Generate AI Smart Keywords'}
          </button>
        )}
      </div>
    </div>
  );
}
