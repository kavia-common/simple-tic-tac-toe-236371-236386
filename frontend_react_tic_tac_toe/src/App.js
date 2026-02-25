import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';

/**
 * Calculates the winner for a given Tic Tac Toe board.
 * @param {(null|'X'|'O')[]} squares 9-length array of square values.
 * @returns {null | { winner: 'X'|'O', line: number[] }} Winner payload or null.
 */
function calculateWinner(squares) {
  const lines = [
    // Rows
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    // Cols
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    // Diags
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line };
    }
  }
  return null;
}

function isDraw(squares) {
  return squares.every((s) => s !== null);
}

/**
 * Optional backend health check. Uses REACT_APP_API_BASE or REACT_APP_BACKEND_URL.
 * Never throws; always resolves to a structured result.
 * @returns {Promise<{ ok: boolean, baseUrl: string|null, message: string }>}
 */
async function fetchBackendHealth() {
  const baseUrl =
    (process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || '').trim() || null;

  if (!baseUrl) {
    return { ok: false, baseUrl: null, message: 'Backend not configured (env var missing)' };
  }

  // Note: REACT_APP_HEALTHCHECK_PATH is listed in env vars; we support it optionally.
  const healthPath = (process.env.REACT_APP_HEALTHCHECK_PATH || '/health').trim() || '/health';
  const url = `${baseUrl.replace(/\/$/, '')}${healthPath.startsWith('/') ? '' : '/'}${healthPath}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return { ok: false, baseUrl, message: `Health check failed (${res.status})` };
    }

    // Try to parse JSON, but tolerate text responses.
    let payload = null;
    try {
      payload = await res.json();
    } catch {
      // ignore
    }

    const msg =
      payload && typeof payload === 'object'
        ? payload.status || payload.message || 'OK'
        : 'OK';

    return { ok: true, baseUrl, message: String(msg) };
  } catch (e) {
    return { ok: false, baseUrl, message: e instanceof Error ? e.message : 'Network error' };
  }
}

// PUBLIC_INTERFACE
function App() {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);

  const [health, setHealth] = useState({
    state: 'idle', // 'idle' | 'checking' | 'ready'
    ok: null, // boolean | null
    message: '',
    baseUrl: null,
  });

  const winnerResult = useMemo(() => calculateWinner(squares), [squares]);
  const winningLine = winnerResult?.line ?? [];
  const winner = winnerResult?.winner ?? null;
  const draw = !winner && isDraw(squares);
  const gameOver = Boolean(winner) || draw;

  const statusText = useMemo(() => {
    if (winner) return `Winner: ${winner}`;
    if (draw) return 'Draw — no winner';
    return `Next player: ${xIsNext ? 'X' : 'O'}`;
  }, [winner, draw, xIsNext]);

  const handleSquareClick = useCallback(
    (index) => {
      if (gameOver) return;
      if (squares[index]) return;

      const nextSquares = squares.slice();
      nextSquares[index] = xIsNext ? 'X' : 'O';
      setSquares(nextSquares);
      setXIsNext((v) => !v);
    },
    [gameOver, squares, xIsNext]
  );

  const resetGame = useCallback(() => {
    setSquares(Array(9).fill(null));
    setXIsNext(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setHealth((h) => ({ ...h, state: 'checking' }));
      const result = await fetchBackendHealth();
      if (cancelled) return;
      setHealth({
        state: 'ready',
        ok: result.ok,
        message: result.message,
        baseUrl: result.baseUrl,
      });
    }

    // Non-blocking: do not await in render, and do not impact gameplay.
    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="App">
      <main className="appShell">
        <section className="card" aria-label="Tic Tac Toe">
          <header className="header">
            <div className="titleBlock">
              <h1 className="title">Tic Tac Toe</h1>
              <p className="subtitle">Play locally in your browser.</p>
            </div>

            <div className="healthPill" aria-label="Backend health status">
              <span className="healthLabel">Backend</span>
              <span
                className={[
                  'healthDot',
                  health.state !== 'ready'
                    ? 'healthDot--checking'
                    : health.ok
                      ? 'healthDot--ok'
                      : 'healthDot--bad',
                ].join(' ')}
              />
              <span className="healthText">
                {health.state !== 'ready'
                  ? 'Checking…'
                  : health.ok
                    ? 'Online'
                    : 'Offline'}
              </span>
            </div>
          </header>

          <div className="statusRow" role="status" aria-live="polite">
            <span className="statusText">{statusText}</span>
            {gameOver ? (
              <button className="btn btnSecondary" type="button" onClick={resetGame}>
                New game
              </button>
            ) : (
              <button className="btn btnGhost" type="button" onClick={resetGame}>
                Reset
              </button>
            )}
          </div>

          <div className="boardWrap">
            <div className="board" role="grid" aria-label="Tic Tac Toe board">
              {squares.map((value, idx) => {
                const isWinning = winningLine.includes(idx);
                const ariaLabel = value
                  ? `Square ${idx + 1}, ${value}`
                  : `Square ${idx + 1}, empty`;

                return (
                  <button
                    key={idx}
                    type="button"
                    className={[
                      'square',
                      value ? 'square--filled' : '',
                      isWinning ? 'square--winning' : '',
                    ].join(' ')}
                    onClick={() => handleSquareClick(idx)}
                    aria-label={ariaLabel}
                    role="gridcell"
                  >
                    <span className="squareValue" aria-hidden="true">
                      {value}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <footer className="footer">
            <div className="hint">
              <span className="kbd">Tip</span> Click a square to place your mark.
            </div>

            <div className="backendNote">
              {health.state === 'ready' && health.baseUrl ? (
                <span className="backendMeta">
                  Health from <code className="inlineCode">{health.baseUrl}</code>: {health.message}
                </span>
              ) : (
                <span className="backendMeta">
                  Gameplay does not require a backend connection.
                </span>
              )}
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default App;
