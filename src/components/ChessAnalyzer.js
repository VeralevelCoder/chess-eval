'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import useStockfish from '../hooks/useStockfish';

const SAMPLE_PGN = `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.??.??"]
[White "Morphy, Paul"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]
[ECO "C41"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Classify move based on evaluation drop from the moving player's perspective
function classifyMove(evalLoss, isCheckmate, isDeliveredCheckmate, bestMove, san) {
  if (isDeliveredCheckmate || san.includes('#')) {
    return {
      type: 'checkmate',
      label: 'Checkmate',
      badgeClass: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700',
      icon: '👑',
      symbol: '#',
      color: 'text-purple-600 dark:text-purple-400',
    };
  }

  if (evalLoss === null || evalLoss === undefined) {
    return {
      type: 'evaluating',
      label: 'Analyzing',
      badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
      icon: '⏳',
      symbol: '',
      color: 'text-zinc-500',
    };
  }

  // evalLoss in centipawns: positive = advantage lost, negative = advantage gained
  if (evalLoss <= 15) {
    return {
      type: 'best',
      label: 'Best Move',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      icon: '🌟',
      symbol: '★',
      color: 'text-emerald-600 dark:text-emerald-400',
    };
  } else if (evalLoss <= 45) {
    return {
      type: 'excellent',
      label: 'Excellent',
      badgeClass: 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700',
      icon: '✨',
      symbol: '!',
      color: 'text-teal-600 dark:text-teal-400',
    };
  } else if (evalLoss <= 90) {
    return {
      type: 'good',
      label: 'Good',
      badgeClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      icon: '👍',
      symbol: '✓',
      color: 'text-blue-600 dark:text-blue-400',
    };
  } else if (evalLoss <= 180) {
    return {
      type: 'inaccuracy',
      label: 'Inaccuracy',
      badgeClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      icon: '⚠️',
      symbol: '?!',
      color: 'text-amber-600 dark:text-amber-400',
    };
  } else if (evalLoss <= 300) {
    return {
      type: 'mistake',
      label: 'Mistake',
      badgeClass: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700',
      icon: '❌',
      symbol: '?',
      color: 'text-orange-600 dark:text-orange-400',
    };
  } else {
    return {
      type: 'blunder',
      label: 'Blunder',
      badgeClass: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700',
      icon: '🚨',
      symbol: '??',
      color: 'text-red-600 dark:text-red-400',
    };
  }
}

// Determine how the game ended (win by resignation, win by checkmate, draw by stalemate, etc.)
function getGameTermination(gameHeaders, moves, finalFen) {
  const result = gameHeaders.Result || '*';
  const termination = gameHeaders.Termination || '';
  const white = gameHeaders.White || 'White';
  const black = gameHeaders.Black || 'Black';

  let isMate = false;
  let isStalemate = false;
  let isThreefold = false;
  let isInsufficient = false;

  if (finalFen) {
    try {
      const c = new Chess(finalFen);
      isMate = c.isCheckmate();
      isStalemate = c.isStalemate();
      isThreefold = typeof c.isThreefoldRepetition === 'function' && c.isThreefoldRepetition();
      isInsufficient = typeof c.isInsufficientMaterial === 'function' && c.isInsufficientMaterial();
    } catch {}
  }

  const lastMove = moves && moves.length > 0 ? moves[moves.length - 1] : null;
  if (lastMove && lastMove.san.includes('#')) {
    isMate = true;
  }

  if (isMate) {
    const winner = result === '1-0' ? white : result === '0-1' ? black : lastMove?.isWhite ? white : black;
    const loser = winner === white ? black : white;
    return {
      type: 'checkmate',
      title: `${winner} won by checkmate`,
      badge: 'Win by Checkmate',
      icon: '👑',
      badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700',
      description: `${winner} delivered checkmate with ${lastMove?.san || 'the final move'}. ${loser}'s king is in check with no escape squares.`,
    };
  }

  if (isStalemate) {
    return {
      type: 'stalemate',
      title: 'Draw by stalemate',
      badge: 'Draw by Stalemate',
      icon: '🤝',
      badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700',
      description: 'The side to move has no legal moves and is not in check. The game ends in a draw by stalemate.',
    };
  }

  if (isThreefold) {
    return {
      type: 'draw',
      title: 'Draw by threefold repetition',
      badge: 'Draw by Repetition',
      icon: '🤝',
      badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700',
      description: 'The exact same position occurred three times. The game ends in a draw.',
    };
  }

  if (isInsufficient) {
    return {
      type: 'draw',
      title: 'Draw by insufficient material',
      badge: 'Insufficient Material',
      icon: '🤝',
      badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700',
      description: 'Neither player has enough pieces to force checkmate.',
    };
  }

  const termLower = termination.toLowerCase();
  if (termLower.includes('resignation') || termLower.includes('resigned')) {
    const winner = result === '1-0' ? white : result === '0-1' ? black : white;
    const loser = winner === white ? black : white;
    return {
      type: 'resignation',
      title: `${winner} won by resignation`,
      badge: 'Win by Resignation',
      icon: '🏳️',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      description: `${loser} resigned the match after ${lastMove ? lastMove.san : 'the final move'}. ${winner} wins by resignation.`,
    };
  }

  if (termLower.includes('time') || termLower.includes('timeout')) {
    const winner = result === '1-0' ? white : result === '0-1' ? black : white;
    const loser = winner === white ? black : white;
    return {
      type: 'timeout',
      title: `${winner} won on time`,
      badge: 'Win on Time',
      icon: '⏱️',
      badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      description: `${loser} ran out of time on the clock. ${winner} wins on time.`,
    };
  }

  if (termLower.includes('agreement') || termLower.includes('agreed')) {
    return {
      type: 'draw',
      title: 'Draw by mutual agreement',
      badge: 'Draw by Agreement',
      icon: '🤝',
      badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700',
      description: 'Both players agreed to a draw.',
    };
  }

  if (result === '1-0') {
    return {
      type: 'win',
      title: `${white} won (1-0)`,
      badge: `${white} Won (1-0)`,
      icon: '🏆',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      description: termination || `White (${white}) won the game.`,
    };
  } else if (result === '0-1') {
    return {
      type: 'win',
      title: `${black} won (0-1)`,
      badge: `${black} Won (0-1)`,
      icon: '🏆',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      description: termination || `Black (${black}) won the game.`,
    };
  } else if (result === '1/2-1/2') {
    return {
      type: 'draw',
      title: 'Draw (1/2-1/2)',
      badge: 'Draw (1/2-1/2)',
      icon: '🤝',
      badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700',
      description: termination || 'The match concluded in a draw.',
    };
  }

  return null;
}

// Convert UCI move (e.g. "e2e4", "g1f3", "e7e8q") to SAN (e.g. "e4", "Nf3", "e8=Q")
function uciToSan(fen, uci) {
  if (!fen || !uci || uci.length < 4) return uci || '';
  try {
    const c = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
    const moveRes = c.move({ from, to, promotion });
    return moveRes ? moveRes.san : uci;
  } catch {
    return uci;
  }
}

