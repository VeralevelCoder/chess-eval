'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard, defaultArrowOptions } from 'react-chessboard';
import useStockfish from '../hooks/useStockfish';
import { Analytics } from "@vercel/analytics/next";
import { analyzeLast6Games } from '../utils/recentGamesAnalysis';
import RecentGamesReviewModal from './RecentGamesReviewModal';

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
// Emotive Visual Vocabulary matching Chess.com:
// 🌟 Brilliant (Teal), ✨ Great (Blue), 👍 Best (Emerald), ⚡ Excellent (Teal-green),
// 🟢 Good (Sky), 📖 Book (Amber), ⚠️ Inaccuracy (Yellow), ❌ Mistake (Orange),
// 🚨 Blunder (Red), ❓ Missed Win (Rose), 👑 Checkmate (Purple)
function classifyMove(evalLoss, isCheckmate, isDeliveredCheckmate, bestMove, san, prevEval = null, currEval = null, moveIndex = 0, isWhite = true) {
  if (isDeliveredCheckmate || (san && san.includes('#'))) {
    return {
      type: 'checkmate',
      label: 'Checkmate',
      badgeClass: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700',
      icon: '👑',
      symbol: '#',
      color: 'text-purple-600 dark:text-purple-400',
      hex: '#a855f7',
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
      hex: '#71717a',
    };
  }

  // 1. Missed Win: player was decisively winning before, but dropped significantly or threw the edge
  if (prevEval && currEval) {
    const wasWinning = prevEval.type === 'mate'
      ? (isWhite ? prevEval.value > 0 : prevEval.value < 0)
      : (isWhite ? prevEval.value >= 250 : prevEval.value <= -250);
    const isNowDecisiveDrop = evalLoss >= 180;
    if (wasWinning && isNowDecisiveDrop) {
      return {
        type: 'missedWin',
        label: 'Missed Win',
        badgeClass: 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700',
        icon: '❓',
        symbol: '✖',
        color: 'text-rose-600 dark:text-rose-400',
        hex: '#ff3b69',
      };
    }
  }

  // 2. Book Move: standard early opening moves with low loss
  if (moveIndex > 0 && moveIndex <= 6 && evalLoss <= 25) {
    return {
      type: 'book',
      label: 'Book Move',
      badgeClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      icon: '📖',
      symbol: '📖',
      color: 'text-amber-700 dark:text-amber-400',
      hex: '#d5a47e',
    };
  }

  // 3. Brilliant Move: sharp piece sacrifice or top move in deep winning tactic
  if (evalLoss <= 10 && currEval && moveIndex > 6) {
    const isAhead = isWhite
      ? (currEval.value >= 150 || (currEval.type === 'mate' && currEval.value > 0))
      : (currEval.value <= -150 || (currEval.type === 'mate' && currEval.value < 0));
    const isPieceSacrifice = san && (san.includes('x') || san.startsWith('N') || san.startsWith('B') || san.startsWith('R') || san.startsWith('Q'));
    if (isAhead && isPieceSacrifice && evalLoss <= 2) {
      return {
        type: 'brilliant',
        label: 'Brilliant',
        badgeClass: 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700',
        icon: '🌟',
        symbol: '!!',
        color: 'text-teal-600 dark:text-teal-400',
        hex: '#1baca6',
      };
    }
  }

  // 4. evalLoss in centipawns: positive = advantage lost, negative = advantage gained
  if (evalLoss <= 15) {
    return {
      type: 'best',
      label: 'Best Move',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      icon: '👍',
      symbol: '★',
      color: 'text-emerald-600 dark:text-emerald-400',
      hex: '#10b981',
    };
  } else if (evalLoss <= 45) {
    return {
      type: 'excellent',
      label: 'Excellent',
      badgeClass: 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700',
      icon: '⚡',
      symbol: '✓',
      color: 'text-teal-600 dark:text-teal-400',
      hex: '#0d9488',
    };
  } else if (evalLoss <= 90) {
    return {
      type: 'good',
      label: 'Good',
      badgeClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      icon: '🟢',
      symbol: '○',
      color: 'text-blue-600 dark:text-blue-400',
      hex: '#3b82f6',
    };
  } else if (evalLoss <= 180) {
    return {
      type: 'inaccuracy',
      label: 'Inaccuracy',
      badgeClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      icon: '⚠️',
      symbol: '?!',
      color: 'text-amber-600 dark:text-amber-400',
      hex: '#f59e0b',
    };
  } else if (evalLoss <= 300) {
    return {
      type: 'mistake',
      label: 'Mistake',
      badgeClass: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700',
      icon: '❌',
      symbol: '?',
      color: 'text-orange-600 dark:text-orange-400',
      hex: '#f97316',
    };
  } else {
    return {
      type: 'blunder',
      label: 'Blunder',
      badgeClass: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700',
      icon: '🚨',
      symbol: '??',
      color: 'text-red-600 dark:text-red-400',
      hex: '#ef4444',
    };
  }
}

// Win Probability model from centipawns: WP = 100 / (1 + 10^(-cp / 400))
function centipawnsToWinProbability(cp, isMate = false) {
  if (isMate) {
    return cp > 0 ? 100 : 0;
  }
  const clampedCp = Math.max(-1500, Math.min(1500, cp));
  return 100 / (1 + Math.pow(10, -clampedCp / 400));
}

// CAPS-style single move accuracy: 103.1668 * exp(-0.04354 * wpLoss) - 3.1669
function calculateMoveAccuracy(prevScore, currScore, isWhite) {
  if (!prevScore || !currScore) return 100;
  const prevCp = prevScore.type === 'mate' ? (prevScore.value > 0 ? 1500 : -1500) : (prevScore.value || 0);
  const currCp = currScore.type === 'mate' ? (currScore.value > 0 ? 1500 : -1500) : (currScore.value || 0);

  const prevWp = centipawnsToWinProbability(prevCp, prevScore.type === 'mate');
  const currWp = centipawnsToWinProbability(currCp, currScore.type === 'mate');

  const playerPrevWp = isWhite ? prevWp : 100 - prevWp;
  const playerCurrWp = isWhite ? currWp : 100 - currWp;

  const wpLoss = Math.max(0, playerPrevWp - playerCurrWp);
  const acc = 103.1668 * Math.exp(-0.04354 * wpLoss) - 3.1669;
  return Math.max(0, Math.min(100, acc));
}

