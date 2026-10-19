import { Chess } from 'chess.js';

/**
 * Analyzes the user's most recent matches (up to 6 games)
 * Extracts progress vs regression trends, color win-rates, common strengths,
 * common vulnerabilities/mistakes, and actionable coaching guidance without any LLM call.
 *
 * @param {Array} games - List of games returned by /api/chesscom
 * @param {string} targetUsername - The username being inspected
 * @returns {Object} Structured analysis summary
 */
export function analyzeLast6Games(games = [], targetUsername = '') {
  if (!Array.isArray(games) || games.length === 0 || !targetUsername) {
    return null;
  }

  // Take up to 6 most recent games
  const recentGames = games.slice(0, 6);
  const normalizedUser = targetUsername.trim().toLowerCase();

  let wins = 0;
  let losses = 0;
  let draws = 0;

  const whiteStats = { played: 0, wins: 0, losses: 0, draws: 0 };
  const blackStats = { played: 0, wins: 0, losses: 0, draws: 0 };

  const parsedGames = [];
  const ratings = [];

  // Patterns counters
  let earlyWins = 0; // Won in < 30 moves
  let earlyLosses = 0; // Lost in < 30 moves
  let longWins = 0; // Won in >= 38 moves
  let longLosses = 0; // Lost in >= 38 moves
  let earlyCastlingCount = 0; // Castled within first 12 moves
  let uncastledLosses = 0; // Lost with uncastled king

  recentGames.forEach((g) => {
    const isUserWhite = (g.white?.username || '').toLowerCase() === normalizedUser;
    const isUserBlack = (g.black?.username || '').toLowerCase() === normalizedUser;
    const userColor = isUserWhite ? 'white' : 'black';

    // Outcome for target user
    let userResult = 'draw';
    const whiteRes = g.white?.result || '';
    const blackRes = g.black?.result || '';

    if (isUserWhite) {
      if (whiteRes === 'win') userResult = 'win';
      else if (['checkmated', 'resigned', 'timeout', 'abandoned'].includes(whiteRes) || blackRes === 'win') {
        userResult = 'loss';
      }
    } else if (isUserBlack) {
      if (blackRes === 'win') userResult = 'win';
      else if (['checkmated', 'resigned', 'timeout', 'abandoned'].includes(blackRes) || whiteRes === 'win') {
        userResult = 'loss';
      }
    }

    if (userResult === 'win') wins++;
    else if (userResult === 'loss') losses++;
    else draws++;

    // Color breakdowns
    const targetColorStats = isUserWhite ? whiteStats : blackStats;
    targetColorStats.played++;
    if (userResult === 'win') targetColorStats.wins++;
    else if (userResult === 'loss') targetColorStats.losses++;
    else targetColorStats.draws++;

    // User Rating
    const userRatingVal = parseInt(isUserWhite ? g.white?.rating : g.black?.rating, 10);
    if (!isNaN(userRatingVal) && userRatingVal > 0) {
      ratings.push(userRatingVal);
    }

    // Parse PGN for move counts and opening details
    let moveCount = 0;
    let openingName = 'Standard Opening';
    let eco = '';
    let termination = g.outcome || 'Game Over';
    let userCastled = false;
    let castledMoveNum = 0;

    if (g.pgn) {
      try {
        const chess = new Chess();
        chess.loadPgn(g.pgn);
        const headers = chess.header();
        const history = chess.history({ verbose: true });
        moveCount = Math.ceil(history.length / 2);

        eco = headers.ECO || '';
        openingName = headers.Opening || (eco ? `ECO ${eco}` : 'Standard Game');
        if (headers.Termination) {
          termination = headers.Termination;
        }

        // Detect castling
        history.forEach((m, idx) => {
          const isUserTurn = isUserWhite ? idx % 2 === 0 : idx % 2 === 1;
          if (isUserTurn && (m.flags.includes('k') || m.flags.includes('q'))) {
            userCastled = true;
            castledMoveNum = Math.ceil((idx + 1) / 2);
          }
        });
      } catch (err) {
        // Fallback move approximation if PGN parse fails
        moveCount = 30;
      }
    }

    // Accumulate tactical traits
    if (userCastled && castledMoveNum > 0 && castledMoveNum <= 12) {
      earlyCastlingCount++;
    }
    if (!userCastled && userResult === 'loss') {
      uncastledLosses++;
    }
    if (userResult === 'win' && moveCount > 0 && moveCount < 30) {
      earlyWins++;
    }
    if (userResult === 'loss' && moveCount > 0 && moveCount < 30) {
      earlyLosses++;
    }
    if (userResult === 'win' && moveCount >= 38) {
      longWins++;
    }
    if (userResult === 'loss' && moveCount >= 38) {
      longLosses++;
    }

    parsedGames.push({
      id: g.id,
      url: g.url,
      pgn: g.pgn,
      date: g.date,
      timeClass: g.timeClass,
      userColor,
      userResult, // 'win' | 'loss' | 'draw'
      opponentName: isUserWhite ? g.black?.username : g.white?.username,
      opponentRating: isUserWhite ? g.black?.rating : g.white?.rating,
      userRating: isUserWhite ? g.white?.rating : g.black?.rating,
      moveCount,
      openingName,
      eco,
      termination,
      rawGame: g,
    });
  });

  const totalGames = recentGames.length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const whiteWinRate = whiteStats.played > 0 ? Math.round((whiteStats.wins / whiteStats.played) * 100) : 0;
  const blackWinRate = blackStats.played > 0 ? Math.round((blackStats.wins / blackStats.played) * 100) : 0;

  // Rating Trajectory
  let ratingDelta = 0;
  if (ratings.length >= 2) {
    // games are sorted newest first, so ratings[0] is newest, ratings[ratings.length - 1] is oldest
    ratingDelta = ratings[0] - ratings[ratings.length - 1];
  }

  // Determine Overall Progress vs Regression Status
  let trend = {
    status: 'stable',
    title: 'Solid Consistency',
    badgeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    icon: '⚡',
    summary: 'Holding steady with balanced match outcomes.',
  };

  const streak = parsedGames.slice(0, 3).map((g) => g.userResult);
  const isHotStreak = streak.every((r) => r === 'win');
  const isSlump = streak.every((r) => r === 'loss');

  if (isHotStreak) {
    trend = {
      status: 'progressed',
      title: 'Trending Up — On Fire!',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      icon: '🔥',
      summary: `Riding an active 3-game win streak with sharp execution (${wins}W - ${losses}L).`,
    };
  } else if (wins >= 4) {
    trend = {
      status: 'progressed',
      title: 'Strong Form Progression',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      icon: '📈',
      summary: `Won ${wins} of your last ${totalGames} matches (${winRate}% win rate) — rating and confidence on the rise!`,
    };
  } else if (isSlump || losses >= 4) {
    trend = {
      status: 'regressed',
      title: 'Facing Resistance',
      badgeClass: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700',
      icon: '📉',
      summary: `Dropped ${losses} of your last ${totalGames} games. Tactical review recommended to stem early concessions.`,
    };
  } else if (wins >= 3) {
    trend = {
      status: 'progressed',
      title: 'Positive Trajectory',
      badgeClass: 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700',
      icon: '💪',
      summary: `Scored ${wins} victories in ${totalGames} games, demonstrating positive momentum.`,
    };
  }

  // Detect Common Strengths (Human-like insights)
  const strengths = [];

  if (earlyWins >= 2) {
    strengths.push({
      icon: '⚡',
      title: 'Fast Tactical Punishments',
      desc: `Finished ${earlyWins} matches in under 30 moves by capitalizing quickly on early opponent inaccuracies.`,
    });
  }

  if (longWins >= 1) {
    strengths.push({
      icon: '🛡️',
      title: 'Endgame Tenacity',
      desc: `Showed composure grinding down advantages in long endgames lasting over 38 moves.`,
    });
  }

  if (earlyCastlingCount >= 3) {
    strengths.push({
      icon: '👑',
      title: 'Sound King Safety',
      desc: `Castled early within the first 12 moves in ${earlyCastlingCount} games, shielding your monarch and mobilizing rooks.`,
    });
  }

  if (whiteWinRate >= 66 && whiteStats.played >= 2) {
    strengths.push({
      icon: '⚪',
      title: 'First-Move Command',
      desc: `Dominant with the white pieces (${whiteStats.wins}W / ${whiteStats.played} games), dictating opening initiative.`,
    });
  }

  if (blackWinRate >= 50 && blackStats.played >= 2) {
    strengths.push({
      icon: '⚫',
      title: 'Black Piece Resilience',
      desc: `Solid defensive record playing Black (${blackStats.wins}W in ${blackStats.played} games), neutralizing opponent pressure.`,
    });
  }

  if (strengths.length === 0) {
    strengths.push({
      icon: '♟️',
      title: 'Active Piece Engagement',
      desc: `Maintained persistent attacking presence and competitive activity across all ${totalGames} matches.`,
    });
  }

  // Detect Common Mistakes / Vulnerabilities
  const mistakes = [];

  if (earlyLosses >= 2) {
    mistakes.push({
      icon: '🚨',
      title: 'Early Tactical Concessions',
      desc: `Conceded ${earlyLosses} losses in under 30 moves, pointing to sudden tactical oversights or piece drops in the opening/middlegame.`,
    });
  }

  if (blackStats.losses >= 2 && blackWinRate < 40) {
    mistakes.push({
      icon: '⚫',
      title: 'Black Opening Pressure',
      desc: `Struggled to equalize as Black (${blackStats.losses} losses in ${blackStats.played} games), giving up early central control.`,
    });
  }

  if (uncastledLosses >= 1) {
    mistakes.push({
      icon: '⚠️',
      title: 'Delayed Castling Exposure',
      desc: `Lost with an uncastled king in ${uncastledLosses} match, leaving your center vulnerable to opponent open files and pins.`,
    });
  }

  if (longLosses >= 1) {
    mistakes.push({
      icon: '⏳',
      title: 'Endgame Precision Drift',
      desc: `Lost in deep endgame play (38+ moves), suggesting fatigue or conversion slips when pawns were traded down.`,
    });
  }

  if (mistakes.length === 0) {
    mistakes.push({
      icon: '🎯',
      title: 'Middlegame Prophylaxis',
      desc: `Focus on anticipating opponent pawn breaks and prophylaxis before launching piece attacks.`,
    });
  }

  // Actionable Coach Recommendation
  let coachAdvice = '';
  if (trend.status === 'progressed') {
    coachAdvice = `You're playing with high confidence! Keep maintaining your sharp tactical eye, and take extra time in double-edged positions to confirm your calculations before executing.`;
  } else if (trend.status === 'regressed') {
    coachAdvice = `Take a short breather between matches to reset your focus. In your next games, prioritize basic king safety and double-checking that all your pieces are adequately defended before attacking.`;
  } else {
    coachAdvice = `Your games show great potential. Stabilize your defense when playing Black, and look for opportunities to convert slight positional edges into decisive kingside initiatives.`;
  }

  return {
    username: targetUsername,
    totalGames,
    wins,
    losses,
    draws,
    winRate,
    ratingDelta,
    latestRating: ratings[0] || null,
    trend,
    whiteStats: { ...whiteStats, winRate: whiteWinRate },
    blackStats: { ...blackStats, winRate: blackWinRate },
    strengths: strengths.slice(0, 3),
    mistakes: mistakes.slice(0, 3),
    coachAdvice,
    games: parsedGames,
  };
}