// Convert PV (Principal Variation) string into an array of readable moves with FENs
function pvToSanList(fen, pvString, maxMoves = 6) {
  if (!fen || !pvString) return [];
  try {
    const c = new Chess(fen);
    const tokens = pvString.trim().split(/\s+/).slice(0, maxMoves);
    const result = [];
    for (let uci of tokens) {
      if (uci.length < 4) break;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
      const turn = c.turn();
      const moveNum = c.moveNumber ? c.moveNumber() : Math.floor(c.history().length / 2) + 1;
      const moveRes = c.move({ from, to, promotion });
      if (!moveRes) break;
      result.push({
        san: moveRes.san,
        uci,
        from,
        to,
        turn,
        moveNum,
        fenAfter: c.fen(),
      });
    }
    return result;
  } catch {
    return [];
  }
}

// Apply a UCI move to a FEN position and return the resulting FEN & details
function applyUciMove(fen, uci) {
  if (!fen || !uci || uci.length < 4) return null;
  try {
    const c = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
    const moveRes = c.move({ from, to, promotion });
    if (moveRes) {
      return {
        fen: c.fen(),
        san: moveRes.san,
        from,
        to,
        piece: moveRes.piece,
        color: moveRes.color,
      };
    }
  } catch {}
  return null;
}

// Generate contextual commentary explaining how well or bad the move was
function generateCommentary(move, prevEval, currEval, classification, playerName, isLastMove = false, gameTermination = null) {
  if (!move) {
    return {
      headline: 'Game Start • Initial Position',
      body: 'Standard starting setup with equal chances (0.00). White holds first-move initiative.',
    };
  }

  const san = move.san;
  const isWhite = move.isWhite;
  const who = playerName || (isWhite ? 'White' : 'Black');
  const opponent = isWhite ? 'Black' : 'White';

  // Last Move with Game Conclusion
  if (isLastMove && gameTermination) {
    if (gameTermination.type === 'checkmate') {
      return {
        headline: `👑 Checkmate! ${who} delivers the final blow with ${san}`,
        body: gameTermination.description,
      };
    } else if (gameTermination.type === 'resignation') {
      return {
        headline: `🏳️ ${who} played ${san} • ${gameTermination.title}`,
        body: `Following ${san}, ${gameTermination.description}`,
      };
    } else if (gameTermination.type === 'stalemate') {
      return {
        headline: `🤝 Draw by Stalemate • ${san}`,
        body: `Following ${san}, ${gameTermination.description}`,
      };
    } else if (gameTermination.type === 'timeout') {
      return {
        headline: `⏱️ ${gameTermination.title} • ${san}`,
        body: `After ${san}, ${gameTermination.description}`,
      };
    } else if (gameTermination.type === 'draw') {
      return {
        headline: `🤝 ${gameTermination.title}`,
        body: `After ${who} played ${san}, ${gameTermination.description}`,
      };
    }
  }

  if (classification.type === 'checkmate') {
    return {
      headline: `👑 Checkmate! ${who} delivers the final blow with ${san}`,
      body: `Game over. ${who} finishes the game decisively with ${san}, leaving ${opponent}'s king with no legal escape squares.`,
    };
  }

  if (!currEval || !prevEval) {
    return {
      headline: `${who} played ${san}`,
      body: `Calculating position evaluation with Stockfish...`,
    };
  }

  const prevScore = prevEval.scoreText || '0.00';
  const currScore = currEval.scoreText || '0.00';
  const isCapture = san.includes('x');
  const isCheck = san.includes('+');
  const isCastle = san.includes('O-O');
  const bestAltSan = currEval.bestMove ? uciToSan(move.fen, currEval.bestMove) : '';
  const bestAlt = bestAltSan ? `Stockfish suggests ${bestAltSan} as the top follow-up.` : '';

  // Centipawns lost from moving player's perspective
  const evalDiff = currEval.value - prevEval.value;
  const evalLoss = isWhite ? -evalDiff : evalDiff;
  const pawnsLoss = Math.abs(evalLoss / 100).toFixed(2);

  let tacticalNote = '';
  if (isCastle) {
    tacticalNote = 'Castles king to safety and activates the rook.';
  } else if (isCheck) {
    tacticalNote = 'Delivers check, directly testing the opponent king.';
  } else if (isCapture) {
    tacticalNote = 'Executes a tactical capture to challenge material balance.';
  } else if (san.startsWith('N') || san.startsWith('B')) {
    tacticalNote = 'Develops a minor piece to contest key central squares.';
  }

  switch (classification.type) {
    case 'best':
      return {
        headline: `🌟 Best Move! ${who} plays ${san}`,
        body: `${who} found the optimal move (${currScore}). ${tacticalNote || 'Maintains ideal coordination and pressure.'} ${bestAlt}`,
      };
    case 'excellent':
      return {
        headline: `✨ Excellent Move! ${who} plays ${san}`,
        body: `A very strong continuation (${currScore}). Slipped by only ${pawnsLoss} pawns, preserving almost full advantage.`,
      };
    case 'good':
      return {
        headline: `👍 Good Move: ${who} plays ${san}`,
        body: `A solid, playable choice. Evaluation shifted from ${prevScore} to ${currScore} (dropped ${pawnsLoss} pawns). ${tacticalNote}`,
      };
    case 'inaccuracy':
      return {
        headline: `⚠️ Inaccuracy: ${who} plays ${san}`,
        body: `${who} slipped by ${pawnsLoss} pawns (eval shifted to ${currScore}). This allows ${opponent} breathing room or counterplay. ${bestAlt}`,
      };
    case 'mistake':
      return {
        headline: `❌ Mistake by ${who}: ${san}`,
        body: `A noticeable error that surrendered ${pawnsLoss} pawns in evaluation (moved from ${prevScore} to ${currScore}). ${opponent} now seizes an advantage. ${bestAlt}`,
      };
    case 'blunder':
      return {
        headline: `🚨 Critical BLUNDER by ${who}: ${san}`,
        body: `Major error! ${who} dropped ${pawnsLoss} pawns in evaluation (swung from ${prevScore} to ${currScore}). This drastically shifts the game outcome. ${bestAlt}`,
      };
    default:
      return {
        headline: `${who} played ${san}`,
        body: `Position evaluated at ${currScore}.`,
      };
  }
}

