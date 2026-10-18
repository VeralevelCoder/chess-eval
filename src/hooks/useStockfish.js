'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook to interface with Stockfish running inside a Web Worker.
 * Communicates via Universal Chess Interface (UCI) protocol.
 */
export default function useStockfish() {
  const workerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState({
    type: 'cp', // 'cp' or 'mate'
    value: 0, // Centipawns or mate steps from White's perspective
    scoreText: '0.00',
    depth: 0,
    bestMove: '',
    pv: '',
  });

  const turnRef = useRef('w');
  const currentEvalRef = useRef(evaluation);
  const pendingResolveRef = useRef(null);

  useEffect(() => {
    currentEvalRef.current = evaluation;
  }, [evaluation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let worker = null;
    try {
      // Load self-contained Stockfish JS worker directly from public/
      worker = new Worker('/stockfish.js');
    } catch (e) {
      console.error('Failed to initialize Stockfish worker:', e);
      return;
    }

    workerRef.current = worker;

    worker.onmessage = (event) => {
      const line = typeof event.data === 'string' ? event.data : '';

      if (line === 'uciok' || line === 'readyok') {
        setIsReady(true);
      }

      // Parse UCI info lines: "info depth 12 ... score cp 35 ... pv e2e4"
      if (line.startsWith('info') && line.includes('score')) {
        const depthMatch = line.match(/depth\s+(\d+)/);
        const depth = depthMatch ? parseInt(depthMatch[1], 10) : 0;

        const cpMatch = line.match(/score\s+cp\s+(-?\d+)/);
        const mateMatch = line.match(/score\s+mate\s+(-?\d+)/);
        const pvMatch = line.match(/pv\s+(.+)$/);

        const currentTurn = turnRef.current; // 'w' or 'b'

        let bestMoveFromPv = currentEvalRef.current.bestMove;
        let pvStr = currentEvalRef.current.pv;
        if (pvMatch) {
          pvStr = pvMatch[1].trim();
          const firstMove = pvStr.split(/\s+/)[0];
          if (firstMove && firstMove.length >= 4 && firstMove !== '(none)') {
            bestMoveFromPv = firstMove;
          }
        }

        if (cpMatch) {
          const rawCp = parseInt(cpMatch[1], 10);
          // Stockfish score is from perspective of side to move. Convert to White's perspective:
          const whiteCp = currentTurn === 'w' ? rawCp : -rawCp;
          const scoreNum = whiteCp / 100;
          const scoreFormatted = (whiteCp > 0 ? '+' : '') + scoreNum.toFixed(2);

          const updated = {
            type: 'cp',
            value: whiteCp,
            scoreText: scoreFormatted,
            depth,
            bestMove: bestMoveFromPv,
            pv: pvStr,
          };
          currentEvalRef.current = updated;
          setEvaluation(updated);
        } else if (mateMatch) {
          const rawMate = parseInt(mateMatch[1], 10);
          const whiteMate = currentTurn === 'w' ? rawMate : -rawMate;
          const scoreFormatted = whiteMate > 0 ? `+M${whiteMate}` : `-M${Math.abs(whiteMate)}`;

          const updated = {
            type: 'mate',
            value: whiteMate > 0 ? 10000 - whiteMate : -10000 - whiteMate,
            scoreText: scoreFormatted,
            depth,
            bestMove: bestMoveFromPv,
            pv: pvStr,
          };
          currentEvalRef.current = updated;
          setEvaluation(updated);
        }
      }

      if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const rawBest = parts[1] || '';
        const bestMove = (rawBest && rawBest !== '(none)') ? rawBest : (currentEvalRef.current.bestMove || '');
        const finalEval = {
          ...currentEvalRef.current,
          bestMove,
        };
        currentEvalRef.current = finalEval;
        setEvaluation(finalEval);
        setEvaluating(false);

        if (pendingResolveRef.current) {
          const resolve = pendingResolveRef.current;
          pendingResolveRef.current = null;
          resolve(finalEval);
        }
      }
    };

    worker.postMessage('uci');
    worker.postMessage('isready');

    return () => {
      if (worker) {
        try {
          worker.postMessage('quit');
          worker.terminate();
        } catch {}
      }
    };
  }, []);

  const evaluatePosition = useCallback((fen, depth = 12) => {
    if (!workerRef.current) return;

    const parts = fen.split(' ');
    turnRef.current = parts[1] || 'w';

    const fresh = {
      ...currentEvalRef.current,
      bestMove: '',
      pv: '',
    };
    currentEvalRef.current = fresh;
    setEvaluation(fresh);

    setEvaluating(true);
    workerRef.current.postMessage('stop');
    workerRef.current.postMessage(`position fen ${fen}`);
    workerRef.current.postMessage(`go depth ${depth}`);
  }, []);

  const evaluatePositionAsync = useCallback((fen, depth = 10) => {
    return new Promise((resolve) => {
      if (!workerRef.current) {
        resolve({
          type: 'cp',
          value: 0,
          scoreText: '0.00',
          depth: 0,
          bestMove: '',
          pv: '',
        });
        return;
      }

      const parts = fen.split(' ');
      turnRef.current = parts[1] || 'w';

      const fresh = {
        ...currentEvalRef.current,
        bestMove: '',
        pv: '',
      };
      currentEvalRef.current = fresh;

      pendingResolveRef.current = resolve;
      setEvaluating(true);
      workerRef.current.postMessage('stop');
      workerRef.current.postMessage(`position fen ${fen}`);
      workerRef.current.postMessage(`go depth ${depth}`);
    });
  }, []);

  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage('stop');
    }
    setEvaluating(false);
    if (pendingResolveRef.current) {
      pendingResolveRef.current(currentEvalRef.current);
      pendingResolveRef.current = null;
    }
  }, []);

  return {
    isReady,
    evaluating,
    evaluation,
    evaluatePosition,
    evaluatePositionAsync,
    stop,
  };
}
