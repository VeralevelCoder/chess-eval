'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import HomePage from '../components/HomePage';

// Dynamically import ChessAnalyzer so the heavy engine & chessboard bundles
// are NOT loaded on initial page load, ensuring instant load time on mobile devices.
const ChessAnalyzer = dynamic(() => import('../components/ChessAnalyzer'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-zinc-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-10 h-10 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-3" />
      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Loading Analysis Board...
      </span>
      <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
        Preparing engine and interactive board
      </span>
    </div>
  ),
});

function safeGetStorage(key) {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetStorage(key, val) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, val);
    }
  } catch {}
}

export default function Home() {
  const [view, setView] = useState('home'); // 'home' | 'analyzer'
  const [selectedPgn, setSelectedPgn] = useState('');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = safeGetStorage('chess-eval-theme');
      const prefersDark =
        typeof window !== 'undefined' && window.matchMedia
          ? Boolean(window.matchMedia('(prefers-color-scheme: dark)')?.matches)
          : false;
      const initialDark = savedTheme ? savedTheme === 'dark' : prefersDark;
      setIsDark(initialDark);
      if (initialDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.warn('Theme initialization fallback:', e);
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      safeSetStorage('chess-eval-theme', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const handleSelectGame = (pgn) => {
    setSelectedPgn(pgn);
    setView('analyzer');
  };

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-slate-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      {view === 'home' ? (
        <HomePage
          onSelectGame={handleSelectGame}
          isDark={isDark}
          toggleDarkMode={toggleDarkMode}
        />
      ) : (
        <ChessAnalyzer
          initialPgn={selectedPgn}
          onBackToHome={() => setView('home')}
          isDark={isDark}
          toggleDarkMode={toggleDarkMode}
        />
      )}
    </main>
  );
}