export default function ChessAnalyzer({
  initialPgn,
  onBackToHome,
  isDark: externalIsDark,
  toggleDarkMode: externalToggleDarkMode,
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [internalIsDark, setInternalIsDark] = useState(false);

  const isDark = externalIsDark !== undefined ? externalIsDark : internalIsDark;

  // Active input mode: 'pgn' | 'chesscom'
  const [activeTab, setActiveTab] = useState('pgn');

  // Game & Move states
  const [pgnText, setPgnText] = useState(initialPgn || SAMPLE_PGN);
  const [moves, setMoves] = useState([]);
  const [gameHeaders, setGameHeaders] = useState({});
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0); // 0 = start position, 1..N = moves
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [evalDepth, setEvalDepth] = useState(12);
  const [errorMsg, setErrorMsg] = useState('');

  // Cache evaluations by move index
  const [evalCache, setEvalCache] = useState({});

  // Auto-analysis state
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const cancelAnalysisRef = useRef(false);

  // Chess.com Profile Import States
  const [chesscomUsername, setChesscomUsername] = useState('');
  const [chesscomGames, setChesscomGames] = useState([]);
  const [chesscomLoading, setChesscomLoading] = useState(false);
  const [chesscomHasMore, setChesscomHasMore] = useState(false);
  const [chesscomNextOffset, setChesscomNextOffset] = useState(0);
  const [chesscomError, setChesscomError] = useState('');
  const [activeGameId, setActiveGameId] = useState('');

  // Chess.com Direct Game Link States
  const [analyzerLinkInput, setAnalyzerLinkInput] = useState('');
  const [analyzerLinkLoading, setAnalyzerLinkLoading] = useState(false);
  const [analyzerLinkError, setAnalyzerLinkError] = useState('');

  // Guide lines and visual suggestion states
  const [showGuideLines, setShowGuideLines] = useState(true);
  const [showBestMoveArrow, setShowBestMoveArrow] = useState(true);
  const [showPlayedMoveArrow, setShowPlayedMoveArrow] = useState(true);
  const [showAlternativeArrow, setShowAlternativeArrow] = useState(true);
  const [previewState, setPreviewState] = useState(null); // { fen, moveSan, from, to, description }

  const { isReady, evaluating, evaluation, evaluatePosition, evaluatePositionAsync, stop } = useStockfish();

  // Dark mode initialization
  useEffect(() => {
    setIsMounted(true);
    if (externalIsDark === undefined) {
      const savedTheme = localStorage.getItem('chess-eval-theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialDark = savedTheme ? savedTheme === 'dark' : prefersDark;
      setInternalIsDark(initialDark);
      if (initialDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [externalIsDark]);

  const toggleDarkMode = () => {
    if (externalToggleDarkMode) {
      externalToggleDarkMode();
      return;
    }
    setInternalIsDark((prev) => {
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

  // Handle Chess.com direct game link / share text
  const handleFetchAnalyzerLink = useCallback(async (textToFetch) => {
    const text = (textToFetch || analyzerLinkInput).trim();
    if (!text) {
      setAnalyzerLinkError('Please enter a Chess.com game link or share text.');
      return;
    }

    setAnalyzerLinkLoading(true);
    setAnalyzerLinkError('');

    try {
      const res = await fetch('/api/chesscom/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAnalyzerLinkError(data.error || 'Failed to retrieve game from Chess.com');
        setAnalyzerLinkLoading(false);
        return;
      }

      if (data.pgn) {
        setPgnText(data.pgn);
        // Direct parse
        const chess = new Chess();
        chess.loadPgn(data.pgn, { strict: false });
        const headers = chess.header ? chess.header() : {};
        setGameHeaders(headers);

        const replay = new Chess();
        const history = chess.history({ verbose: true });
        const parsedMoves = [];

        for (let i = 0; i < history.length; i++) {
          const move = history[i];
          replay.move(move);
          parsedMoves.push({
            san: move.san,
            from: move.from,
            to: move.to,
            fen: replay.fen(),
            moveNumber: Math.floor(i / 2) + 1,
            isWhite: i % 2 === 0,
            player: i % 2 === 0 ? 'White' : 'Black',
          });
        }

        setMoves(parsedMoves);
        setCurrentMoveIndex(0);
        setEvalCache({});
        setErrorMsg('');
        setIsAnalyzingAll(false);
        setActiveGameId(data.gameId);
        setAnalyzerLinkInput('');
      } else {
        setAnalyzerLinkError('No move notation could be loaded for this game.');
      }
    } catch (err) {
      console.error(err);
      setAnalyzerLinkError('Network error while connecting to Chess.com');
    } finally {
      setAnalyzerLinkLoading(false);
    }
  }, [analyzerLinkInput]);

  // Parse a PGN string into game headers and move list with FENs
  const loadPgnString = useCallback((pgn, gameId = '') => {
    const trimmed = (pgn || '').trim();
    if (
      trimmed.includes('chess.com/game') ||
      trimmed.includes('chess.com/live') ||
      trimmed.includes('chess.com/daily') ||
      trimmed.includes('Check out this #chess game')
    ) {
      handleFetchAnalyzerLink(trimmed);
      return;
    }

    try {
      const chess = new Chess();
      chess.loadPgn(pgn, { strict: false });

      const headers = chess.header ? chess.header() : {};
      setGameHeaders(headers);

      // Re-play moves step by step to capture FEN and SAN for each position
      const replay = new Chess();
      const history = chess.history({ verbose: true });
      const parsedMoves = [];

      for (let i = 0; i < history.length; i++) {
        const move = history[i];
        replay.move(move);
        parsedMoves.push({
          san: move.san,
          from: move.from,
          to: move.to,
          fen: replay.fen(),
          moveNumber: Math.floor(i / 2) + 1,
          isWhite: i % 2 === 0,
          player: i % 2 === 0 ? 'White' : 'Black',
        });
      }

      setMoves(parsedMoves);
      setCurrentMoveIndex(0);
      setEvalCache({});
      setErrorMsg('');
      setIsAnalyzingAll(false);
      setActiveGameId(gameId);
    } catch (err) {
      console.error('Failed to parse PGN:', err);
      setErrorMsg('Invalid PGN format. Please verify the move notation.');
    }
  }, [handleFetchAnalyzerLink]);

  // Initial load
  useEffect(() => {
    const pgnToLoad = initialPgn || SAMPLE_PGN;
    setPgnText(pgnToLoad);
    loadPgnString(pgnToLoad);
  }, [initialPgn, loadPgnString]);

  // Current board FEN
  const currentFen = useMemo(() => {
    if (currentMoveIndex === 0 || moves.length === 0) {
      return START_FEN;
    }
    const move = moves[currentMoveIndex - 1];
    return move ? move.fen : START_FEN;
  }, [currentMoveIndex, moves]);

  // Evaluate position when current move index changes (if not running batch analysis)
  useEffect(() => {
    if (!isReady || !currentFen || isAnalyzingAll) return;

    if (!evalCache[currentMoveIndex]) {
      evaluatePosition(currentFen, evalDepth);
    }
  }, [currentMoveIndex, currentFen, evalDepth, isReady, evaluatePosition, evalCache, isAnalyzingAll]);

  // Store live evaluation in cache
  useEffect(() => {
    if (evaluation && evaluation.depth > 0 && !isAnalyzingAll) {
      setEvalCache((prev) => ({
        ...prev,
        [currentMoveIndex]: {
          ...evaluation,
        },
      }));
    }
  }, [evaluation, currentMoveIndex, isAnalyzingAll]);

  // Active evaluation to display for the selected move
  const activeEval = evalCache[currentMoveIndex] || evaluation;

  // Compute classifications for all evaluated moves
  const moveClassifications = useMemo(() => {
    const map = {};
    for (let i = 1; i <= moves.length; i++) {
      const prev = evalCache[i - 1];
      const curr = evalCache[i];
      const move = moves[i - 1];

      if (!prev || !curr) {
        map[i] = {
          type: 'evaluating',
          label: 'Pending',
          symbol: '',
          icon: '⏳',
          badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
        };
        continue;
      }

      const isDeliveredCheckmate = curr.type === 'mate' && curr.value === 0;
      const isCheckmate = curr.type === 'mate' || prev.type === 'mate';

      if (curr.type === 'mate' && prev.type !== 'mate') {
        const isWhiteMating = curr.value > 0;
        const playerMated = move.isWhite ? isWhiteMating : !isWhiteMating;
        if (playerMated) {
          map[i] = classifyMove(0, true, true, curr.bestMove, move.san);
        } else {
          map[i] = classifyMove(500, true, false, curr.bestMove, move.san);
        }
        continue;
      }

      const evalDiff = curr.value - prev.value;
      const evalLoss = move.isWhite ? -evalDiff : evalDiff;
      map[i] = classifyMove(evalLoss, isCheckmate, isDeliveredCheckmate, curr.bestMove, move.san);
    }
    return map;
  }, [moves, evalCache]);

  // Final board FEN to analyze checkmate/stalemate/draw condition
  const finalFen = useMemo(() => {
    if (moves.length === 0) return START_FEN;
    return moves[moves.length - 1].fen;
  }, [moves]);

  // Determine game termination / outcome (checkmate, resignation, stalemate, time, etc.)
  const gameTermination = useMemo(() => {
    return getGameTermination(gameHeaders, moves, finalFen);
  }, [gameHeaders, moves, finalFen]);

  // Current move commentary
  const currentCommentary = useMemo(() => {
    if (currentMoveIndex === 0) {
      return generateCommentary(null, null, activeEval, { type: 'neutral' }, 'Starting Position');
    }
    const move = moves[currentMoveIndex - 1];
    const prevEval = evalCache[currentMoveIndex - 1];
    const currEval = evalCache[currentMoveIndex];
    const classification = moveClassifications[currentMoveIndex] || { type: 'evaluating', label: 'Analyzing' };
    const playerName = move.isWhite ? (gameHeaders.White || 'White') : (gameHeaders.Black || 'Black');
    const isLastMove = currentMoveIndex === moves.length;

    return generateCommentary(move, prevEval, currEval, classification, playerName, isLastMove, gameTermination);
  }, [currentMoveIndex, moves, evalCache, activeEval, moveClassifications, gameHeaders, gameTermination]);

  const currentClassification = moveClassifications[currentMoveIndex] || {
    type: 'evaluating',
    label: 'Analyzing',
    badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
    icon: '⏳',
  };

  // Best move for current position
  const currentBestMove = useMemo(() => {
    if (!activeEval || !activeEval.bestMove || activeEval.bestMove.length < 4 || activeEval.bestMove === '(none)') {
      return null;
    }
    const uci = activeEval.bestMove;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const san = uciToSan(currentFen, uci);
    return {
      uci,
      from,
      to,
      san,
      applied: applyUciMove(currentFen, uci),
    };
  }, [activeEval, currentFen]);

  // Continuation line (PV) in SAN
  const currentContinuation = useMemo(() => {
    if (!activeEval || !activeEval.pv) return [];
    return pvToSanList(currentFen, activeEval.pv, 6);
  }, [activeEval, currentFen]);

  // What was best instead of the current move (if current move was a mistake/blunder/inaccuracy)
  const previousAlternative = useMemo(() => {
    if (currentMoveIndex === 0) return null;
    const isError = ['inaccuracy', 'mistake', 'blunder'].includes(currentClassification?.type);
    if (!isError) return null;

    const prevFen = currentMoveIndex > 1 ? moves[currentMoveIndex - 2]?.fen : START_FEN;
    const prevEval = evalCache[currentMoveIndex - 1];
    if (!prevEval || !prevEval.bestMove || prevEval.bestMove.length < 4 || prevEval.bestMove === '(none)') {
      return null;
    }

    const uci = prevEval.bestMove;
    const playedMove = moves[currentMoveIndex - 1];
    if (playedMove && (playedMove.from + playedMove.to) === uci.slice(0, 4)) {
      return null;
    }

    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const san = uciToSan(prevFen, uci);
    return {
      uci,
      from,
      to,
      san,
      fenBefore: prevFen,
      applied: applyUciMove(prevFen, uci),
    };
  }, [currentMoveIndex, moves, currentClassification, evalCache]);

  // Guide lines arrows on the chessboard
  const boardArrows = useMemo(() => {
    if (!showGuideLines) return [];

    // If currently previewing a move, draw arrow for that move
    if (previewState && previewState.from && previewState.to) {
      return [
        {
          startSquare: previewState.from,
          endSquare: previewState.to,
          color: '#10b981',
        },
      ];
    }

    const arrows = [];

    // 1. Played move arrow
    if (showPlayedMoveArrow && currentMoveIndex > 0 && moves[currentMoveIndex - 1]) {
      const move = moves[currentMoveIndex - 1];
      const cls = currentClassification?.type;
      let color = '#3b82f6';
      if (cls === 'best' || cls === 'excellent' || cls === 'checkmate') {
        color = '#10b981';
      } else if (cls === 'inaccuracy') {
        color = '#f59e0b';
      } else if (cls === 'mistake') {
        color = '#f97316';
      } else if (cls === 'blunder') {
        color = '#ef4444';
      }
      arrows.push({
        startSquare: move.from,
        endSquare: move.to,
        color,
      });
    }

    // 2. Best move suggestion arrow for current position
    if (showBestMoveArrow && currentBestMove && currentBestMove.from && currentBestMove.to) {
      if (/^[a-h][1-8]$/.test(currentBestMove.from) && /^[a-h][1-8]$/.test(currentBestMove.to)) {
        arrows.push({
          startSquare: currentBestMove.from,
          endSquare: currentBestMove.to,
          color: '#10b981',
        });
      }
    }

    // 3. Alternative arrow for mistakes (what should have been played)
    if (showAlternativeArrow && previousAlternative && previousAlternative.from && previousAlternative.to) {
      if (/^[a-h][1-8]$/.test(previousAlternative.from) && /^[a-h][1-8]$/.test(previousAlternative.to)) {
        arrows.push({
          startSquare: previousAlternative.from,
          endSquare: previousAlternative.to,
          color: '#06b6d4',
        });
      }
    }

    return arrows;
  }, [
    showGuideLines,
    showPlayedMoveArrow,
    showBestMoveArrow,
    showAlternativeArrow,
    currentMoveIndex,
    moves,
    currentClassification,
    currentBestMove,
    previousAlternative,
    previewState,
  ]);

  // Square highlighting for played moves and best move suggestions
  const boardSquareStyles = useMemo(() => {
    const styles = {};
    if (!showGuideLines) return styles;

    if (previewState) {
      if (previewState.from) {
        styles[previewState.from] = { backgroundColor: 'rgba(16, 185, 129, 0.25)' };
      }
      if (previewState.to) {
        styles[previewState.to] = {
          backgroundColor: 'rgba(16, 185, 129, 0.35)',
          boxShadow: 'inset 0 0 0 2px #10b981',
        };
      }
      return styles;
    }

    // Highlight played move squares
    if (showPlayedMoveArrow && currentMoveIndex > 0 && moves[currentMoveIndex - 1]) {
      const move = moves[currentMoveIndex - 1];
      const cls = currentClassification?.type;
      let bg = 'rgba(59, 130, 246, 0.2)';
      if (cls === 'blunder') bg = 'rgba(239, 68, 68, 0.25)';
      else if (cls === 'mistake') bg = 'rgba(249, 115, 22, 0.25)';
      else if (cls === 'inaccuracy') bg = 'rgba(245, 158, 11, 0.2)';
      else if (cls === 'best' || cls === 'excellent') bg = 'rgba(16, 185, 129, 0.2)';

      styles[move.from] = { backgroundColor: bg };
      styles[move.to] = { backgroundColor: bg };
    }

    // Highlight best move squares
    if (showBestMoveArrow && currentBestMove) {
      const { from, to } = currentBestMove;
      if (/^[a-h][1-8]$/.test(from) && /^[a-h][1-8]$/.test(to)) {
        styles[from] = {
          ...(styles[from] || {}),
          boxShadow: 'inset 0 0 0 2px #10b981',
        };
        styles[to] = {
          ...(styles[to] || {}),
          backgroundColor: 'rgba(16, 185, 129, 0.28)',
          boxShadow: 'inset 0 0 0 2px #10b981',
        };
      }
    }

    // Highlight alternative squares if mistake
    if (showAlternativeArrow && previousAlternative) {
      const { from, to } = previousAlternative;
      if (/^[a-h][1-8]$/.test(from) && /^[a-h][1-8]$/.test(to)) {
        styles[from] = {
          ...(styles[from] || {}),
          boxShadow: 'inset 0 0 0 2px #06b6d4',
        };
        styles[to] = {
          ...(styles[to] || {}),
          backgroundColor: 'rgba(6, 182, 212, 0.25)',
          boxShadow: 'inset 0 0 0 2px #06b6d4',
        };
      }
    }

    return styles;
  }, [
    showGuideLines,
    showPlayedMoveArrow,
    showBestMoveArrow,
    showAlternativeArrow,
    currentMoveIndex,
    moves,
    currentClassification,
    currentBestMove,
    previousAlternative,
    previewState,
  ]);

  // Preview handlers
  const handlePreviewBestMove = () => {
    if (!currentBestMove || !currentBestMove.applied) return;
    setPreviewState({
      fen: currentBestMove.applied.fen,
      moveSan: currentBestMove.san,
      from: currentBestMove.from,
      to: currentBestMove.to,
      description: `Best Move: ${currentBestMove.san}`,
    });
  };

  const handlePreviewAlternative = () => {
    if (!previousAlternative || !previousAlternative.applied) return;
    setPreviewState({
      fen: previousAlternative.applied.fen,
      moveSan: previousAlternative.san,
      from: previousAlternative.from,
      to: previousAlternative.to,
      description: `Alternative for move ${moves[currentMoveIndex - 1]?.moveNumber}: ${previousAlternative.san}`,
    });
  };

  const handlePreviewContinuation = (step) => {
    if (!step) return;
    setPreviewState({
      fen: step.fenAfter,
      moveSan: step.san,
      from: step.from,
      to: step.to,
      description: `Line step: ${step.turn === 'w' ? step.moveNum + '.' : step.moveNum + '...'} ${step.san}`,
    });
  };

  // Clear preview state whenever current move index changes
  useEffect(() => {
    setPreviewState(null);
  }, [currentMoveIndex]);

  // Full Game Auto-Analysis
  const runFullGameAnalysis = async () => {
    if (!isReady || moves.length === 0) return;
    setIsAnalyzingAll(true);
    cancelAnalysisRef.current = false;

    if (!evalCache[0]) {
      const startRes = await evaluatePositionAsync(START_FEN, 10);
      setEvalCache((prev) => ({ ...prev, [0]: startRes }));
    }

    for (let i = 1; i <= moves.length; i++) {
      if (cancelAnalysisRef.current) break;
      setAnalysisProgress({ current: i, total: moves.length });

      if (!evalCache[i]) {
        const fen = moves[i - 1].fen;
        const res = await evaluatePositionAsync(fen, 10);
        setEvalCache((prev) => ({ ...prev, [i]: res }));
      }
    }

    setIsAnalyzingAll(false);
  };

  const cancelFullGameAnalysis = () => {
    cancelAnalysisRef.current = true;
    stop();
    setIsAnalyzingAll(false);
  };

  // Navigation handlers
  const goToStart = () => setCurrentMoveIndex(0);
  const goToPrev = () => setCurrentMoveIndex((prev) => Math.max(0, prev - 1));
  const goToNext = () => setCurrentMoveIndex((prev) => Math.min(moves.length, prev + 1));
  const goToEnd = () => setCurrentMoveIndex(moves.length);

  // Jump to Next / Prev Blunder
  const goToNextBlunder = () => {
    for (let i = currentMoveIndex + 1; i <= moves.length; i++) {
      const cls = moveClassifications[i];
      if (cls && (cls.type === 'blunder' || cls.type === 'mistake')) {
        setCurrentMoveIndex(i);
        return;
      }
    }
  };

  const goToPrevBlunder = () => {
    for (let i = currentMoveIndex - 1; i >= 1; i--) {
      const cls = moveClassifications[i];
      if (cls && (cls.type === 'blunder' || cls.type === 'mistake')) {
        setCurrentMoveIndex(i);
        return;
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Home') {
        goToStart();
      } else if (e.key === 'End') {
        goToEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moves.length]);

  // Evaluation bar height percentage
  const evalPercentage = useMemo(() => {
    if (!activeEval) return 50;
    if (activeEval.type === 'mate') {
      return activeEval.value > 0 ? 98 : 2;
    }
    const cp = activeEval.value || 0;
    const clamped = Math.max(-1000, Math.min(1000, cp));
    return Math.max(5, Math.min(95, 50 + (clamped / 1000) * 45));
  }, [activeEval]);

  // Statistics summary for evaluated moves
  const gameStats = useMemo(() => {
    const white = { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    const black = { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };

    for (let i = 1; i <= moves.length; i++) {
      const cls = moveClassifications[i];
      if (!cls || cls.type === 'evaluating') continue;
      const target = moves[i - 1].isWhite ? white : black;
      if (['best', 'excellent', 'checkmate'].includes(cls.type)) target.best++;
      else if (cls.type === 'good') target.good++;
      else if (cls.type === 'inaccuracy') target.inaccuracy++;
      else if (cls.type === 'mistake') target.mistake++;
      else if (cls.type === 'blunder') target.blunder++;
    }

    return { white, black };
  }, [moves, moveClassifications]);

  // Fetch Chess.com games
  const fetchChesscomGames = async (isLoadMore = false) => {
    const user = chesscomUsername.trim();
    if (!user) {
      setChesscomError('Please enter a Chess.com username');
      return;
    }

    setChesscomLoading(true);
    setChesscomError('');

    try {
      const offset = isLoadMore ? chesscomNextOffset : 0;
      const res = await fetch(`/api/chesscom?username=${encodeURIComponent(user)}&limit=5&offset=${offset}`);
      const data = await res.json();

      if (!res.ok) {
        setChesscomError(data.error || 'Failed to fetch games from Chess.com');
        setChesscomLoading(false);
        return;
      }

      if (isLoadMore) {
        setChesscomGames((prev) => [...prev, ...data.games]);
      } else {
        setChesscomGames(data.games || []);
        if (data.games && data.games.length === 0) {
          setChesscomError(`No recent games found for "${user}".`);
        }
      }

      setChesscomHasMore(data.hasMore);
      setChesscomNextOffset(data.nextOffset);
    } catch (err) {
      console.error('Error fetching Chess.com games:', err);
      setChesscomError('Network error while connecting to Chess.com');
    } finally {
      setChesscomLoading(false);
    }
  };

  const loadChesscomGame = (game) => {
    if (!game.pgn) {
      setChesscomError('No PGN available for this game.');
      return;
    }
    setPgnText(game.pgn);
    loadPgnString(game.pgn, game.id);
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-500 dark:text-zinc-400">
        Loading Chessboard and Stockfish Engine...
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* Top Banner / Status & Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors shadow-xs flex items-center gap-1.5"
              title="Return to Home to select a different game"
            >
              <span>←</span>
              <span>Home</span>
            </button>
          )}
          <span className="font-extrabold text-lg text-zinc-900 dark:text-zinc-50 tracking-tight">
            {gameHeaders.White || 'White'} vs {gameHeaders.Black || 'Black'}
          </span>
          {gameHeaders.Result && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
              {gameHeaders.Result}
            </span>
          )}
          {gameTermination && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${gameTermination.badgeClass}`}
              title={gameTermination.description}
            >
              <span>{gameTermination.icon}</span>
              <span>{gameTermination.badge}</span>
            </span>
          )}
          {gameHeaders.ECO && (
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {gameHeaders.ECO}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Engine Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              isReady
                ? evaluating || isAnalyzingAll
                  ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isReady
                  ? evaluating || isAnalyzingAll
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-emerald-500'
                  : 'bg-zinc-400'
              }`}
            />
            {isReady
              ? isAnalyzingAll
                ? `Auto-analyzing (${analysisProgress.current}/${analysisProgress.total})...`
                : evaluating
                ? 'Stockfish Thinking...'
                : 'Stockfish Ready'
              : 'Initializing Stockfish...'}
          </span>

          {/* Flip Board Button */}
          <button
            onClick={() => setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'))}
            className="px-3 py-1 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors shadow-sm"
          >
            Flip ({boardOrientation === 'white' ? 'White' : 'Black'})
          </button>

          {/* Dark / Light Mode Switcher */}
          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors shadow-sm flex items-center justify-center"
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? (
              <span className="flex items-center gap-1 text-xs">
                <span>☀️</span> <span className="hidden sm:inline">Light</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs">
                <span>🌙</span> <span className="hidden sm:inline">Dark</span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Board & Navigation vs Analysis, Move List & Imports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Board + Eval Bar + Navigation + Move Commentary + Visual Suggestions (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Active Move Preview Banner */}
          {previewState && (
            <div className="w-full max-w-[500px] mb-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-2 shadow-xs transition-all">
              <div className="flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200">
                <span className="text-base">👀</span>
                <span>
                  Previewing: <strong className="font-bold underline decoration-emerald-500">{previewState.description}</strong>
                </span>
              </div>
              <button
                onClick={() => setPreviewState(null)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1"
                title="Return to actual game position"
              >
                <span>✕</span>
                <span>Exit Preview</span>
              </button>
            </div>
          )}

          {/* Board + Eval Bar container */}
          <div className="flex items-stretch gap-3 w-full max-w-[500px]">
            {/* Vertical Eval Bar */}
            <div className="w-6 bg-zinc-900 rounded-md overflow-hidden flex flex-col justify-end border border-zinc-300 dark:border-zinc-700 shadow-inner relative select-none">
              <div
                className="w-full bg-zinc-100 transition-all duration-300 ease-out"
                style={{ height: `${evalPercentage}%` }}
              />
              <div className="absolute inset-x-0 bottom-1 text-[9px] font-mono font-bold text-center text-zinc-900 bg-white/70 backdrop-blur-xs py-0.5">
                {activeEval?.scoreText || '0.00'}
              </div>
            </div>

            {/* React Chessboard with Options */}
            <div className="flex-1 aspect-square rounded-lg overflow-hidden shadow-md border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900">
              <Chessboard
                options={{
                  position: previewState ? previewState.fen : currentFen,
                  boardOrientation: boardOrientation,
                  allowDragging: false,
                  showAnimations: true,
                  animationDurationInMs: 250,
                  boardStyle: {
                    borderRadius: '8px',
                  },
                  arrows: boardArrows,
                  squareStyles: boardSquareStyles,
                  allowDrawingArrows: true,
                  arrowOptions: {
                    arrowWidthDenominator: 6,
                    opacity: 0.75,
                  },
                }}
              />
            </div>
          </div>

          {/* Move Navigation Controls */}
          <div className="flex items-center justify-center gap-2 mt-4 w-full max-w-[500px]">
            <button
              onClick={goToStart}
              disabled={currentMoveIndex === 0}
              className="px-3 py-2 text-sm font-semibold rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-sm transition-colors"
              title="First move (Home)"
            >
              |◀
            </button>
            <button
              onClick={goToPrev}
              disabled={currentMoveIndex === 0}
              className="px-4 py-2 text-sm font-semibold rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-sm transition-colors flex-1"
              title="Previous move (Left arrow)"
            >
              ◀ Prev
            </button>
            <button
              onClick={goToNext}
              disabled={currentMoveIndex >= moves.length}
              className="px-4 py-2 text-sm font-semibold rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-sm transition-colors flex-1"
              title="Next move (Right arrow)"
            >
              Next ▶
            </button>
            <button
              onClick={goToEnd}
              disabled={currentMoveIndex >= moves.length}
              className="px-3 py-2 text-sm font-semibold rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-sm transition-colors"
              title="Last move (End)"
            >
              ▶|
            </button>
          </div>

          {/* Quick Blunder Jumper & Progress */}
          <div className="flex items-center justify-between gap-2 mt-2 w-full max-w-[500px] text-xs">
            <button
              onClick={goToPrevBlunder}
              className="text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
            >
              ⏪ Prev Blunder
            </button>
            <span className="text-zinc-400 dark:text-zinc-500 font-medium">
              {currentMoveIndex === 0 ? 'Start' : `Move ${currentMoveIndex} of ${moves.length}`}
            </span>
            <button
              onClick={goToNextBlunder}
              className="text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
            >
              Next Blunder ⏩
            </button>
          </div>

          {/* Guide Lines & Visual Suggestions Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 w-full max-w-[500px] p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs transition-colors">
            <div className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
              <span>🎯</span>
              <span className="text-[11px] uppercase tracking-wider">Guide Lines:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setShowGuideLines((prev) => !prev)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${
                  showGuideLines
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500'
                }`}
                title="Toggle all board guide lines and arrows"
              >
                {showGuideLines ? 'Visible' : 'Hidden'}
              </button>

              {showGuideLines && (
                <>
                  <button
                    onClick={() => setShowBestMoveArrow((prev) => !prev)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 transition-colors ${
                      showBestMoveArrow
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                        : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-400'
                    }`}
                    title="Toggle green best move recommendation arrow"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Best Move</span>
                  </button>

                  <button
                    onClick={() => setShowPlayedMoveArrow((prev) => !prev)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 transition-colors ${
                      showPlayedMoveArrow
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                        : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-400'
                    }`}
                    title="Toggle played move trail arrow"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Played</span>
                  </button>

                  {previousAlternative && (
                    <button
                      onClick={() => setShowAlternativeArrow((prev) => !prev)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 transition-colors ${
                        showAlternativeArrow
                          ? 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300'
                          : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-400'
                      }`}
                      title="Toggle cyan alternative arrow for what should have been played"
                    >
                      <span className="w-2 h-2 rounded-full bg-cyan-500" />
                      <span>Alternative</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="w-full max-w-[500px] text-[10px] text-zinc-400 dark:text-zinc-500 text-center mt-1">
            Tip: Right-click and drag on the board to draw your own custom guide arrows.
          </div>

          {/* Move Evaluation & Commentary Card */}
          <div className="mt-4 w-full max-w-[500px] p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm transition-colors">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Move Analysis
              </span>
              {currentMoveIndex > 0 && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentClassification.badgeClass}`}
                >
                  <span>{currentClassification.icon}</span>
                  <span>{currentClassification.label}</span>
                </span>
              )}
            </div>

            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
              {currentCommentary.headline}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {currentCommentary.body}
            </p>

            {/* If on final move, display explicit game conclusion outcome */}
            {currentMoveIndex === moves.length && gameTermination && (
              <div className={`mt-3 p-3 rounded-lg border flex items-start gap-2.5 text-xs ${gameTermination.badgeClass}`}>
                <span className="text-xl shrink-0 leading-none">{gameTermination.icon}</span>
                <div className="flex-1">
                  <div className="font-bold text-xs uppercase tracking-wider mb-0.5">
                    Game Outcome • {gameTermination.badge}
                  </div>
                  <div className="text-xs opacity-90 leading-relaxed">
                    {gameTermination.description}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stat Bar for Current Move */}
            {currentMoveIndex > 0 && (
              <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                <span>
                  Position Eval:{' '}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {activeEval?.scoreText || '0.00'}
                  </strong>
                </span>
                {evalCache[currentMoveIndex - 1] && evalCache[currentMoveIndex] && (
                  <span>
                    Delta:{' '}
                    <strong
                      className={
                        (evalCache[currentMoveIndex].value - evalCache[currentMoveIndex - 1].value) *
                          (moves[currentMoveIndex - 1]?.isWhite ? 1 : -1) >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {((evalCache[currentMoveIndex].value - evalCache[currentMoveIndex - 1].value) / 100).toFixed(2)}
                    </strong>
                  </span>
                )}
                <span>Depth {activeEval?.depth || 0}</span>
              </div>
            )}
          </div>

          {/* Visual Best Move Suggestion & Guide Lines Card */}
          <div className="mt-4 w-full max-w-[500px] p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm transition-colors flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <span>💡</span>
                <span>Best Move & Guide Line</span>
              </span>
              {activeEval?.bestMove && activeEval.bestMove !== '(none)' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Stockfish Suggestion
                </span>
              )}
            </div>

            {/* Error Alternative (if current move was a blunder/mistake/inaccuracy) */}
            {previousAlternative && (
              <div className="p-3 rounded-lg border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/70 dark:bg-cyan-950/30 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
                    <span>💡</span> Better Alternative for Move {moves[currentMoveIndex - 1]?.moveNumber}:
                  </span>
                  <span className="font-mono font-extrabold text-sm text-cyan-700 dark:text-cyan-300">
                    {previousAlternative.san}
                  </span>
                </div>
                <div className="text-xs text-cyan-800/90 dark:text-cyan-300/90 leading-relaxed">
                  Instead of {moves[currentMoveIndex - 1]?.san} ({currentClassification.label}), playing <strong>{previousAlternative.san}</strong> was recommended by Stockfish.
                </div>
                <button
                  onClick={handlePreviewAlternative}
                  disabled={previewState?.moveSan === previousAlternative.san}
                  className="self-start px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <span>👀</span>
                  <span>{previewState?.moveSan === previousAlternative.san ? 'Previewing Alternative' : `Preview ${previousAlternative.san} on Board`}</span>
                </button>
              </div>
            )}

            {/* Next Recommended Best Move */}
            {currentBestMove ? (
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Best Move for {currentFen.split(' ')[1] === 'w' ? 'White' : 'Black'}:
                    </span>
                    <strong className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                      {currentBestMove.san}
                    </strong>
                  </div>
                  <button
                    onClick={handlePreviewBestMove}
                    disabled={previewState?.moveSan === currentBestMove.san}
                    className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
                  >
                    <span>👀</span>
                    <span>{previewState?.moveSan === currentBestMove.san ? 'Previewing' : 'Preview Move'}</span>
                  </button>
                </div>

                {/* Continuation / PV Sequence */}
                {currentContinuation.length > 0 && (
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Guide Line Continuation:
                    </span>
                    <div className="flex items-center gap-1 flex-wrap font-mono text-xs">
                      {currentContinuation.map((step, idx) => (
                        <button
                          key={idx}
                          onClick={() => handlePreviewContinuation(step)}
                          className={`px-2 py-0.5 rounded border transition-colors ${
                            previewState?.moveSan === step.san
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                              : 'bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                          }`}
                          title={`Click to preview position after ${step.san}`}
                        >
                          {step.turn === 'w' && <span className="opacity-60 mr-0.5">{step.moveNum}.</span>}
                          <span>{step.san}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 text-xs text-zinc-500 dark:text-zinc-400 text-center italic">
                {currentMoveIndex === moves.length && gameTermination
                  ? 'Game concluded — no further legal moves.'
                  : 'Evaluating best move suggestions...'}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Engine Dashboard, Move List, PGN & Chess.com Import (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Engine Dashboard & Auto-Analyze Action */}
          <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Stockfish Engine
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Depth:</label>
                <select
                  value={evalDepth}
                  onChange={(e) => setEvalDepth(Number(e.target.value))}
                  disabled={isAnalyzingAll}
                  className="text-xs border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                >
                  <option value={10}>10</option>
                  <option value={12}>12</option>
                  <option value={15}>15</option>
                  <option value={18}>18</option>
                </select>
              </div>
            </div>

            <div className="flex items-baseline justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-zinc-50">
                  {activeEval?.scoreText || '0.00'}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {activeEval?.type === 'mate' ? 'checkmate line' : 'pawns advantage'}
                </span>
              </div>
              <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
                Depth {activeEval?.depth || 0}
              </div>
            </div>

            {/* Auto-Analyze Full Game Trigger */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
              {!isAnalyzingAll ? (
                <button
                  onClick={runFullGameAnalysis}
                  disabled={!isReady || moves.length === 0}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>⚡</span> Auto-Analyze Full Game
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                    <span>
                      Analyzing move {analysisProgress.current} of {analysisProgress.total}...
                    </span>
                    <button
                      onClick={cancelFullGameAnalysis}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-200"
                      style={{
                        width: `${(analysisProgress.current / (analysisProgress.total || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Accuracy & Game Breakdown Summary (when evaluated) */}
          {(gameStats.white.best > 0 || gameStats.black.best > 0) && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-sm text-xs transition-colors">
              <h4 className="font-bold text-zinc-800 dark:text-zinc-200 mb-2 uppercase tracking-wider text-[11px]">
                Game Accuracy Summary
              </h4>
              <div className="grid grid-cols-2 gap-3 divide-x divide-zinc-100 dark:divide-zinc-800">
                <div>
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">{gameHeaders.White || 'White'}</p>
                  <ul className="space-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <li>🌟 Best: <strong>{gameStats.white.best}</strong></li>
                    <li>👍 Good: <strong>{gameStats.white.good}</strong></li>
                    <li>⚠️ Inaccuracy: <strong className="text-amber-600 dark:text-amber-400">{gameStats.white.inaccuracy}</strong></li>
                    <li>❌ Mistakes: <strong className="text-orange-600 dark:text-orange-400">{gameStats.white.mistake}</strong></li>
                    <li>🚨 Blunders: <strong className="text-red-600 dark:text-red-400">{gameStats.white.blunder}</strong></li>
                  </ul>
                </div>
                <div className="pl-3">
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">{gameHeaders.Black || 'Black'}</p>
                  <ul className="space-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <li>🌟 Best: <strong>{gameStats.black.best}</strong></li>
                    <li>👍 Good: <strong>{gameStats.black.good}</strong></li>
                    <li>⚠️ Inaccuracy: <strong className="text-amber-600 dark:text-amber-400">{gameStats.black.inaccuracy}</strong></li>
                    <li>❌ Mistakes: <strong className="text-orange-600 dark:text-orange-400">{gameStats.black.mistake}</strong></li>
                    <li>🚨 Blunders: <strong className="text-red-600 dark:text-red-400">{gameStats.black.blunder}</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Move History / Notation Table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col transition-colors">
            <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Move List ({moves.length} moves)
              </h3>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Click move to jump</span>
            </div>

            <div className="max-h-[200px] overflow-y-auto p-2 font-mono text-xs divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {moves.length === 0 ? (
                <div className="p-4 text-center text-zinc-400 dark:text-zinc-500">No moves loaded</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="grid grid-cols-2 gap-1">
                    {moves.map((move, idx) => {
                      const isSelected = currentMoveIndex === idx + 1;
                      const cachedScore = evalCache[idx + 1]?.scoreText;
                      const classification = moveClassifications[idx + 1];

                      return (
                        <button
                          key={idx}
                          onClick={() => setCurrentMoveIndex(idx + 1)}
                          className={`text-left px-2 py-1.5 rounded flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white font-bold'
                              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            {move.isWhite && <span className="opacity-60">{move.moveNumber}.</span>}
                            <span>{move.san}</span>
                            {classification && classification.symbol && (
                              <span
                                className={`text-[10px] font-bold ${
                                  isSelected ? 'text-white' : classification.color
                                }`}
                              >
                                {classification.symbol}
                              </span>
                            )}
                          </span>
                          {cachedScore && (
                            <span
                              className={`text-[10px] ${
                                isSelected ? 'text-blue-100' : 'text-zinc-400 dark:text-zinc-500'
                              }`}
                            >
                              {cachedScore}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Game Outcome Conclusion Pill at bottom of Move List */}
                  {(gameTermination || gameHeaders.Result) && (
                    <button
                      onClick={() => setCurrentMoveIndex(moves.length)}
                      className={`mt-1 w-full py-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors ${
                        currentMoveIndex === moves.length
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span>{gameTermination?.icon || '🏁'}</span>
                        <span className="truncate">{gameTermination?.badge || `Result: ${gameHeaders.Result}`}</span>
                      </span>
                      <span className="font-mono text-[11px] opacity-75 shrink-0 ml-2">
                        {gameHeaders.Result || ''}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Import Modes: Tabs for Link vs PGN vs Chess.com Profile */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col gap-3 transition-colors">
            {/* Tabs Switcher */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 pb-2 gap-2">
              <button
                onClick={() => setActiveTab('link')}
                className={`pb-1 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === 'link'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                🔗 Link
              </button>
              <button
                onClick={() => setActiveTab('pgn')}
                className={`pb-1 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === 'pgn'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                📝 Raw PGN
              </button>
              <button
                onClick={() => setActiveTab('chesscom')}
                className={`pb-1 text-xs font-bold border-b-2 transition-colors flex items-center gap-1 ${
                  activeTab === 'chesscom'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                <span>♟️ Profile</span>
                {chesscomGames.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full text-[10px]">
                    {chesscomGames.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 0: Direct Game Link */}
            {activeTab === 'link' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Chess.com Game Link / Share Text
                  </label>
                </div>

                <input
                  type="text"
                  value={analyzerLinkInput}
                  onChange={(e) => {
                    setAnalyzerLinkInput(e.target.value);
                    setAnalyzerLinkError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchAnalyzerLink()}
                  placeholder="Paste URL (e.g. https://www.chess.com/game/live/185520318828)"
                  className="w-full text-xs font-mono p-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950"
                />

                {analyzerLinkError && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{analyzerLinkError}</p>
                )}

                <button
                  onClick={() => handleFetchAnalyzerLink()}
                  disabled={analyzerLinkLoading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  {analyzerLinkLoading ? 'Loading Game...' : 'Analyze Game →'}
                </button>
              </div>
            )}

            {/* TAB 1: PGN Text Input */}
            {activeTab === 'pgn' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Paste PGN
                  </label>
                  <button
                    onClick={() => {
                      setPgnText(SAMPLE_PGN);
                      loadPgnString(SAMPLE_PGN);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Load Morphy Opera Game
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={pgnText}
                  onChange={(e) => setPgnText(e.target.value)}
                  placeholder="Paste PGN here..."
                  className="w-full text-xs font-mono p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-zinc-800 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950"
                />

                {errorMsg && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{errorMsg}</p>
                )}

                <button
                  onClick={() => loadPgnString(pgnText)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Load PGN
                </button>
              </div>
            )}

            {/* TAB 2: Chess.com Profile Import */}
            {activeTab === 'chesscom' && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 block">
                    Chess.com Username
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chesscomUsername}
                      onChange={(e) => setChesscomUsername(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchChesscomGames(false)}
                      placeholder="e.g. hikaru, magnuscarlsen"
                      className="flex-1 text-xs px-2.5 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950"
                    />
                    <button
                      onClick={() => fetchChesscomGames(false)}
                      disabled={chesscomLoading}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                    >
                      {chesscomLoading ? 'Loading...' : 'Fetch'}
                    </button>
                  </div>
                </div>

                {chesscomError && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{chesscomError}</p>
                )}

                {/* List of Retrieved Games */}
                {chesscomGames.length > 0 && (
                  <div className="flex flex-col gap-2 mt-1">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                      Recent games for <strong>{chesscomUsername}</strong>:
                    </span>
                    <div className="max-h-[240px] overflow-y-auto flex flex-col gap-2 pr-1">
                      {chesscomGames.map((game) => {
                        const isCurrentActive = activeGameId === game.id;
                        return (
                          <div
                            key={game.id}
                            className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1 transition-all ${
                              isCurrentActive
                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                ⚪ {game.white.username} ({game.white.rating}) vs ⚫ {game.black.username} ({game.black.rating})
                              </span>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                {game.timeClass}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                              <span>
                                {game.date} • <strong className="text-zinc-700 dark:text-zinc-300">{game.outcome}</strong>
                              </span>
                              <button
                                onClick={() => loadChesscomGame(game)}
                                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                                  isCurrentActive
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-800 dark:text-zinc-200'
                                }`}
                              >
                                {isCurrentActive ? '✓ Active' : 'Analyze'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Load More Button */}
                    {chesscomHasMore && (
                      <button
                        onClick={() => fetchChesscomGames(true)}
                        disabled={chesscomLoading}
                        className="w-full py-1.5 mt-1 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        {chesscomLoading ? 'Importing more...' : '⬇ Import 5 More Games'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
