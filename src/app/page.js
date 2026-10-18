'use client';

import React, { useState, useEffect } from 'react';
import HomePage from '../components/HomePage';
import ChessAnalyzer from '../components/ChessAnalyzer';

export default function Home() {
  const [view, setView] = useState('home'); // 'home' | 'analyzer'
  const [selectedPgn, setSelectedPgn] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedTheme = localStorage.getItem('chess-eval-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    setIsDark(initialDark);
    if (initialDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('chess-eval-theme', next ? 'dark' : 'light');
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

  if (!isMounted) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-slate-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
        <span className="text-sm text-zinc-400">Loading Chess Engine...</span>
      </main>
    );
  }

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
