'use client';

import React, { useState } from 'react';

// Curated collection of Recent Trending and Historic Masterpiece games
const CURATED_GAMES = {
  trending: [
    {
      id: 'gukesh-ding-2024',
      white: 'Gukesh, D.',
      black: 'Ding, Liren',
      event: 'World Championship 2024 (Game 11)',
      date: '2024.12.08',
      result: '1-0',
      tag: '👑 Youngest World Champ',
      tagColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      description: 'Gukesh uncorks the crushing 29. Qxc6! queen sacrifice to breach Ding Liren and pave his road to becoming the youngest World Champion in history at age 18.',
      pgn: `[Event "FIDE World Championship 2024"]
[Site "Singapore SGP"]
[Date "2024.12.08"]
[Round "11"]
[White "Gukesh, D."]
[Black "Ding, Liren"]
[Result "1-0"]
[ECO "A09"]

1. Nf3 d5 2. c4 d4 3. b4 c5 4. e3 Nf6 5. a3 Bg4 6. exd4 cxd4 7. h3 Bxf3 
8. Qxf3 Qc7 9. d3 a5 10. b5 Nbd7 11. g3 Nc5 12. Bg2 Nfd7 13. O-O Ne5 
14. Qf4 Rd8 15. Rd1 g6 16. a4 h5 17. b6 Qd6 18. Ba3 Bh6 19. Bxc5 Qxc5 
20. Qe4 Nc6 21. Na3 Rd7 22. Nc2 Qxb6 23. Rab1 Qc7 24. Rb5 O-O 25. Na1 Rb8 
26. Nb3 e6 27. Nc5 Re7 28. Rdb1 Qc8 29. Qxc6 1-0`,
    },
    {
      id: 'ding-nepo-2023',
      white: 'Nepomniachtchi, Ian',
      black: 'Ding, Liren',
      event: 'World Championship 2023 (Tiebreak 4)',
      date: '2023.04.30',
      result: '0-1',
      tag: '🔥 The Immortal Self-Pin',
      tagColor: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700',
      description: 'With seconds on the clock, Ding courageously plays 46... Rg6!! pinning his own rook to decline a draw and conquer the World Championship crown.',
      pgn: `[Event "FIDE World Championship 2023"]
[Site "Astana KAZ"]
[Date "2023.04.30"]
[Round "18"]
[White "Nepomniachtchi, Ian"]
[Black "Ding, Liren"]
[Result "0-1"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. d3 b5 7. Bb3 d6 8. a4
Bd7 9. h3 O-O 10. Be3 Na5 11. Ba2 bxa4 12. Nc3 Rb8 13. Bb1 Qe8 14. b3 c5
15. Nxa4 Nc6 16. Nc3 a5 17. Nd2 Be6 18. Nc4 d5 19. exd5 Nxd5 20. Bd2 Nxc3
21. Bxc3 Bxc4 22. bxc4 Bd8 23. Bd2 Bc7 24. c3 f5 25. Re1 Rd8 26. Ra2 Qg6
27. Qe2 Qd6 28. g3 Rde8 29. Qf3 e4 30. dxe4 Ne5 31. Qg2 Nd3 32. Bxd3 Qxd3
33. exf5 Rxe1+ 34. Bxe1 Qxc4 35. Ra1 Rxf5 36. Bd2 h6 37. Qc6 Rf7 38. Re1
Kh7 39. Be3 Be5 40. Qe8 Bxc3 41. Rc1 Rf6 42. Qd7 Qe2 43. Qd5 Bb4 44. Qe4+
Kg8 45. Qd5+ Kh7 46. Qe4+ Rg6 47. Qf5 c4 48. h4 Qd3 49. Qf3 Rf6 50. Qg4
c3 51. Rd1 Qg6 52. Qc8 Rc6 53. Qa8 Rd6 54. Rxd6 Qxd6 55. Qe4+ Qg6 56. Qc4
Qb1+ 57. Kh2 a4 58. Bd4 a3 59. Qc7 Qg6 60. Qc4 c2 61. Be3 Bd6 62. Kg2 h5
63. Kf1 Be5 64. g4 hxg4 65. h5 Qf5 66. Qd5 g3 67. f4 a2 0-1`,
    },
    {
      id: 'pragg-carlsen-2024',
      white: 'Praggnanandhaa, R.',
      black: 'Carlsen, Magnus',
      event: 'Norway Chess 2024 (Round 3)',
      date: '2024.05.29',
      result: '1-0',
      tag: '⚡ Pragg Outplays Carlsen',
      tagColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      description: '18-year-old Praggnanandhaa defeats World #1 Magnus Carlsen in classical chess on home soil in a sharp tactical Sicilian Kan battle.',
      pgn: `[Event "Norway Chess 2024"]
[Site "Stavanger NOR"]
[Date "2024.05.29"]
[Round "3"]
[White "Praggnanandhaa, R."]
[Black "Carlsen, Magnus"]
[Result "1-0"]
[ECO "B42"]

1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 a6 5. Bd3 Qc7 6. O-O Nf6 7. Qe2 d6 8. c4 Nbd7 9. Nc3 Ne5 10. h3 b6 11. f4 Nxd3 12. Qxd3 Bb7 13. f5 Qd7 14. Bg5 Be7 15. Rad1 Rc8 16. Qe2 e5 17. Bxf6 Bxf6 18. Nc2 Qc6 19. Ne3 Bg5 20. Kh1 Bxe3 21. Qxe3 f6 22. b3 b5 23. Nd5 Qc5 24. Qf3 bxc4 25. Qh5+ Kf8 26. Rf3 Bxd5 27. Rxd5 Qb6 28. bxc4 Rxc4 29. Rb3 Rb4 30. Rdd3 Rxb3 31. Rxb3 Qc7 32. Qd1 g6 33. Qb1 Qc5 34. Rb8+ Kg7 35. Rxh8 Kxh8 36. Qb8+ Kg7 37. Qb7+ 1-0`,
    },
  ],
  historic: [
    {
      id: 'fischer-byrne-1956',
      white: 'Byrne, Donald',
      black: 'Fischer, Robert James',
      event: 'Rosenwald Memorial 1956',
      date: '1956.10.17',
      result: '0-1',
      tag: '✨ Game of the Century',
      tagColor: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700',
      description: '13-year-old Bobby Fischer stuns the world with the immortal queen sacrifice 17... Be6!! leading to a spectacular windmill combination and checkmate.',
      pgn: `[Event "Third Rosenwald Trophy"]
[Site "New York, NY USA"]
[Date "1956.10.17"]
[Round "8"]
[White "Byrne, Donald"]
[Black "Fischer, Robert James"]
[Result "0-1"]
[ECO "D92"]

1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2# 0-1`,
    },
    {
      id: 'morphy-opera-1858',
      white: 'Morphy, Paul',
      black: 'Duke Karl / Count Isouard',
      event: 'Paris Opera House 1858',
      date: '1858.10.21',
      result: '1-0',
      tag: '👑 The Opera Game',
      tagColor: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      description: 'The golden standard of classical development and attack. Morphy sacrifices a knight, a bishop, and his queen for the aesthetic 17. Rd8# checkmate.',
      pgn: `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.??.??"]
[White "Morphy, Paul"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]
[ECO "C41"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`,
    },
    {
      id: 'kasparov-topalov-1999',
      white: 'Kasparov, Garry',
      black: 'Topalov, Veselin',
      event: 'Wijk aan Zee 1999',
      date: '1999.01.20',
      result: '1-0',
      tag: '💥 Kasparov\'s Immortal',
      tagColor: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700',
      description: 'Widely considered the greatest attacking game ever played. Kasparov sacrifices both rooks in a 15-move calculation to hunt the black king across the board.',
      pgn: `[Event "Hoogovens A Tournament"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[Round "4"]
[White "Kasparov, Garry"]
[Black "Topalov, Veselin"]
[Result "1-0"]
[ECO "B07"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`,
    },
    {
      id: 'anderssen-kieseritzky-1851',
      white: 'Anderssen, Adolf',
      black: 'Kieseritzky, Lionel',
      event: 'London 1851',
      date: '1851.06.21',
      result: '1-0',
      tag: '⚔️ The Immortal Game',
      tagColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      description: 'The romantic era at its peak. Anderssen boldly sacrifices both rooks, a bishop, and his queen to deliver a checkmate using only three minor pieces.',
      pgn: `[Event "London"]
[Site "London ENG"]
[Date "1851.06.21"]
[White "Anderssen, Adolf"]
[Black "Kieseritzky, Lionel"]
[Result "1-0"]

1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0`,
    },
  ],
};