// Helper to determine accuracy tier and badge
function getAccuracyTier(acc) {
  if (acc === null || acc === undefined) {
    return { label: 'Unranked', color: 'text-zinc-400', badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' };
  }
  if (acc >= 90) {
    return { label: 'Masterly', color: 'text-emerald-500', badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' };
  }
  if (acc >= 80) {
    return { label: 'Great', color: 'text-teal-500', badgeClass: 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700' };
  }
  if (acc >= 70) {
    return { label: 'Solid', color: 'text-blue-500', badgeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700' };
  }
  if (acc >= 55) {
    return { label: 'Intermediate', color: 'text-amber-500', badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700' };
  }
  return { label: 'Developing', color: 'text-orange-500', badgeClass: 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700' };
}

// Generate friendly Virtual Coach narrative with speech and emotive expressions
function getVirtualCoachData(move, prevEval, currEval, classification, playerName, isLastMove = false, gameTermination = null, previousAlternative = null) {
  if (!move) {
    return {
      avatar: '🎓',
      emotion: 'welcome',
      mood: 'Friendly Guide',
      title: 'Game Review Ready',
      speech: 'Welcome to your Game Review! Walk through the game using the navigation controls, or run Auto-Analyze to calculate your full accuracy score and uncover critical moments.',
      tag: 'Starting Position',
    };
  }

  const san = move.san;
  const who = playerName || (move.isWhite ? 'White' : 'Black');
  const cls = classification?.type || 'good';

  if (isLastMove && gameTermination) {
    return {
      avatar: '👑',
      emotion: 'victorious',
      mood: 'Game Finished',
      title: `${gameTermination.badge}`,
      speech: `${gameTermination.description} That concludes this match.`,
      tag: 'Game Outcome',
    };
  }

  switch (cls) {
    case 'brilliant':
      return {
        avatar: '🌟',
        emotion: 'delighted',
        mood: 'Brilliant Find!',
        title: 'Outstanding Vision',
        speech: `Incredible move! ${who} played ${san}, finding a spectacular tactical sacrifice that completely dominates the board.`,
        tag: 'Brilliant !!',
      };
    case 'best':
      return {
        avatar: '😄',
        emotion: 'delighted',
        mood: 'Engine Top Pick',
        title: 'Perfect Continuation',
        speech: `Superb play! ${who} found the absolute best move with ${san}. It maintains optimal coordination and control.`,
        tag: 'Best Move ★',
      };
    case 'excellent':
      return {
        avatar: '✨',
        emotion: 'happy',
        mood: 'Sharp Choice',
        title: 'Very Strong',
        speech: `Excellent choice! ${san} keeps the pressure high and retains almost all positional advantage.`,
        tag: 'Excellent ✓',
      };
    case 'good':
      return {
        avatar: '👍',
        emotion: 'supportive',
        mood: 'Solid Move',
        title: 'Natural Continuation',
        speech: `${san} is a good, reliable move that continues the game plan without major complications.`,
        tag: 'Good Move ○',
      };
    case 'book':
      return {
        avatar: '📖',
        emotion: 'scholarly',
        mood: 'Opening Theory',
        title: 'Standard Opening',
        speech: `${who} plays ${san}, following classical opening theory for development and center control.`,
        tag: 'Book Move 📖',
      };
    case 'inaccuracy':
      return {
        avatar: '🤔',
        emotion: 'thoughtful',
        mood: 'Minor Slipped Edge',
        title: 'Room for Improvement',
        speech: `${san} is slightly imprecise. ${previousAlternative ? `Stockfish preferred ${previousAlternative.san} to maintain more initiative.` : 'There were sharper paths to preserve the advantage.'}`,
        tag: 'Inaccuracy ?!',
      };
    case 'mistake':
      return {
        avatar: '🧐',
        emotion: 'teaching',
        mood: 'Notable Mistake',
        title: 'Tough Moment',
        speech: `${who}'s ${san} surrenders a clear positional advantage. ${previousAlternative ? `Playing ${previousAlternative.san} was significantly stronger.` : 'Try the Retry Mistake puzzle to test the best continuation!'}`,
        tag: 'Mistake ?',
      };
    case 'blunder':
      return {
        avatar: '🚨',
        emotion: 'alert',
        mood: 'Critical Blunder',
        title: 'Major Turning Point',
        speech: `A costly blunder! ${san} shifts the game dramatically. ${previousAlternative ? `The winning move was ${previousAlternative.san}. Can you find it in Retry mode?` : 'Check the Retry widget below to learn the winning tactic.'}`,
        tag: 'Blunder ??',
      };
    case 'missedWin':
      return {
        avatar: '❓',
        emotion: 'alert',
        mood: 'Missed Opportunity',
        title: 'Missed Win',
        speech: `${who} had a decisive winning tactic here, but played ${san} and let the opponent escape!`,
        tag: 'Missed Win ✖',
      };
    case 'checkmate':
      return {
        avatar: '👑',
        emotion: 'victorious',
        mood: 'Decisive Mate',
        title: 'Checkmate Delivered',
        speech: `Checkmate! ${who} closes out the contest with ${san}. No legal moves remain.`,
        tag: 'Checkmate #',
      };
    default:
      return {
        avatar: '🎓',
        emotion: 'neutral',
        mood: 'Analyzing',
        title: `${who} played ${san}`,
        speech: `Evaluating position...`,
        tag: 'Move Review',
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

// ─────────────────────────────────────────────────────────────────────────────
// Generate a human-like game summary from Stockfish eval data — no LLM needed.
// Called after full-game analysis completes, using a local cache snapshot.
// ─────────────────────────────────────────────────────────────────────────────
function generateGameSummary({ moves, evalCache, moveClassifications, gameHeaders, gameTermination }) {
  // Defensive sanitization of untrusted PGN headers to prevent injection and markup issues
  const sanitize = (val, maxLen = 60) =>
    typeof val === 'string'
      ? val.replace(/[<>{}\\\r\n\t]/g, '').slice(0, maxLen).trim()
      : '';

  const white = sanitize(gameHeaders.White) || 'White';
  const black = sanitize(gameHeaders.Black) || 'Black';
  const eco   = sanitize(gameHeaders.ECO, 10);
  const opening = sanitize(gameHeaders.Opening) || eco || 'this opening';
  const result  = sanitize(gameHeaders.Result, 10) || '*';
  const event   = sanitize(gameHeaders.Event).replace(/\?/g, '').trim();
  const date    = sanitize(gameHeaders.Date).replace(/\.\?\?/g, '').replace(/\?/g, '').trim();

  // ── Collect per-player stats & key moments ──────────────────────────────
  const whiteStats = { blunder: 0, mistake: 0, inaccuracy: 0, best: 0, excellent: 0, good: 0 };
  const blackStats = { blunder: 0, mistake: 0, inaccuracy: 0, best: 0, excellent: 0, good: 0 };
  const keyMoments = [];

  for (let i = 1; i <= moves.length; i++) {
    const cls  = moveClassifications[i];
    const move = moves[i - 1];
    if (!cls || cls.type === 'evaluating' || cls.type === 'checkmate') continue;

    const prev  = evalCache[i - 1];
    const curr  = evalCache[i];
    const stats = move.isWhite ? whiteStats : blackStats;

    if (['best', 'excellent'].includes(cls.type)) stats.best++;
    else if (cls.type === 'good')       stats.good++;
    else if (cls.type === 'inaccuracy') stats.inaccuracy++;
    else if (cls.type === 'mistake')    stats.mistake++;
    else if (cls.type === 'blunder')    stats.blunder++;

    if (['blunder', 'mistake', 'inaccuracy'].includes(cls.type)) {
      const rawLoss   = prev && curr ? Math.abs(curr.value - prev.value) / 100 : null;
      const evalLoss  = rawLoss !== null ? rawLoss.toFixed(1) : null;
      keyMoments.push({
        index:      i,
        type:       cls.type,
        label:      cls.label,
        icon:       cls.icon,
        player:     move.isWhite ? white : black,
        isWhite:    move.isWhite,
        san:        move.san,
        moveNumber: move.moveNumber,
        evalLoss,
        prevScore:  prev ? prev.scoreText : null,
        currScore:  curr ? curr.scoreText : null,
      });
    }
  }

  // ── Build narrative paragraphs ───────────────────────────────────────────
  const paragraphs = [];
  const whiteTotalErrors = whiteStats.blunder + whiteStats.mistake + whiteStats.inaccuracy;
  const blackTotalErrors = blackStats.blunder + blackStats.mistake + blackStats.inaccuracy;
  const totalHalfMoves   = moves.length;

  // Paragraph 1 — Context
  let p1 = '';
  if (eco) {
    p1 = `This was a ${eco} (${opening}) between ${white} (White) and ${black} (Black)`;
  } else {
    p1 = `This was a game between ${white} (White) and ${black} (Black)`;
  }
  if (event && event !== 'Casual Game' && event.length > 0) p1 += ` played at ${event}`;
  if (date && date.length > 0) p1 += ` in ${date}`;
  p1 += '.';
  paragraphs.push(p1);

  // Paragraph 2 — Overall flow
  const moveWord = Math.ceil(totalHalfMoves / 2);
  let p2 = `Over ${moveWord} move${moveWord !== 1 ? 's' : ''}, `;
  if (whiteTotalErrors === 0 && blackTotalErrors === 0) {
    p2 += `both players navigated the position with remarkable precision — the engine found no outright blunders or mistakes from either side.`;
  } else if (whiteTotalErrors < blackTotalErrors) {
    const diff = blackTotalErrors - whiteTotalErrors;
    p2 += `${white} played the more disciplined game, while ${black} committed ${blackStats.blunder > 0 ? `${blackStats.blunder} critical blunder${blackStats.blunder > 1 ? 's' : ''}` : 'several significant errors'} that progressively ceded the initiative.`;
  } else if (blackTotalErrors < whiteTotalErrors) {
    p2 += `${black} held up better under pressure, while ${white} gave away the advantage through ${whiteStats.blunder > 0 ? `${whiteStats.blunder} critical blunder${whiteStats.blunder > 1 ? 's' : ''}` : 'a series of inaccuracies'} that shifted the tide.`;
  } else {
    p2 += `both players traded errors in roughly equal measure — ${whiteTotalErrors} for ${white} and ${blackTotalErrors} for ${black} — making for a tense, hard-fought struggle.`;
  }
  paragraphs.push(p2);

  // Paragraph 3 — Critical moments in prose
  const blunders  = keyMoments.filter(m => m.type === 'blunder');
  const mistakes  = keyMoments.filter(m => m.type === 'mistake');
  const p3Lines   = [];

  blunders.slice(0, 3).forEach(m => {
    const swing = m.evalLoss ? ` — a swing of ${m.evalLoss} pawn${parseFloat(m.evalLoss) !== 1 ? 's' : ''} (${m.prevScore} → ${m.currScore})` : '';
    p3Lines.push(`${m.player}'s ${m.san} on move ${m.moveNumber} proved to be a critical blunder${swing}.`);
  });

  if (blunders.length === 0 && mistakes.length > 0) {
    mistakes.slice(0, 2).forEach(m => {
      const swing = m.evalLoss ? ` (dropped ${m.evalLoss} pawns)` : '';
      p3Lines.push(`${m.player} made a notable mistake with ${m.san} on move ${m.moveNumber}${swing}.`);
    });
  } else if (blunders.length > 0 && blunders.length < 3 && mistakes.length > 0) {
    mistakes.slice(0, 1).forEach(m => {
      const swing = m.evalLoss ? ` (dropped ${m.evalLoss} pawns)` : '';
      p3Lines.push(`${m.player} also erred with ${m.san} on move ${m.moveNumber}${swing}.`);
    });
  }

  if (p3Lines.length > 0) {
    paragraphs.push(p3Lines.join(' '));
  } else if (whiteTotalErrors === 0 && blackTotalErrors === 0) {
    // already covered in p2 — skip duplicate
  } else {
    paragraphs.push(`Only minor inaccuracies were found — neither player made a game-changing blunder.`);
  }

  // Paragraph 4 — Outcome
  if (gameTermination) {
    paragraphs.push(gameTermination.description);
  } else if (result === '1-0') {
    paragraphs.push(`${white} prevailed (1-0).`);
  } else if (result === '0-1') {
    paragraphs.push(`${black} prevailed (0-1).`);
  } else if (result === '1/2-1/2') {
    paragraphs.push(`The game concluded as a draw (½-½).`);
  }

  // ── Sort key moments: blunders → mistakes → inaccuracies ────────────────
  const priority = { blunder: 0, mistake: 1, inaccuracy: 2 };
  const topMoments = [...keyMoments]
    .sort((a, b) => priority[a.type] - priority[b.type])
    .slice(0, 6);

  return {
    paragraphs,
    topMoments,
    stats:   { white: whiteStats, black: blackStats },
    players: { white, black },
    result,
  };
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

  // Active analysis view mode (Rule 5: Progressive Disclosure): 'review' | 'deep'
  const [analysisTab, setAnalysisTab] = useState('review');

  // Active input mode: 'pgn' | 'chesscom' | 'link'
  const [activeTab, setActiveTab] = useState('pgn');

  // Interactive "Retry Mistakes" state (Rule 4: Active Remediation)
  // { blunderMoveIndex, prevFen, blunderSan, targetSan, targetUci, from, to, pieceName, isHintShown, isSolved, attempts, lastAttemptWrong, solvedFen }
  const [retryState, setRetryState] = useState(null);

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
  const requestedFenRef = useRef(null); // Tracks which FEN the live evaluator is allowed to update

  // Auto-analysis state

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
  const [showRecentSummaryModal, setShowRecentSummaryModal] = useState(false);
  const [recentAnalysisSummary, setRecentAnalysisSummary] = useState(null);

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

  // Game Summary Modal — shown automatically after Auto-Analyze completes
  const [showGameSummary, setShowGameSummary]   = useState(false);
  const [gameSummaryData, setGameSummaryData]   = useState(null);

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
        setPreviewState(null);
        setErrorMsg('');
        setIsAnalyzingAll(false);
        setActiveGameId(data.gameId);
        setAnalyzerLinkInput('');
        setShowGameSummary(false);
        setGameSummaryData(null);
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
    if (trimmed.length > 50000) {
      setErrorMsg('PGN exceeds maximum allowable length of 50,000 characters.');
      return;
    }

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
      if (history.length > 500) {
        setErrorMsg('Game notation exceeds maximum supported length (500 moves).');
        return;
      }
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
      setPreviewState(null);
      setErrorMsg('');
      setIsAnalyzingAll(false);
      setActiveGameId(gameId);
      setShowGameSummary(false);
      setGameSummaryData(null);
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
      requestedFenRef.current = currentFen; // Lock the FEN we expect to receive
      evaluatePosition(currentFen, evalDepth);
    }
  }, [currentMoveIndex, currentFen, evalDepth, isReady, evaluatePosition, evalCache, isAnalyzingAll]);

  // Store live evaluation in cache
  useEffect(() => {
    if (evaluation && evaluation.depth > 0 && !isAnalyzingAll) {
      // ONLY save if the FEN matches the one we explicitly requested via live evaluation
      if (currentFen === requestedFenRef.current) {
        setEvalCache((prev) => ({
          ...prev,
          [currentMoveIndex]: {
            ...evaluation,
          },
        }));
      }
    }
  }, [evaluation, currentMoveIndex, currentFen, isAnalyzingAll]);


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
          map[i] = classifyMove(0, true, true, curr.bestMove, move.san, prev, curr, i, move.isWhite);
        } else {
          map[i] = classifyMove(500, true, false, curr.bestMove, move.san, prev, curr, i, move.isWhite);
        }
        continue;
      }

      const evalDiff = curr.value - prev.value;
      const evalLoss = move.isWhite ? -evalDiff : evalDiff;
      map[i] = classifyMove(evalLoss, isCheckmate, isDeliveredCheckmate, curr.bestMove, move.san, prev, curr, i, move.isWhite);
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

  // What was best instead of the current move (if current move was a mistake/blunder/inaccuracy/missedWin)
  const previousAlternative = useMemo(() => {
    if (currentMoveIndex === 0) return null;
    const isError = ['inaccuracy', 'mistake', 'blunder', 'missedWin'].includes(currentClassification?.type);
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

  // Rule 1: CAPS Game Accuracy scores (0-100%) for White and Black
  const accuracyScores = useMemo(() => {
    let whiteSum = 0, whiteCount = 0;
    let blackSum = 0, blackCount = 0;

    for (let i = 1; i <= moves.length; i++) {
      const prev = evalCache[i - 1];
      const curr = evalCache[i];
      if (!prev || !curr) continue;

      const isWhite = moves[i - 1]?.isWhite;
      const acc = calculateMoveAccuracy(prev, curr, isWhite);

      if (isWhite) {
        whiteSum += acc;
        whiteCount++;
      } else {
        blackSum += acc;
        blackCount++;
      }
    }

    const whiteAcc = whiteCount > 0 ? (whiteSum / whiteCount).toFixed(1) : null;
    const blackAcc = blackCount > 0 ? (blackSum / blackCount).toFixed(1) : null;
    const hasData = whiteCount > 0 || blackCount > 0;

    return {
      white: whiteAcc !== null ? parseFloat(whiteAcc) : null,
      black: blackAcc !== null ? parseFloat(blackAcc) : null,
      hasData,
      whiteCount,
      blackCount,
    };
  }, [moves, evalCache]);

  // Rule 3: Visual Narrative Advantage Graph Data (Interactive SVG below board)
  const gameGraphData = useMemo(() => {
    if (moves.length === 0) {
      return { linePath: '', whiteArea: '', blackArea: '', blunderDots: [], currentPoint: null };
    }

    const n = moves.length;
    const points = [];
    const blunderDots = [];

    // Helper to map centipawns to Y coordinate (viewBox 0 0 500 74, midline at 37)
    const getY = (evalObj) => {
      if (!evalObj) return 37;
      let cp = evalObj.value || 0;
      if (evalObj.type === 'mate') {
        cp = evalObj.value > 0 ? 600 : -600;
      }
      const clamped = Math.max(-600, Math.min(600, cp));
      return 37 - (clamped / 600) * 31;
    };

    // Point 0 (initial position)
    const x0 = 10;
    const y0 = getY(evalCache[0]);
    points.push({ x: x0, y: y0, moveIndex: 0 });

    for (let i = 1; i <= n; i++) {
      const x = 10 + (i / n) * 480;
      const y = getY(evalCache[i]);
      points.push({ x, y, moveIndex: i });

      const cls = moveClassifications[i];
      if (cls && (cls.type === 'blunder' || cls.type === 'mistake' || cls.type === 'missedWin')) {
        blunderDots.push({
          x,
          y,
          isBlunder: cls.type === 'blunder' || cls.type === 'missedWin',
          title: `Move ${i}: ${moves[i - 1]?.san} (${cls.label})`,
          moveIndex: i,
        });
      }
    }

    // Build line path
    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // White Area (advantage above midline y=37)
    const whitePoints = points.map(p => ({ x: p.x, y: Math.min(37, p.y) }));
    const whiteArea = `M 10 37 L ${whitePoints.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} L 490 37 Z`;

    // Black Area (advantage below midline y=37)
    const blackPoints = points.map(p => ({ x: p.x, y: Math.max(37, p.y) }));
    const blackArea = `M 10 37 L ${blackPoints.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} L 490 37 Z`;

    const currentPoint = points[currentMoveIndex] || points[0];

    return {
      linePath,
      whiteArea,
      blackArea,
      blunderDots,
      currentPoint,
    };
  }, [moves, evalCache, moveClassifications, currentMoveIndex]);

  // Rule 3: Friendly Virtual Coach Data
  const currentVirtualCoach = useMemo(() => {
    if (currentMoveIndex === 0) {
      return getVirtualCoachData(null, null, activeEval, { type: 'neutral' }, 'White', false, null, null);
    }
    const move = moves[currentMoveIndex - 1];
    const prevEval = evalCache[currentMoveIndex - 1];
    const currEval = evalCache[currentMoveIndex];
    const classification = moveClassifications[currentMoveIndex] || { type: 'evaluating', label: 'Analyzing' };
    const playerName = move?.isWhite ? (gameHeaders.White || 'White') : (gameHeaders.Black || 'Black');
    const isLastMove = currentMoveIndex === moves.length;

    return getVirtualCoachData(move, prevEval, currEval, classification, playerName, isLastMove, gameTermination, previousAlternative);
  }, [currentMoveIndex, moves, evalCache, moveClassifications, gameHeaders, gameTermination, previousAlternative, activeEval]);

  // Rule 4: Interactive Retry Mode Handlers
  const handleStartRetry = () => {
    if (currentMoveIndex === 0 || !previousAlternative) return;
    const prevFen = currentMoveIndex > 1 ? moves[currentMoveIndex - 2]?.fen : START_FEN;
    const blunderMove = moves[currentMoveIndex - 1];

    let pieceName = 'piece';
    try {
      const c = new Chess(prevFen);
      const piece = c.get(previousAlternative.from);
      if (piece) {
        const names = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
        pieceName = names[piece.type] || 'piece';
      }
    } catch {}

    setPreviewState(null);
    setRetryState({
      blunderMoveIndex: currentMoveIndex,
      prevFen,
      blunderSan: blunderMove ? blunderMove.san : '',
      targetSan: previousAlternative.san,
      targetUci: previousAlternative.uci,
      from: previousAlternative.from,
      to: previousAlternative.to,
      pieceName,
      isHintShown: false,
      isSolved: false,
      attempts: 0,
      lastAttemptWrong: false,
      solvedFen: previousAlternative.applied?.fen || prevFen,
    });
  };

  const handleExitRetry = () => {
    setRetryState(null);
  };

  const handleShowRetryHint = () => {
    if (!retryState) return;
    setRetryState((prev) => ({ ...prev, isHintShown: true, lastAttemptWrong: false }));
  };

  const handleRevealRetrySolution = () => {
    if (!retryState) return;
    setRetryState((prev) => ({
      ...prev,
      isSolved: true,
      isHintShown: true,
      lastAttemptWrong: false,
    }));
  };

  const handleRetryPieceDrop = ({ piece, sourceSquare, targetSquare }) => {
    if (!retryState || retryState.isSolved) return false;
    try {
      const game = new Chess(retryState.prevFen);
      const moveRes = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
      if (!moveRes) {
        setRetryState((prev) => ({ ...prev, lastAttemptWrong: true }));
        return false;
      }

      const playedUci = `${sourceSquare}${targetSquare}${moveRes.promotion ? 'q' : ''}`;
      const targetUci = retryState.targetUci;
      const isCorrect =
        playedUci === targetUci ||
        `${sourceSquare}${targetSquare}` === targetUci.slice(0, 4) ||
        moveRes.san === retryState.targetSan;

      if (isCorrect) {
        setRetryState((prev) => ({
          ...prev,
          isSolved: true,
          lastAttemptWrong: false,
          solvedFen: game.fen(),
        }));
        return true;
      } else {
        setRetryState((prev) => ({
          ...prev,
          attempts: (prev.attempts || 0) + 1,
          lastAttemptWrong: true,
        }));
        return false;
      }
    } catch {
      return false;
    }
  };

  const handleGraphClick = (e) => {
    if (moves.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetIndex = Math.round(pct * moves.length);
    setPreviewState(null);
    setRetryState(null);
    setCurrentMoveIndex(targetIndex);
  };

  // Helper to format an arrow object with startSquare, endSquare, color and numeric indices
  const formatArrow = (from, to, color) => ({
    startSquare: from,
    endSquare: to,
    color,
    0: from,
    1: to,
    2: color,
  });

  // Guide lines arrows on the chessboard
  // Colors are strictly STATIC and UNIQUE:
  // - Played Move: Royal Blue (#3b82f6)
  // - Best Move: Emerald Green (#10b981)
  // - Alternative Move: Cyan (#06b6d4)
  const boardArrows = useMemo(() => {
    // In retry mode: show no spoil arrows while attempting, show emerald arrow once solved
    if (retryState) {
      if (retryState.isSolved && retryState.from && retryState.to) {
        return [formatArrow(retryState.from, retryState.to, '#10b981')];
      }
      return [];
    }

    if (!showGuideLines) return [];

    // If currently previewing a move, draw arrow for that move in its dedicated static color
    if (previewState && previewState.from && previewState.to) {
      const arrowColor = previewState.type === 'alternative' ? '#06b6d4' : '#10b981';
      return [formatArrow(previewState.from, previewState.to, arrowColor)];
    }

    const arrows = [];

    // 1. Played move arrow — STATIC UNIQUE COLOR: Royal Blue (#3b82f6)
    if (showPlayedMoveArrow && currentMoveIndex > 0 && moves[currentMoveIndex - 1]) {
      const move = moves[currentMoveIndex - 1];
      if (/^[a-h][1-8]$/.test(move.from) && /^[a-h][1-8]$/.test(move.to)) {
        arrows.push(formatArrow(move.from, move.to, '#3b82f6'));
      }
    }

    // 2. Best move suggestion arrow for current position — STATIC UNIQUE COLOR: Emerald Green (#10b981)
    if (showBestMoveArrow && currentBestMove && currentBestMove.from && currentBestMove.to) {
      if (/^[a-h][1-8]$/.test(currentBestMove.from) && /^[a-h][1-8]$/.test(currentBestMove.to)) {
        arrows.push(formatArrow(currentBestMove.from, currentBestMove.to, '#10b981'));
      }
    }

    // 3. Alternative arrow for mistakes (what should have been played) — STATIC UNIQUE COLOR: Cyan (#06b6d4)
    if (showAlternativeArrow && previousAlternative && previousAlternative.from && previousAlternative.to) {
      if (/^[a-h][1-8]$/.test(previousAlternative.from) && /^[a-h][1-8]$/.test(previousAlternative.to)) {
        arrows.push(formatArrow(previousAlternative.from, previousAlternative.to, '#06b6d4'));
      }
    }

    // Deduplicate arrows using a Map to ensure strictly unique start/end pairs
    const uniqueArrowsMap = new Map();
    arrows.forEach((arrow) => {
      const from = arrow.startSquare || arrow[0];
      const to = arrow.endSquare || arrow[1];
      const key = `${from}-${to}`;
      if (!uniqueArrowsMap.has(key)) {
        uniqueArrowsMap.set(key, arrow);
      }
    });

    return Array.from(uniqueArrowsMap.values());
  }, [
    retryState,
    showGuideLines,
    showPlayedMoveArrow,
    showBestMoveArrow,
    showAlternativeArrow,
    currentMoveIndex,
    moves,
    currentBestMove,
    previousAlternative,
    previewState,
  ]);

  // Square highlighting for played moves (piece movement indicator) and preview states
  // Colors are strictly STATIC and UNIQUE:
  // - Played Move: Royal Blue (rgba(59, 130, 246, 0.25) origin, rgba(59, 130, 246, 0.35) + #3b82f6 border destination)
  // - Best Move Preview: Emerald Green (rgba(16, 185, 129, 0.25) origin, rgba(16, 185, 129, 0.35) + #10b981 border destination)
  // - Alternative Move Preview: Cyan (rgba(6, 182, 212, 0.25) origin, rgba(6, 182, 212, 0.35) + #06b6d4 border destination)
  const boardSquareStyles = useMemo(() => {
    // 0. Retry mode active highlights
    if (retryState) {
      const styles = {};
      if (retryState.isHintShown && retryState.from) {
        styles[retryState.from] = {
          backgroundColor: 'rgba(245, 158, 11, 0.35)',
          boxShadow: 'inset 0 0 0 3px #f59e0b',
        };
      }
      if (retryState.isSolved && retryState.to) {
        styles[retryState.to] = {
          backgroundColor: 'rgba(16, 185, 129, 0.35)',
          boxShadow: 'inset 0 0 0 3px #10b981',
        };
      }
      return styles;
    }

    const styles = {};

    // 1. Highlight preview move squares if currently previewing
    if (previewState) {
      const isAlt = previewState.type === 'alternative';
      const bg = isAlt ? 'rgba(6, 182, 212, 0.25)' : 'rgba(16, 185, 129, 0.25)';
      const targetBg = isAlt ? 'rgba(6, 182, 212, 0.35)' : 'rgba(16, 185, 129, 0.35)';
      const border = isAlt ? '#06b6d4' : '#10b981';

      if (previewState.from) {
        styles[previewState.from] = { backgroundColor: bg };
      }
      if (previewState.to) {
        styles[previewState.to] = {
          backgroundColor: targetBg,
          boxShadow: `inset 0 0 0 2px ${border}`,
        };
      }
      return styles;
    }

    // 2. Highlight played move squares (indicating piece movement) — STATIC ROYAL BLUE
    if (currentMoveIndex > 0 && moves[currentMoveIndex - 1]) {
      const move = moves[currentMoveIndex - 1];
      styles[move.from] = { backgroundColor: 'rgba(59, 130, 246, 0.25)' };
      styles[move.to] = {
        backgroundColor: 'rgba(59, 130, 246, 0.35)',
        boxShadow: 'inset 0 0 0 2px #3b82f6',
      };
    }

    return styles;
  }, [
    retryState,
    currentMoveIndex,
    moves,
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
      type: 'best',
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
      type: 'alternative',
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
      type: 'best',
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
    requestedFenRef.current = null;

    // ── localCache: a plain JS object kept in sync during the loop.
    // React's setEvalCache is async, so evalCache state can't be read back
    // immediately after updates. We use localCache to pass accurate data to
    // generateGameSummary without waiting for React to re-render.
    const localCache = { ...evalCache };

    if (!localCache[0]) {
      const startRes = await evaluatePositionAsync(START_FEN, 10);
      localCache[0] = startRes;
      setEvalCache((prev) => ({ ...prev, [0]: startRes }));
    }

    for (let i = 1; i <= moves.length; i++) {
      if (cancelAnalysisRef.current) break;
      setAnalysisProgress({ current: i, total: moves.length });

      if (!localCache[i]) {
        const fen = moves[i - 1].fen;
        const res = await evaluatePositionAsync(fen, 10);
        localCache[i] = res;                                       // keep local copy in sync
        setEvalCache((prev) => ({ ...prev, [i]: res }));           // update UI state
      }
    }

    setIsAnalyzingAll(false);

    // ── Only show summary if the user didn't cancel ──────────────────────
    if (!cancelAnalysisRef.current) {
      // Rebuild classifications synchronously from the local cache snapshot
      // (mirrors the moveClassifications useMemo logic exactly)
      const localClassifications = {};
      for (let i = 1; i <= moves.length; i++) {
        const prev = localCache[i - 1];
        const curr = localCache[i];
        const move = moves[i - 1];
        if (!prev || !curr) continue;

        const isDeliveredCheckmate = curr.type === 'mate' && curr.value === 0;
        const isCheckmate = curr.type === 'mate' || prev.type === 'mate';

        if (curr.type === 'mate' && prev.type !== 'mate') {
          const isWhiteMating = curr.value > 0;
          const playerMated   = move.isWhite ? isWhiteMating : !isWhiteMating;
          localClassifications[i] = classifyMove(playerMated ? 0 : 500, true, playerMated, curr.bestMove, move.san, prev, curr, i, move.isWhite);
        } else {
          const evalDiff = curr.value - prev.value;
          const evalLoss = move.isWhite ? -evalDiff : evalDiff;
          localClassifications[i] = classifyMove(evalLoss, isCheckmate, isDeliveredCheckmate, curr.bestMove, move.san, prev, curr, i, move.isWhite);
        }
      }

      const summary = generateGameSummary({
        moves,
        evalCache:           localCache,
        moveClassifications: localClassifications,
        gameHeaders,
        gameTermination,
      });
      setGameSummaryData(summary);
      setShowGameSummary(true);
    }
  };

  const handleAutoAnalyze = runFullGameAnalysis;

  const cancelFullGameAnalysis = () => {
    cancelAnalysisRef.current = true;
    stop();
    requestedFenRef.current = null; // Invalidate live tracking
    setIsAnalyzingAll(false);
  };

  // Navigation handlers — clear any active preview and retry states synchronously
  const goToStart = () => { setPreviewState(null); setRetryState(null); setCurrentMoveIndex(0); };
  const goToPrev = () => { setPreviewState(null); setRetryState(null); setCurrentMoveIndex((prev) => Math.max(0, prev - 1)); };
  const goToNext = () => { setPreviewState(null); setRetryState(null); setCurrentMoveIndex((prev) => Math.min(moves.length, prev + 1)); };
  const goToEnd = () => { setPreviewState(null); setRetryState(null); setCurrentMoveIndex(moves.length); };

  // Jump to Next / Prev Blunder or Mistake or Missed Win
  const goToNextBlunder = () => {
    for (let i = currentMoveIndex + 1; i <= moves.length; i++) {
      const cls = moveClassifications[i];
      if (cls && (cls.type === 'blunder' || cls.type === 'mistake' || cls.type === 'missedWin')) {
        setPreviewState(null);
        setRetryState(null);
        setCurrentMoveIndex(i);
        return;
      }
    }
  };

  const goToPrevBlunder = () => {
    for (let i = currentMoveIndex - 1; i >= 1; i--) {
      const cls = moveClassifications[i];
      if (cls && (cls.type === 'blunder' || cls.type === 'mistake' || cls.type === 'missedWin')) {
        setPreviewState(null);
        setRetryState(null);
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
      const res = await fetch(`/api/chesscom?username=${encodeURIComponent(user)}&limit=6&offset=${offset}`);
      const data = await res.json();

      if (!res.ok) {
        setChesscomError(data.error || 'Failed to fetch games from Chess.com');
        setChesscomLoading(false);
        return;
      }

      if (isLoadMore) {
        const merged = [...chesscomGames, ...data.games];
        setChesscomGames(merged);
        const summary = analyzeLast6Games(merged, user);
        setRecentAnalysisSummary(summary);
      } else {
        const newGames = data.games || [];
        setChesscomGames(newGames);
        if (newGames.length === 0) {
          setChesscomError(`No recent games found for "${user}".`);
          setRecentAnalysisSummary(null);
        } else {
          const summary = analyzeLast6Games(newGames, user);
          setRecentAnalysisSummary(summary);
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
    <>
    <Analytics />
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 overflow-x-hidden">
      {/* Top Banner / Status & Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800 w-full">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
              title="Return to Home to select a different game"
            >
              <span>←</span>
              <span>Home</span>
            </button>
          )}
          <span className="font-extrabold text-base sm:text-lg text-zinc-900 dark:text-zinc-50 tracking-tight truncate max-w-[200px] sm:max-w-none">
            {gameHeaders.White || 'White'} vs {gameHeaders.Black || 'Black'}
          </span>
          {gameHeaders.Result && (
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 shrink-0">
              {gameHeaders.Result}
            </span>
          )}
          {gameTermination && (
            <span
              className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${gameTermination.badgeClass}`}
              title={gameTermination.description}
            >
              <span>{gameTermination.icon}</span>
              <span>{gameTermination.badge}</span>
            </span>
          )}
          {gameHeaders.ECO && (
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
              {gameHeaders.ECO}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Engine Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
              isReady
                ? evaluating || isAnalyzingAll
                  ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isReady
                  ? evaluating || isAnalyzingAll
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-emerald-500'
                  : 'bg-zinc-400'
              }`}
            />
            <span className="truncate">
              {isReady
                ? isAnalyzingAll
                  ? `Analyzing (${analysisProgress.current}/${analysisProgress.total})`
                  : evaluating
                  ? 'Thinking...'
                  : 'Stockfish Ready'
                : 'Initializing...'}
            </span>
          </span>

          {/* Flip Board Button */}
          <button
            onClick={() => setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'))}
            className="px-2.5 sm:px-3 py-1 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors shadow-sm shrink-0"
          >
            Flip ({boardOrientation === 'white' ? 'White' : 'Black'})
          </button>

          {/* Dark / Light Mode Switcher */}
          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors shadow-sm flex items-center justify-center shrink-0"
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full min-w-0">
        {/* Left Column: Guide Lines + Board + Navigation + Advantage Narrative (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center w-full min-w-0">
          {/* Guide Lines & Visual Suggestions Toolbar (On Top) */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 w-full max-w-[500px] p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs transition-colors">
            <div className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
              <span>🎯</span>
              <span className="text-[11px] uppercase tracking-wider">Guide Lines:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setShowGuideLines((prev) => !prev)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
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
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
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
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
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
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
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

          {/* Active Move Preview Banner */}
          {previewState && (
            <div
              className={`w-full max-w-[500px] mb-3 p-2.5 rounded-xl border flex items-center justify-between gap-2 shadow-xs transition-all ${
                previewState.type === 'alternative'
                  ? 'bg-cyan-50 dark:bg-cyan-950/80 border-cyan-300 dark:border-cyan-700 text-cyan-900 dark:text-cyan-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="text-base">👀</span>
                <span>
                  Previewing:{' '}
                  <strong
                    className={`font-bold underline ${
                      previewState.type === 'alternative' ? 'decoration-cyan-500' : 'decoration-emerald-500'
                    }`}
                  >
                    {previewState.description}
                  </strong>
                </span>
              </div>
              <button
                onClick={() => setPreviewState(null)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg text-white shadow-xs transition-colors flex items-center gap-1 ${
                  previewState.type === 'alternative'
                    ? 'bg-cyan-600 hover:bg-cyan-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                title="Return to actual game position"
              >
                <span>✕</span>
                <span>Exit Preview</span>
              </button>
            </div>
          )}

          {/* Board + Eval Bar container */}
          <div className="flex items-stretch gap-2.5 sm:gap-3 w-full max-w-[500px] justify-center">
            {/* Vertical Eval Bar */}
            <div className="w-5 sm:w-6 bg-zinc-900 rounded-md overflow-hidden flex flex-col justify-end border border-zinc-300 dark:border-zinc-700 shadow-inner relative select-none shrink-0 self-stretch">
              <div
                className="w-full bg-zinc-100 transition-all duration-300 ease-out"
                style={{ height: `${evalPercentage}%` }}
              />
              <div className="absolute inset-x-0 bottom-1 text-[8px] sm:text-[9px] font-mono font-bold text-center text-zinc-900 bg-white/70 backdrop-blur-xs py-0.5">
                {activeEval?.scoreText || '0.00'}
              </div>
            </div>

            {/* React Chessboard with Options */}
            <div className="flex-1 min-w-0 aspect-square rounded-lg overflow-hidden shadow-md border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900">
              <Chessboard
                options={{
                  position: retryState
                    ? (retryState.isSolved ? retryState.solvedFen : retryState.prevFen)
                    : (previewState ? previewState.fen : currentFen),
                  boardOrientation: boardOrientation,
                  allowDragging: Boolean(retryState && !retryState.isSolved),
                  onPieceDrop: handleRetryPieceDrop,
                  showAnimations: true,
                  animationDurationInMs: 250,
                  boardStyle: {
                    borderRadius: '8px',
                  },
                  arrows: boardArrows,
                  squareStyles: boardSquareStyles,
                  allowDrawingArrows: true,
                  arrowOptions: {
                    ...defaultArrowOptions,
                    arrowWidthDenominator: 5,
                    opacity: 0.8,
                  },
                }}
              />
            </div>
          </div>

          {/* Move Navigation Controls */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 w-full max-w-[500px] select-none" style={{ touchAction: 'manipulation' }}>
            <button
              onClick={goToStart}
              disabled={currentMoveIndex === 0}
              className="px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-sm transition-colors"
              title="First move (Home)"
            >
              |◀
            </button>
            <button
              onClick={goToPrev}
              disabled={currentMoveIndex === 0}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-sm transition-colors flex-1"
              title="Previous move (Left arrow)"
            >
              ◀ Prev
            </button>
            <button
              onClick={goToNext}
              disabled={currentMoveIndex >= moves.length}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-sm transition-colors flex-1"
              title="Next move (Right arrow)"
            >
              Next ▶
            </button>
            <button
              onClick={goToEnd}
              disabled={currentMoveIndex >= moves.length}
              className="px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-sm transition-colors"
              title="Last move (End)"
            >
              ▶|
            </button>
          </div>
          {/* Quick Blunder Jumper & Progress */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 mt-2 w-full max-w-[500px] text-xs">
            <button
              onClick={goToPrevBlunder}
              className="text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors text-[11px] sm:text-xs shrink-0"
            >
              ⏪ Prev Blunder
            </button>
            <span className="text-zinc-400 dark:text-zinc-500 font-medium text-[11px] sm:text-xs truncate text-center px-1">
              {currentMoveIndex === 0 ? 'Start' : `Move ${currentMoveIndex} of ${moves.length}`}
            </span>
            <button
              onClick={goToNextBlunder}
              className="text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors text-[11px] sm:text-xs shrink-0"
            >
              Next Blunder ⏩
            </button>
          </div>

          {/* Rule 3: The Game Graph (Visual narrative of advantage) */}
          <div className="w-full max-w-[500px] mt-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs transition-colors select-none">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
                <span className="text-sm">📈</span>
                <span className="text-[11px] uppercase tracking-wider">Advantage Narrative</span>
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                Click or tap to jump
              </span>
            </div>

            <div
              className="relative w-full h-[68px] sm:h-[76px] bg-zinc-50 dark:bg-zinc-950/70 rounded-lg overflow-hidden border border-zinc-200/80 dark:border-zinc-800 cursor-pointer"
              onClick={handleGraphClick}
              onTouchStart={handleGraphClick}
              title="Click or tap on the advantage graph to jump to that move"
            >
              {moves.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                  Load a game to see the advantage graph
                </div>
              ) : (
                <svg viewBox="0 0 500 74" className="w-full h-full block">
                  <defs>
                    <linearGradient id="whiteAdvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="blackAdvGrad" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Midline (0.00 Equal) */}
                  <line x1="0" y1="37" x2="500" y2="37" stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity="0.4" strokeWidth="1" />

                  {/* Static Score Guides */}
                  <text x="6" y="13" fontSize="8" fill="#94a3b8" fontWeight="bold">+5</text>
                  <text x="6" y="40" fontSize="8" fill="#94a3b8">0.0</text>
                  <text x="6" y="68" fontSize="8" fill="#94a3b8" fontWeight="bold">-5</text>

                  {/* Shaded Area Paths */}
                  {gameGraphData.whiteArea && (
                    <path d={gameGraphData.whiteArea} fill="url(#whiteAdvGrad)" />
                  )}
                  {gameGraphData.blackArea && (
                    <path d={gameGraphData.blackArea} fill="url(#blackAdvGrad)" />
                  )}

                  {/* Main Advantage Line */}
                  {gameGraphData.linePath && (
                    <path
                      d={gameGraphData.linePath}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Blunder & Mistake Highlight Dots */}
                  {gameGraphData.blunderDots.map((dot, idx) => (
                    <circle
                      key={idx}
                      cx={dot.x}
                      cy={dot.y}
                      r={dot.isBlunder ? "4.5" : "3.5"}
                      fill={dot.isBlunder ? "#ef4444" : "#f97316"}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="transition-transform hover:scale-125"
                    >
                      <title>{dot.title}</title>
                    </circle>
                  ))}

                  {/* Active Move Scrubber */}
                  {gameGraphData.currentPoint && (
                    <>
                      <line
                        x1={gameGraphData.currentPoint.x}
                        y1="4"
                        x2={gameGraphData.currentPoint.x}
                        y2="70"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="2 2"
                      />
                      <circle
                        cx={gameGraphData.currentPoint.x}
                        cy={gameGraphData.currentPoint.y}
                        r="5"
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </>
                  )}
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Game Review vs Deep Analysis Dual Experience (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 w-full max-w-[500px] lg:max-w-none mx-auto lg:mx-0 min-w-0">
          {/* Rule 5: Dual Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/90 rounded-xl border border-zinc-200 dark:border-zinc-700/80 shadow-xs w-full">
            <button
              onClick={() => { setAnalysisTab('review'); setRetryState(null); }}
              className={`flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 select-none cursor-pointer min-w-0 ${
                analysisTab === 'review'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs ring-1 ring-zinc-200 dark:ring-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <span className="text-sm shrink-0">⭐</span>
              <span className="truncate">Game Review</span>
              {accuracyScores.hasData && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold shrink-0 hidden sm:inline">
                  {accuracyScores.white}% / {accuracyScores.black}%
                </span>
              )}
            </button>
            <button
              onClick={() => { setAnalysisTab('deep'); setRetryState(null); }}
              className={`flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 select-none cursor-pointer min-w-0 ${
                analysisTab === 'deep'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs ring-1 ring-zinc-200 dark:ring-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <span className="text-sm shrink-0">🔬</span>
              <span className="truncate">Deep Analysis</span>
              <span className="text-[10px] text-zinc-400 font-mono shrink-0 hidden sm:inline">Depth {evalDepth}</span>
            </button>
          </div>

          {/* TAB 1: BEGINNER-FRIENDLY GAME REVIEW (Rules 1, 2, 3, 4, 5) */}
          {analysisTab === 'review' && (
            <div className="flex flex-col gap-4">
              {/* Rule 1: CAPS Game Accuracy Score Card */}
              {accuracyScores.hasData ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs transition-colors flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🎯</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        Accuracy (CAPS Model)
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">0–100% Score</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* White Accuracy */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800">
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        <span className="truncate">⚪ {gameHeaders.White || 'White'}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${getAccuracyTier(accuracyScores.white).badgeClass}`}>
                          {getAccuracyTier(accuracyScores.white).label}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-50">
                          {accuracyScores.white !== null ? `${accuracyScores.white}%` : '--'}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${accuracyScores.white || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Black Accuracy */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800">
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        <span className="truncate">⚫ {gameHeaders.Black || 'Black'}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${getAccuracyTier(accuracyScores.black).badgeClass}`}>
                          {getAccuracyTier(accuracyScores.black).label}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-50">
                          {accuracyScores.black !== null ? `${accuracyScores.black}%` : '--'}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-teal-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${accuracyScores.black || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Move breakdown pills */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <div className="flex flex-wrap gap-1">
                      {gameStats.white.best > 0 && <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">🌟 {gameStats.white.best}</span>}
                      {gameStats.white.good > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">👍 {gameStats.white.good}</span>}
                      {gameStats.white.inaccuracy > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">⚠️ {gameStats.white.inaccuracy}</span>}
                      {gameStats.white.mistake > 0 && <span className="px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300">❌ {gameStats.white.mistake}</span>}
                      {gameStats.white.blunder > 0 && <span className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">🚨 {gameStats.white.blunder}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {gameStats.black.best > 0 && <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">🌟 {gameStats.black.best}</span>}
                      {gameStats.black.good > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">👍 {gameStats.black.good}</span>}
                      {gameStats.black.inaccuracy > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">⚠️ {gameStats.black.inaccuracy}</span>}
                      {gameStats.black.mistake > 0 && <span className="px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300">❌ {gameStats.black.mistake}</span>}
                      {gameStats.black.blunder > 0 && <span className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">🚨 {gameStats.black.blunder}</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 shadow-xs flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    <span>⚡</span>
                    <span>Game Review & Accuracy</span>
                  </div>
                  <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                    Auto-Analyze this match to calculate your 0–100% CAPS Accuracy score and unlock full narrative coaching and blunder retry puzzles.
                  </p>
                  <button
                    onClick={runFullGameAnalysis}
                    disabled={!isReady || moves.length === 0 || isAnalyzingAll}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>⚡</span>
                    <span>{isAnalyzingAll ? `Analyzing Move ${analysisProgress.current} of ${analysisProgress.total}...` : 'Auto-Analyze Game Now'}</span>
                  </button>
                </div>
              )}

              {/* Rule 3: The Virtual Coach Speech Bubble Card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs transition-colors flex flex-col gap-3 w-full min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-lg shadow-2xs select-none shrink-0">
                      {currentVirtualCoach.avatar}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                        <span>Virtual Coach</span>
                        <span className="text-[10px] font-normal text-zinc-400 truncate">• {currentVirtualCoach.mood}</span>
                      </h3>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate block">
                        {currentVirtualCoach.title}
                      </span>
                    </div>
                  </div>
                  {currentMoveIndex > 0 && (
                    <span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-bold border shrink-0 ${currentClassification.badgeClass}`}>
                      <span>{currentClassification.icon}</span>
                      <span>{currentClassification.label}</span>
                    </span>
                  )}
                </div>

                {/* Speech Bubble */}
                <div className="relative p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed">
                  <p>{currentVirtualCoach.speech}</p>
                </div>

                {/* Game outcome conclusion in review */}
                {currentMoveIndex === moves.length && gameTermination && (
                  <div className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs ${gameTermination.badgeClass}`}>
                    <span className="text-lg shrink-0">{gameTermination.icon}</span>
                    <span className="font-semibold text-xs leading-snug">{gameTermination.description}</span>
                  </div>
                )}
              </div>

              {/* Best Move Guidance (Paired with Virtual Coach) */}
              {currentBestMove && (
                <div className="p-3 sm:p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs flex flex-col gap-2.5 transition-colors w-full min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-1.5 sm:gap-2 truncate min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
                        Best Move ({currentFen.split(' ')[1] === 'w' ? 'White' : 'Black'}):
                      </span>
                      <strong className="font-mono text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
                        {currentBestMove.san}
                      </strong>
                    </div>
                    <button
                      onClick={handlePreviewBestMove}
                      disabled={previewState?.moveSan === currentBestMove.san}
                      className="px-2.5 sm:px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold rounded-lg transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <span>👀</span>
                      <span>{previewState?.moveSan === currentBestMove.san ? 'Previewing' : 'Preview'}</span>
                    </button>
                  </div>

                  {/* Alternative Move for Blunder/Mistake if available */}
                  {previousAlternative && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate min-w-0">
                        Better for move {moves[currentMoveIndex - 1]?.moveNumber}: <strong className="font-mono text-cyan-600 dark:text-cyan-400">{previousAlternative.san}</strong>
                      </span>
                      <button
                        onClick={handlePreviewAlternative}
                        disabled={previewState?.moveSan === previousAlternative.san}
                        className="px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/80 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700 text-[11px] font-bold rounded transition-colors shrink-0 cursor-pointer"
                      >
                        {previewState?.moveSan === previousAlternative.san ? 'Previewing' : 'Alternative'}
                      </button>
                    </div>
                  )}

                  {/* Continuation / PV Sequence */}
                  {currentContinuation.length > 0 && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-1.5 flex-wrap font-mono text-xs">
                      <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mr-1">
                        Continuation:
                      </span>
                      {currentContinuation.slice(0, 5).map((step, idx) => (
                        <button
                          key={idx}
                          onClick={() => handlePreviewContinuation(step)}
                          className={`px-1.5 py-0.5 rounded text-[11px] border transition-colors cursor-pointer ${
                            previewState?.moveSan === step.san
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                              : 'bg-zinc-50 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                          }`}
                          title={`Click to preview position after ${step.san}`}
                        >
                          {step.turn === 'w' && <span className="opacity-60 mr-0.5">{step.moveNum}.</span>}
                          <span>{step.san}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Rule 4: Active Remediation ("Retry Mistakes") Card */}
              {previousAlternative && ['blunder', 'mistake', 'inaccuracy', 'missedWin'].includes(currentClassification?.type) && (
                <div>
                  {!retryState ? (
                    <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/70 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 shadow-xs flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 text-xs">
                          <span>🎯</span>
                          <span>Retry Mistake</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                          Active Learning
                        </span>
                      </div>

                      <p className="text-xs text-amber-900/90 dark:text-amber-300 leading-relaxed">
                        You played <strong className="font-mono">{moves[currentMoveIndex - 1]?.san}</strong> ({currentClassification.label}). Can you find the better move on the board?
                      </p>

                      <button
                        onClick={handleStartRetry}
                        className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>🎯</span>
                        <span>Start Retry Move</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-md flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                          <span className="text-sm">🎯</span>
                          <span>Retry Mistake Active</span>
                        </div>
                        <button
                          onClick={handleExitRetry}
                          className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          ✕ Exit
                        </button>
                      </div>

                      {!retryState.isSolved ? (
                        <div className="flex flex-col gap-2.5">
                          <p className="text-xs text-emerald-900/90 dark:text-emerald-300">
                            Drag pieces on the board to play the winning move!
                          </p>

                          {retryState.lastAttemptWrong && (
                            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-center gap-1.5 font-medium">
                              <span>❌</span>
                              <span>That move is not optimal. Give it another try!</span>
                            </div>
                          )}

                          {retryState.isHintShown && (
                            <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                              <span>💡</span>
                              <span>Coach Hint: Look at your <strong>{retryState.pieceName}</strong> on <strong>{retryState.from}</strong>!</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={handleShowRetryHint}
                              disabled={retryState.isHintShown}
                              className="flex-1 py-1.5 px-2 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>💡</span>
                              <span>{retryState.isHintShown ? 'Hint Shown' : 'Show Hint'}</span>
                            </button>
                            <button
                              onClick={handleRevealRetrySolution}
                              className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>👁️</span>
                              <span>Reveal Solution</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                            <span className="text-lg">🎉</span>
                            <span>Brilliant! You found {retryState.targetSan}!</span>
                          </div>

                          <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90">
                            Playing <strong className="font-mono">{retryState.targetSan}</strong> is the top Stockfish continuation that maintains your advantage.
                          </p>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => { setRetryState(null); goToNextBlunder(); }}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>Next Blunder ⏩</span>
                            </button>
                            <button
                              onClick={handleExitRetry}
                              className="px-3 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              Back to Review
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}


              {/* Friendly Move List with Emotion Icons (Rule 2) */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col transition-colors">
                <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Game Moves ({moves.length})
                  </h3>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Tap move to inspect</span>
                </div>

                <div className="max-h-[220px] overflow-y-auto p-2 font-mono text-xs">
                  {moves.length === 0 ? (
                    <div className="p-4 text-center text-zinc-400">No moves loaded</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1">
                      {moves.map((move, idx) => {
                        const isSelected = currentMoveIndex === idx + 1;
                        const classification = moveClassifications[idx + 1];

                        return (
                          <button
                            key={idx}
                            onClick={() => { setPreviewState(null); setRetryState(null); setCurrentMoveIndex(idx + 1); }}
                            className={`text-left px-2 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white font-bold'
                                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            <span className="flex items-center gap-1 truncate">
                              {move.isWhite && <span className="opacity-60">{move.moveNumber}.</span>}
                              <span>{move.san}</span>
                              {classification && classification.symbol && (
                                <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : classification.color}`}>
                                  {classification.symbol}
                                </span>
                              )}
                            </span>
                            {classification && classification.icon && (
                              <span className="text-xs shrink-0 select-none">{classification.icon}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADVANCED DEEP ANALYSIS (Rule 5: Progressive Disclosure) */}
          {analysisTab === 'deep' && (
            <div className="flex flex-col gap-4">
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
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
                          className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold cursor-pointer"
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

              {/* Move History / Notation Table with Raw Scores */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col transition-colors">
                <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Move Table & Engine Scores
                  </h3>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Depth {evalDepth}</span>
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
                              onClick={() => { setPreviewState(null); setRetryState(null); setCurrentMoveIndex(idx + 1); }}
                              className={`text-left px-2 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600 text-white font-bold'
                                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                              }`}
                            >
                              <span className="flex items-center gap-1 truncate">
                                {move.isWhite && <span className="opacity-60">{move.moveNumber}.</span>}
                                <span>{move.san}</span>
                                {classification && classification.symbol && (
                                  <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : classification.color}`}>
                                    {classification.symbol}
                                  </span>
                                )}
                              </span>
                              {cachedScore && (
                                <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-zinc-400 dark:text-zinc-500'}`}>
                                  {cachedScore}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Game Outcome Conclusion Pill */}
                      {(gameTermination || gameHeaders.Result) && (
                        <button
                          onClick={() => { setPreviewState(null); setRetryState(null); setCurrentMoveIndex(moves.length); }}
                          className={`mt-1 w-full py-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
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
                    className={`pb-1 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                      activeTab === 'link'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                    }`}
                  >
                    🔗 Link
                  </button>
                  <button
                    onClick={() => setActiveTab('pgn')}
                    className={`pb-1 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                      activeTab === 'pgn'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                    }`}
                  >
                    📝 Raw PGN
                  </button>
                  <button
                    onClick={() => setActiveTab('chesscom')}
                    className={`pb-1 text-xs font-bold border-b-2 transition-colors flex items-center gap-1 cursor-pointer ${
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
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Chess.com Game Link / Share Text
                    </label>

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
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
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
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
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
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
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
                        {/* 6-Games Summary Banner */}
                        {recentAnalysisSummary && (
                          <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/90 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/30 flex flex-col gap-2 shadow-2xs">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-base select-none">{recentAnalysisSummary.trend.icon}</span>
                                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                                  {recentAnalysisSummary.trend.title}
                                </span>
                              </div>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${recentAnalysisSummary.trend.badgeClass}`}>
                                {recentAnalysisSummary.winRate}% Win
                              </span>
                            </div>
                            <button
                              onClick={() => setShowRecentSummaryModal(true)}
                              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>📊</span>
                              <span>Review Last 6 Games</span>
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
                            Recent games for <strong>{chesscomUsername}</strong>:
                          </span>
                          {recentAnalysisSummary && (
                            <button
                              onClick={() => setShowRecentSummaryModal(true)}
                              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold shrink-0 cursor-pointer"
                            >
                              Report →
                            </button>
                          )}
                        </div>

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
                                    className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
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
                            className="w-full py-1.5 mt-1 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {chesscomLoading ? 'Importing more...' : '⬇ Import 6 More Games'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Game Analysis Summary Modal
          Appears automatically after "Auto-Analyze Full Game" completes.
          Backdrop click or ✕ or "Continue Analysis" button closes it.
          ═══════════════════════════════════════════════════════════════════ */}
      {showGameSummary && gameSummaryData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={() => setShowGameSummary(false)}
        >
          {/* Card — stop click propagation so backdrop click doesn't close when clicking inside */}
          <div
            className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-t-2xl flex-shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <span className="text-xl sm:text-2xl select-none shrink-0">🏆</span>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight truncate">
                    Game Analysis Summary
                  </h2>
                  <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                    {gameSummaryData.players.white} vs {gameSummaryData.players.black}
                    <span className="mx-1 opacity-40">•</span>
                    {gameSummaryData.result}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGameSummary(false)}
                style={{ touchAction: 'manipulation' }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-700 transition-colors text-sm font-bold flex-shrink-0"
                title="Close summary"
              >
                ✕
              </button>
            </div>

            {/* ── Scrollable Body ──────────────────────────────────────────── */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">

              {/* Narrative paragraphs */}
              <div className="space-y-2.5">
                {gameSummaryData.paragraphs.map((para, idx) => (
                  <p key={idx} className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>

              {/* Per-player stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {[
                  { label: gameSummaryData.players.white, icon: '⚪', stats: gameSummaryData.stats.white },
                  { label: gameSummaryData.players.black, icon: '⚫', stats: gameSummaryData.stats.black },
                ].map(({ label, icon, stats }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-sm">{icon}</span>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {stats.blunder > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                          🚨 {stats.blunder} Blunder{stats.blunder > 1 ? 's' : ''}
                        </span>
                      )}
                      {stats.mistake > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                          ❌ {stats.mistake} Mistake{stats.mistake > 1 ? 's' : ''}
                        </span>
                      )}
                      {stats.inaccuracy > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          ⚠️ {stats.inaccuracy} Inaccurac{stats.inaccuracy > 1 ? 'ies' : 'y'}
                        </span>
                      )}
                      {(stats.best + stats.excellent) > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          🌟 {stats.best + stats.excellent} Best/Excellent
                        </span>
                      )}
                      {stats.good > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          👍 {stats.good} Good
                        </span>
                      )}
                      {stats.blunder === 0 && stats.mistake === 0 && stats.inaccuracy === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ✨ Clean game!
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Key Moments list */}
              {gameSummaryData.topMoments.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                    📌 Key Moments
                  </h3>
                  <div className="space-y-2">
                    {gameSummaryData.topMoments.map((m, idx) => {
                      const colors = {
                        blunder:   { bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',    text: 'text-red-800 dark:text-red-300'    },
                        mistake:   { bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800', text: 'text-orange-800 dark:text-orange-300' },
                        inaccuracy:{ bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',   text: 'text-amber-800 dark:text-amber-300'  },
                      };
                      const c = colors[m.type] || { bg: 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700', text: 'text-zinc-700 dark:text-zinc-300' };
                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${c.bg}`}
                        >
                          <span className="text-base leading-none mt-0.5 flex-shrink-0 select-none">{m.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold ${c.text}`}>
                              {m.player}
                              <span className="mx-1 opacity-50">·</span>
                              Move {m.moveNumber}:
                              <span className="font-mono ml-1">{m.san}</span>
                              <span className="ml-1.5 text-[11px] font-medium opacity-60">({m.label})</span>
                            </div>
                            {m.evalLoss && m.prevScore && m.currScore && (
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Eval swung by {m.evalLoss} pawn{parseFloat(m.evalLoss) !== 1 ? 's' : ''}
                                <span className="mx-1 opacity-40">·</span>
                                {m.prevScore} → {m.currScore}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/80 dark:bg-zinc-900/80 rounded-b-2xl">
              <p className="text-xs text-zinc-400 dark:text-zinc-500 italic hidden sm:block">
                Tap any move in the list to explore it in depth.
              </p>
              <button
                onClick={() => setShowGameSummary(false)}
                style={{ touchAction: 'manipulation' }}
                className="w-full sm:w-auto sm:ml-auto px-5 py-2.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-2 select-none"
              >
                Continue Analysis <span className="opacity-75">→</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Last 6 Games Performance Review Modal */}
      <RecentGamesReviewModal
        isOpen={showRecentSummaryModal}
        onClose={() => setShowRecentSummaryModal(false)}
        summary={recentAnalysisSummary}
        onSelectGame={(pgn, title, rawGame) => {
          if (rawGame) {
            loadChesscomGame(rawGame);
          } else if (pgn) {
            setPgnText(pgn);
            loadPgnString(pgn);
          }
          setShowRecentSummaryModal(false);
        }}
      />

    </>
  );
}
