import React from 'react';

export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex items-center justify-center" role="status">
      <div
        className={`${sizeClasses[size]} border-indigo-500 border-t-transparent animate-spin rounded-full border-zinc-800`}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