export default function HomePage({ onSelectGame, isDark, toggleDarkMode }) {
  // Tabs: 'link' | 'username' | 'pgn'
  const [activeTab, setActiveTab] = useState('link');

  // Featured Masterpieces Category: 'trending' | 'historic'
  const [featuredCategory, setFeaturedCategory] = useState('trending');

  // On-demand toggle for curated matches (collapsed by default for clean beginner UX)
  const [showCuratedGames, setShowCuratedGames] = useState(false);

  // Tab 1: Game link / share text
  const [gameLinkInput, setGameLinkInput] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');

  // Tab 2: Username search
  const [username, setUsername] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  const [games, setGames] = useState([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [userError, setUserError] = useState('');

  // Tab 3: Raw PGN
  const [customPgn, setCustomPgn] = useState('');
  const [pgnError, setPgnError] = useState('');

  // Handle Game Link / Share Text Fetch
  const handleFetchFromLink = async () => {
    const text = gameLinkInput.trim();
    if (!text) {
      setLinkError('Please enter or paste a Chess.com game link or share text.');
      return;
    }

    setLinkLoading(true);
    setLinkError('');

    try {
      const res = await fetch('/api/chesscom/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLinkError(data.error || 'Failed to retrieve game from Chess.com');
        setLinkLoading(false);
        return;
      }

      if (data.pgn) {
        onSelectGame(data.pgn, data.title || 'Chess.com Game');
      } else {
        setLinkError('No move notation could be loaded for this game.');
      }
    } catch (err) {
      console.error(err);
      setLinkError('Network error while connecting to Chess.com');
    } finally {
      setLinkLoading(false);
    }
  };

  // Fetch games by Username
  const handleFetchGames = async (isLoadMore = false) => {
    const user = username.trim();
    if (!user) {
      setUserError('Please enter a Chess.com username');
      return;
    }

    setUserLoading(true);
    setUserError('');

    try {
      const offset = isLoadMore ? nextOffset : 0;
      const res = await fetch(`/api/chesscom?username=${encodeURIComponent(user)}&limit=5&offset=${offset}`);
      const data = await res.json();

      if (!res.ok) {
        setUserError(data.error || 'Failed to fetch games from Chess.com');
        setUserLoading(false);
        return;
      }

      if (isLoadMore) {
        setGames((prev) => [...prev, ...data.games]);
      } else {
        setGames(data.games || []);
        if (data.games && data.games.length === 0) {
          setUserError(`No recent games found for "${user}".`);
        }
      }

      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch (err) {
      console.error(err);
      setUserError('Network error while connecting to Chess.com');
    } finally {
      setUserLoading(false);
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
    // If user pasted a Chess.com URL into the PGN box, route it smartly to the link fetcher!
    if (customPgn.includes('chess.com/game') || customPgn.includes('chess.com/live')) {
      setGameLinkInput(customPgn);
      setActiveTab('link');
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
          className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
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
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
          Analyze Any Chess Game
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
          Paste a Chess.com game link, search your profile, or load a PGN to start reviewing your match.
        </p>
      </div>

      {/* Main Choice Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden mb-8 transition-colors">
        {/* Method Switcher Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-3.5 text-center text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'link'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <span>🔗</span> Paste Game Link
          </button>
          <button
            onClick={() => setActiveTab('username')}
            className={`flex-1 py-3.5 text-center text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'username'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <span>♟️</span> Chess.com Profile
          </button>
          <button
            onClick={() => setActiveTab('pgn')}
            className={`flex-1 py-3.5 text-center text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'pgn'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <span>📝</span> Paste / Upload PGN
          </button>
        </div>

        {/* TAB 1: Direct Game Link / Share Text */}
        {activeTab === 'link' && (
          <div className="p-6">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Direct Game Link or Share Text
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Paste the share text or link from Chess.com to immediately import and analyze the game.
            </p>

            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={gameLinkInput}
                onChange={(e) => {
                  setGameLinkInput(e.target.value);
                  setLinkError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchFromLink()}
                placeholder="e.g. Check out this #chess game: goofygen vs iamVekkey - https://www.chess.com/game/live/184745920638"
                className="w-full px-4 py-3 text-xs sm:text-sm border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950 font-mono"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Accepts full share text, game URLs (`/game/live/...`), or game IDs.
                </span>

                <button
                  onClick={handleFetchFromLink}
                  disabled={linkLoading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {linkLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Loading Game...</span>
                    </>
                  ) : (
                    <span>Analyze Game Now →</span>
                  )}
                </button>
              </div>

              {linkError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
                  {linkError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Chess.com Username Profile Search */}
        {activeTab === 'username' && (
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
                disabled={userLoading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {userLoading ? 'Fetching...' : 'Retrieve Games'}
              </button>
            </div>

            {userError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
                {userError}
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
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap self-start sm:self-auto"
                      >
                        Analyze Game →
                      </button>
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <button
                    onClick={() => handleFetchGames(true)}
                    disabled={userLoading}
                    className="w-full py-2.5 mt-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-colors"
                  >
                    {userLoading ? 'Importing more...' : '⬇ Import 5 More Games'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Paste or Upload PGN */}
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
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
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

      {/* On-Demand Featured Matches: Recent Trending & Historic Masterpieces */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-xs transition-colors">
        <button
          onClick={() => setShowCuratedGames((prev) => !prev)}
          className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-lg shrink-0">
              🏆
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Explore Famous & Historic Matches</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                  On Demand
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Don't have a game? Click to load famous matches by Gukesh, Carlsen, Fischer, and Morphy.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0 ml-3">
            <span>{showCuratedGames ? 'Hide Matches ▲' : 'View Matches ▼'}</span>
          </div>
        </button>

        {showCuratedGames && (
          <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose a game to load moves and start analysis:
              </span>

              {/* Category Toggle Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 text-xs font-bold self-start sm:self-auto">
                <button
                  onClick={() => setFeaturedCategory('trending')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    featuredCategory === 'trending'
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <span>🔥</span>
                  <span>Trending ({CURATED_GAMES.trending.length})</span>
                </button>
                <button
                  onClick={() => setFeaturedCategory('historic')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    featuredCategory === 'historic'
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <span>🏛️</span>
                  <span>Historic ({CURATED_GAMES.historic.length})</span>
                </button>
              </div>
            </div>

            {/* Matches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {CURATED_GAMES[featuredCategory].map((game) => (
                <div
                  key={game.id}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {game.white} vs {game.black}
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {game.event}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {game.result}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${game.tagColor}`}>
                        {game.tag}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                        {game.date}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {game.description}
                    </p>
                  </div>

                  <button
                    onClick={() => onSelectGame(game.pgn, `${game.white} vs ${game.black} (${game.date.slice(0, 4)})`)}
                    className="w-full py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800/80 hover:border-transparent transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Analyze Match</span>
                    <span>→</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
