'use client';

import React, { useEffect } from 'react';

export default function RecentGamesReviewModal({
  isOpen,
  onClose,
  summary,
  onSelectGame,
}) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !summary) return null;

  const {
    username,
    totalGames,
    wins,
    losses,
    draws,
    winRate,
    ratingDelta,
    latestRating,
    trend,
    whiteStats,
    blackStats,
    strengths,
    mistakes,
    coachAdvice,
    games,
  } = summary;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recent-games-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full my-auto flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Sticky Header */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl select-none">{trend.icon}</span>
            <div className="min-w-0">
              <h2
                id="recent-games-title"
                className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-zinc-100 truncate"
              >
                Last {totalGames} Games Review
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span>Player:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                  ♟️ {username}
                </span>
                {latestRating && (
                  <span className="font-mono text-[11px] bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.2 rounded font-bold">
                    {latestRating}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close review modal"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5">
          
          {/* Trend & Form Hero Banner */}
          <div className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-emerald-50/60 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-emerald-950/20 flex flex-col gap-2.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${trend.badgeClass}`}>
                <span>{trend.icon}</span>
                <span>{trend.title}</span>
              </span>

              {/* Record Summary */}
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  {wins}W
                </span>
                <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700">
                  {losses}L
                </span>
                {draws > 0 && (
                  <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                    {draws}D
                  </span>
                )}
                {ratingDelta !== 0 && (
                  <span
                    className={`ml-1 font-mono text-xs ${
                      ratingDelta > 0
                        ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                        : 'text-orange-600 dark:text-orange-400 font-extrabold'
                    }`}
                  >
                    {ratingDelta > 0 ? `+${ratingDelta}` : ratingDelta} pts
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
              {trend.summary}
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Win Rate
              </span>
              <span className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {winRate}%
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {wins} of {totalGames} matches
              </span>
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Rating Shift
              </span>
              <span
                className={`text-lg font-extrabold mt-0.5 ${
                  ratingDelta > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : ratingDelta < 0
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {ratingDelta > 0 ? `+${ratingDelta}` : ratingDelta === 0 ? '±0' : ratingDelta}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                over recent matches
              </span>
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <span>⚪</span> As White
              </span>
              <span className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {whiteStats.played > 0 ? `${whiteStats.winRate}%` : '—'}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {whiteStats.wins}W / {whiteStats.played} games
              </span>
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <span>⚫</span> As Black
              </span>
              <span className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {blackStats.played > 0 ? `${blackStats.winRate}%` : '—'}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {blackStats.wins}W / {blackStats.played} games
              </span>
            </div>
          </div>

          {/* Strengths & Mistakes Side-by-Side (or stacked on mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Common Strengths (Good Steps) */}
            <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                <span>🌟</span>
                <span>Common Strengths & Habits</span>
              </div>
              <div className="space-y-2">
                {strengths.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white dark:bg-zinc-900/90 border border-emerald-100 dark:border-emerald-800/40 text-xs flex flex-col gap-1 shadow-2xs"
                  >
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span>{item.icon}</span>
                      <span>{item.title}</span>
                    </span>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Mistakes & Vulnerabilities */}
            <div className="p-3.5 sm:p-4 rounded-xl border border-orange-200 dark:border-orange-800/60 bg-orange-50/40 dark:bg-orange-950/20 flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-orange-900 dark:text-orange-200 uppercase tracking-wider">
                <span>🚨</span>
                <span>Common Vulnerabilities</span>
              </div>
              <div className="space-y-2">
                {mistakes.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white dark:bg-zinc-900/90 border border-orange-100 dark:border-orange-800/40 text-xs flex flex-col gap-1 shadow-2xs"
                  >
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span>{item.icon}</span>
                      <span>{item.title}</span>
                    </span>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coach Advice */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-lg shadow-2xs shrink-0 select-none">
              🧙‍♂️
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 block">
                Coach's Takeaway & Action Plan
              </span>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                {coachAdvice}
              </p>
            </div>
          </div>

          {/* Reviewed Matches List with 1-Click "Analyze Match" */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Reviewed Matches ({games.length})
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Click any match to analyze
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {games.map((game, idx) => {
                const isWin = game.userResult === 'win';
                const isLoss = game.userResult === 'loss';
                const badgeColor = isWin
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : isLoss
                  ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700';

                return (
                  <div
                    key={game.id || idx}
                    className="p-2.5 sm:p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-400 dark:hover:border-blue-600 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${badgeColor}`}>
                          {game.userResult.toUpperCase()}
                        </span>
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {game.userColor === 'white' ? '⚪ As White' : '⚫ As Black'} vs {game.opponentName} ({game.opponentRating || '?'})
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                          {game.moveCount > 0 ? `${game.moveCount} moves` : ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {game.openingName} • {game.date || 'Recent'}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (onSelectGame) {
                          onSelectGame(
                            game.pgn,
                            `${game.userColor === 'white' ? username : game.opponentName} vs ${game.userColor === 'black' ? username : game.opponentName}`,
                            game.rawGame
                          );
                        }
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800 hover:border-transparent transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <span>Analyze Match</span>
                      <span>→</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-950/40">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline">
            💡 Calculated instantly 100% on-device with zero external AI delays.
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl transition-colors cursor-pointer ml-auto"
          >
            Close Summary
          </button>
        </div>

      </div>
    </div>
  );
}

