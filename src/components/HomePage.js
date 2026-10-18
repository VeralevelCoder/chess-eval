'use client';

import React, { useState } from 'react';

const MORPHY_PGN = `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.??.??"]
[White "Morphy, Paul"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]
[ECO "C41"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

const KASPAROV_PGN = `[Event "Hoogovens A Tournament"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[Round "4"]
[White "Kasparov, Garry"]
[Black "Topalov, Veselin"]
[Result "1-0"]
[ECO "B07"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`;

export default function HomePage({ onSelectGame, isDark, toggleDarkMode }) {
  const [activeTab, setActiveTab] = useState('chesscom'); // 'chesscom' | 'pgn'
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [customPgn, setCustomPgn] = useState('');
  const [pgnError, setPgnError] = useState('');

  // Fetch Chess.com games
  const handleFetchGames = async (isLoadMore = false) => {
    const user = username.trim();
    if (!user) {
      setErrorMsg('Please enter a Chess.com username');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const offset = isLoadMore ? nextOffset : 0;
      const res = await fetch(`/api/chesscom?username=${encodeURIComponent(user)}&limit=5&offset=${offset}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to fetch games from Chess.com');
        setLoading(false);
        return;
      }

      if (isLoadMore) {
        setGames((prev) => [...prev, ...data.games]);
      } else {
        setGames(data.games || []);
        if (data.games && data.games.length === 0) {
          setErrorMsg(`No recent games found for "${user}".`);
        }
      }

      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error while connecting to Chess.com');
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setCustomPgn(text);
        setPgnError('');
      }
    };
    reader.onerror = () => setPgnError('Failed to read the selected file.');
    reader.readAsText(file);
  };

  const handleLaunchPgn = () => {
    if (!customPgn.trim()) {
      setPgnError('Please paste or upload a PGN first.');
      return;
    }
    onSelectGame(customPgn, 'Custom PGN');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Top Bar with Logo & Theme Toggle */}
      <header className="flex items-center justify-between pb-6 mb-8 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">♟️</span>
          <span className="font-extrabold text-xl tracking-tight text-zinc-900 dark:text-zinc-50">
            ChessEval
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            Stockfish WASM
          </span>
        </div>

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? (
            <>
              <span>☀️</span> <span>Light Mode</span>
            </>
          ) : (
            <>
              <span>🌙</span> <span>Dark Mode</span>
            </>
          )}
        </button>
      </header>

      {/* Hero Headline */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
          Analyze Any Chess Game
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
          Enter a Chess.com username to import your recent matches, or paste any PGN to get
          deep client-side Stockfish evaluation, move commentary, and blunder detection.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1">
            ⚡ 100% Free Client-Side Engine
          </span>
          <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1">
            🚨 Instant Blunder Alerts
          </span>
          <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1">
            📊 Move-by-Move Commentary
          </span>
        </div>
      </div>

      {/* Main Choice Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden mb-8 transition-colors">
        {/* Method Switcher Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
          <button
            onClick={() => setActiveTab('chesscom')}
            className={`flex-1 py-3.5 text-center text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'chesscom'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <span>♟️</span> Import from Chess.com
          </button>
          <button
            onClick={() => setActiveTab('pgn')}
            className={`flex-1 py-3.5 text-center text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'pgn'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <span>📝</span> Paste or Upload PGN
          </button>
        </div>

        {/* Tab 1 Content: Chess.com Profile Import */}
        {activeTab === 'chesscom' && (
          <div className="p-6">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Search Chess.com Profile
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Enter your username to pull your latest games and select one to analyze.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchGames(false)}
                placeholder="e.g. hikaru, magnuscarlsen, or your username"
                className="flex-1 px-4 py-2.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950"
              />
              <button
                onClick={() => handleFetchGames(false)}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? 'Fetching...' : 'Retrieve Games'}
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Games List */}
            {games.length > 0 && (
              <div className="flex flex-col gap-2.5 mt-4">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Latest Matches ({games.length} retrieved)
                </span>
                <div className="flex flex-col gap-2">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                            ⚪ {game.white.username} ({game.white.rating}) vs ⚫ {game.black.username} ({game.black.rating})
                          </span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {game.timeClass}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {game.date} • <strong className="text-zinc-700 dark:text-zinc-300">{game.outcome}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectGame(game.pgn, `${game.white.username} vs ${game.black.username}`)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
                      >
                        Analyze Game →
                      </button>
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <button
                    onClick={() => handleFetchGames(true)}
                    disabled={loading}
                    className="w-full py-2.5 mt-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-colors"
                  >
                    {loading ? 'Importing more...' : '⬇ Import 5 More Games'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2 Content: Paste or Upload PGN */}
        {activeTab === 'pgn' && (
          <div className="p-6">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Provide Game PGN
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Paste standard PGN text or choose a .pgn file from your computer.
            </p>

            <div className="flex flex-col gap-3">
              <textarea
                rows={5}
                value={customPgn}
                onChange={(e) => {
                  setCustomPgn(e.target.value);
                  setPgnError('');
                }}
                placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 ... or paste full PGN headers and moves"
                className="w-full p-3 font-mono text-xs border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <label className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 cursor-pointer border border-dashed border-zinc-300 dark:border-zinc-700 px-3 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  <span>📁 Upload .pgn file</span>
                  <input
                    type="file"
                    accept=".pgn,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleLaunchPgn}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                >
                  Start Analysis →
                </button>
              </div>

              {pgnError && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{pgnError}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Launch Sample Masterpieces */}
      <div className="bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 text-center sm:text-left">
          Or Try A Famous Chess Masterpiece
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => onSelectGame(MORPHY_PGN, 'Paul Morphy - Opera House (1858)')}
            className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left flex flex-col gap-1 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                Paul Morphy vs Duke Karl
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                1858 • 1-0
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              The legendary Paris Opera Game featuring iconic sacrifices and checkmate.
            </p>
          </button>

          <button
            onClick={() => onSelectGame(KASPAROV_PGN, "Garry Kasparov - Kasparov's Immortal (1999)")}
            className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left flex flex-col gap-1 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                Kasparov vs Topalov
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                1999 • 1-0
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              "Kasparov's Immortal", one of the greatest attacking chess games ever played.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

