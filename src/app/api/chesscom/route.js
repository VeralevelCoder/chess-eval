import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username')?.trim();
    const rawLimit = parseInt(searchParams.get('limit') || '5', 10);
    const rawOffset = parseInt(searchParams.get('offset') || '0', 10);

    // Enforce safe bounds on pagination parameters (DoS prevention)
    const limit = Math.max(1, Math.min(isNaN(rawLimit) ? 5 : rawLimit, 20));
    const offset = Math.max(0, Math.min(isNaN(rawOffset) ? 0 : rawOffset, 200));

    // Strict validation of Chess.com username format (3-30 chars, alphanumeric + hyphens/underscores)
    if (!username || !/^[a-zA-Z0-9_\-]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: 'Valid username (3-30 alphanumeric, hyphen, or underscore characters) is required' },
        { status: 400 }
      );
    }

    const headers = {
      'User-Agent': 'ChessEvalApp/1.0 (https://github.com/ChessEval; contact: user@example.com)',
      Accept: 'application/json',
    };

    // Fetch archives list for user
    const archivesRes = await fetch(
      `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/archives`,
      { headers, next: { revalidate: 60 } }
    );

    if (archivesRes.status === 404) {
      return NextResponse.json(
        { error: `Player "${username}" not found on Chess.com` },
        { status: 404 }
      );
    }

    if (!archivesRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Chess.com player data (HTTP ${archivesRes.status})` },
        { status: archivesRes.status }
      );
    }

    const archivesData = await archivesRes.json();
    const archives = Array.isArray(archivesData.archives) ? archivesData.archives : [];

    if (archives.length === 0) {
      return NextResponse.json({
        games: [],
        hasMore: false,
        totalFetched: 0,
      });
    }

    // Accumulate games starting from most recent archive month backwards
    // Bound total upstream month fetches per request to prevent thread exhaustion DoS
    const MAX_ARCHIVE_FETCHES = 3;
    let archiveFetchCount = 0;
    const accumulatedGames = [];
    let archiveIdx = archives.length - 1;

    while (archiveIdx >= 0 && accumulatedGames.length < offset + limit && archiveFetchCount < MAX_ARCHIVE_FETCHES) {
      const archiveUrl = archives[archiveIdx];
      // SSRF guard: Ensure URL strictly targets the official Chess.com player API
      if (typeof archiveUrl === 'string' && archiveUrl.startsWith('https://api.chess.com/pub/player/')) {
        archiveFetchCount++;
        const monthRes = await fetch(archiveUrl, { headers, next: { revalidate: 60 } });
        if (monthRes.ok) {
          const monthData = await monthRes.json();
          const monthGames = (monthData.games || []).reverse(); // newest first
          accumulatedGames.push(...monthGames);
        }
      }
      archiveIdx--;
    }

    const sliced = accumulatedGames.slice(offset, offset + limit);
    const hasMore = accumulatedGames.length > offset + limit || archiveIdx >= 0;

    const formatted = sliced.map((g) => {
      // Determine human-readable result
      let outcome = 'Draw';
      if (g.white?.result === 'win') outcome = 'White won';
      else if (g.black?.result === 'win') outcome = 'Black won';

      // Format date
      let dateStr = '';
      if (g.end_time) {
        dateStr = new Date(g.end_time * 1000).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }

      return {
        id: g.uuid || g.url,
        url: g.url,
        timeClass: g.time_class || 'standard',
        timeControl: g.time_control || '',
        date: dateStr,
        outcome,
        white: {
          username: g.white?.username || 'White',
          rating: g.white?.rating || '?',
          result: g.white?.result || '',
        },
        black: {
          username: g.black?.username || 'Black',
          rating: g.black?.rating || '?',
          result: g.black?.result || '',
        },
        pgn: g.pgn || '',
      };
    });

    return NextResponse.json({
      username,
      games: formatted,
      hasMore,
      nextOffset: offset + formatted.length,
    });
  } catch (err) {
    if (err?.digest?.startsWith('NEXT_')) {
      throw err;
    }
    console.error('Chess.com API route error:', err);
    return NextResponse.json(
      { error: 'Internal server error while fetching Chess.com games' },
      { status: 500 }
    );
  }
}
