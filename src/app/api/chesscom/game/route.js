import { NextResponse } from 'next/server';
import { tcnToPgn } from 'chess-tcn';

export async function POST(request) {
  try {
    const body = await request.json();
    const input = (body.input || '').trim();

    if (!input) {
      return NextResponse.json(
        { error: 'Please provide a Chess.com game link or share text' },
        { status: 400 }
      );
    }

    // Extract game ID and game type from URL or share text
    // Requires exact chess.com domain (with dot escaped) or numeric ID
    const urlMatch =
      input.match(/(?:https?:\/\/)?(?:www\.)?chess\.com\/(?:game\/)?(live|daily)\/(\d+)/i) ||
      input.match(/(?:https?:\/\/)?(?:www\.)?chess\.com\/(\d+)/i) ||
      input.match(/\b(\d{8,16})\b/);

    if (!urlMatch) {
      return NextResponse.json(
        { error: 'Could not detect a valid Chess.com game link or Game ID in your input' },
        { status: 400 }
      );
    }

    const rawGameType = urlMatch[1]?.toLowerCase();
    const gameType = (rawGameType === 'daily' || rawGameType === 'live') ? rawGameType : 'live';
    const rawGameId = urlMatch[2] || urlMatch[1];

    // Ensure gameId is strictly numeric (prevention of path traversal / parameter injection)
    if (!rawGameId || !/^\d{5,16}$/.test(rawGameId)) {
      return NextResponse.json(
        { error: 'Invalid Chess.com Game ID format' },
        { status: 400 }
      );
    }
    const gameId = rawGameId;

    const headers = {
      'User-Agent': 'ChessEvalApp/1.0 (https://github.com/ChessEval; contact: user@example.com)',
      Accept: 'application/json',
    };

    // 1. Fetch game callback metadata
    let cbRes = await fetch(`https://www.chess.com/callback/${gameType}/game/${gameId}`, {
      headers,
      next: { revalidate: 60 },
    });

    // If live failed, try daily or vice-versa
    if (!cbRes.ok) {
      const altType = gameType === 'live' ? 'daily' : 'live';
      const altRes = await fetch(`https://www.chess.com/callback/${altType}/game/${gameId}`, {
        headers,
        next: { revalidate: 60 },
      });
      if (altRes.ok) {
        cbRes = altRes;
      }
    }

    if (!cbRes.ok) {
      return NextResponse.json(
        { error: `Could not retrieve game #${gameId} from Chess.com (HTTP ${cbRes.status})` },
        { status: cbRes.status }
      );
    }

    const cbData = await cbRes.json();
    const gameData = cbData.game || {};
    const pgnHeaders = gameData.pgnHeaders || {};

    let finalPgn = '';

    // 2. Try fetching from monthly archive to get official PGN with clocks and ECO
    const whiteUser = pgnHeaders.White?.trim();
    const dateStr = pgnHeaders.Date || '';
    const dateParts = dateStr.split('.');
    const year = dateParts[0];
    const month = dateParts[1]?.padStart(2, '0');

    // Strict validation of user, year, and month to prevent path traversal in upstream API fetch
    const isValidUser = whiteUser && /^[a-zA-Z0-9_\-]{3,30}$/.test(whiteUser);
    const isValidYear = year && /^\d{4}$/.test(year) && parseInt(year, 10) >= 1990 && parseInt(year, 10) <= 2100;
    const isValidMonth = month && /^(0[1-9]|1[0-2])$/.test(month);

    if (isValidUser && isValidYear && isValidMonth) {
      try {
        const archUrl = `https://api.chess.com/pub/player/${encodeURIComponent(
          whiteUser.toLowerCase()
        )}/games/${year}/${month}`;
        const archRes = await fetch(archUrl, { headers, next: { revalidate: 60 } });
        if (archRes.ok) {
          const archData = await archRes.json();
          const found = (archData.games || []).find(
            (g) => g.url?.includes(gameId) || (g.uuid && g.uuid === gameData.uuid)
          );
          if (found && found.pgn) {
            finalPgn = found.pgn;
          }
        }
      } catch (e) {
        console.warn('Could not fetch from monthly archive, using TCN decoder fallback', e);
      }
    }

    // 3. Fallback: decode moveList via TCN
    if (!finalPgn && gameData.moveList) {
      try {
        const decodedPgn = tcnToPgn(gameData.moveList);
        // Strip default empty headers and attach real pgnHeaders
        const movesOnly = decodedPgn.replace(/\[.*?\]\s*/g, '').trim();

        finalPgn = `[Event "${pgnHeaders.Event || 'Live Chess'}"]
[Site "Chess.com"]
[Date "${pgnHeaders.Date || ''}"]
[Round "-"]
[White "${pgnHeaders.White || 'White'}"]
[Black "${pgnHeaders.Black || 'Black'}"]
[Result "${pgnHeaders.Result || '*'}"]
[WhiteElo "${pgnHeaders.WhiteElo || ''}"]
[BlackElo "${pgnHeaders.BlackElo || ''}"]
[TimeControl "${pgnHeaders.TimeControl || ''}"]
[Termination "${pgnHeaders.Termination || ''}"]
[Link "https://www.chess.com/game/${gameType}/${gameId}"]

${movesOnly} ${pgnHeaders.Result || ''}`;
      } catch (err) {
        console.error('Failed to decode TCN:', err);
      }
    }

    if (!finalPgn) {
      return NextResponse.json(
        { error: 'Game found on Chess.com, but move notation could not be decoded.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      gameId,
      url: `https://www.chess.com/game/${gameType}/${gameId}`,
      pgn: finalPgn,
      white: pgnHeaders.White || 'White',
      black: pgnHeaders.Black || 'Black',
      result: pgnHeaders.Result || '',
      date: pgnHeaders.Date || '',
      title: `${pgnHeaders.White || 'White'} vs ${pgnHeaders.Black || 'Black'}`,
    });
  } catch (err) {
    if (err?.digest?.startsWith('NEXT_')) {
      throw err;
    }
    console.error('Chess.com game API error:', err);
    return NextResponse.json(
      { error: 'An error occurred while loading the game from Chess.com' },
      { status: 500 }
    );
  }
}

