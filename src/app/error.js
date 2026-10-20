'use client';

import React, { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Application runtime error:', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-2xl mb-4 select-none">
        ⚠️
      </div>
      <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2">
        Something went wrong
      </h1>
      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mb-6 leading-relaxed">
        The application encountered an unexpected issue while loading on this device.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          Try Again ↺
        </button>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') window.location.href = '/';
          }}
          className="px-5 py-2.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
        >
          Reload Home ⌂
        </button>
      </div>
    </main>
  );
}

