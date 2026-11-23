import React, { useEffect, useRef } from 'react';
import { Crown, Home, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { COLOR_HEX } from '../game/ludoEngine';
import { GameState } from '../game/types';

interface VictoryOverlayProps {
  gameState: GameState;
  isOnlineMatch: boolean;
  onRestart: () => void;
  onOpenLeaderboard: () => void;
  onExitToTitle: () => void;
}

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  tilt: number;
  tiltSpeed: number;
  swayPhase: number;
  swaySpeed: number;
  shape: 'rect' | 'ribbon' | 'diamond';
}

const CONFETTI_PALETTE = [
  '#fde047', // Gold foil
  '#f59e0b', // Amber gold
  '#ef4444', // Ludo Red
  '#22c55e', // Ludo Green
  '#3b82f6', // Ludo Blue
  '#f8fafc', // Diamond White
  '#f472b6', // Festive Rose
];

export const VictoryOverlay: React.FC<VictoryOverlayProps> = ({
  gameState,
  isOnlineMatch,
  onRestart,
  onOpenLeaderboard,
  onExitToTitle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const winnerColor = gameState.winners[0] || gameState.activeOrder[0];
  const winnerPlayer = gameState.players[winnerColor];
  const totalCaptures = gameState.activeOrder.reduce(
    (sum, c) => sum + (gameState.capturesCount[c] || 0),
    0
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let width = container.clientWidth || 460;
    let height = container.clientHeight || 844;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const syncCanvasSize = () => {
      width = container.clientWidth || 460;
      height = container.clientHeight || 844;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    syncCanvasSize();

    const resizeObserver = new ResizeObserver(syncCanvasSize);
    resizeObserver.observe(container);

    const makePiece = (burstSide?: 'left' | 'right' | 'top'): ConfettiPiece => {
      const shapes: ConfettiPiece['shape'][] = ['rect', 'rect', 'ribbon', 'diamond'];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];

      if (burstSide === 'left' || burstSide === 'right') {
        const fromLeft = burstSide === 'left';
        return {
          x: fromLeft ? width * 0.08 : width * 0.92,
          y: height * (0.28 + Math.random() * 0.25),
          vx: (fromLeft ? 1 : -1) * (1.8 + Math.random() * 4.4),
          vy: -(3.2 + Math.random() * 4.8),
          w: shape === 'ribbon' ? 5 : 7 + Math.random() * 5,
          h: shape === 'ribbon' ? 14 + Math.random() * 6 : 6 + Math.random() * 4,
          color: CONFETTI_PALETTE[Math.floor(Math.random() * CONFETTI_PALETTE.length)],
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.16,
          tilt: Math.random() * Math.PI * 2,
          tiltSpeed: 0.08 + Math.random() * 0.12,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: 0.04 + Math.random() * 0.04,
          shape,
        };
      }

      return {
        x: Math.random() * width,
        y: -15 - Math.random() * (burstSide === 'top' ? height * 0.6 : 40),
        vx: (Math.random() - 0.5) * 1.1,
        vy: 1.7 + Math.random() * 2.5,
        w: shape === 'ribbon' ? 5 : 7 + Math.random() * 5,
        h: shape === 'ribbon' ? 13 + Math.random() * 7 : 6 + Math.random() * 4,
        color: CONFETTI_PALETTE[Math.floor(Math.random() * CONFETTI_PALETTE.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.12,
        tilt: Math.random() * Math.PI * 2,
        tiltSpeed: 0.07 + Math.random() * 0.1,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.03 + Math.random() * 0.03,
        shape,
      };
    };

    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < 65; i++) {
      const p = makePiece('top');
      p.y = Math.random() * height;
      pieces.push(p);
    }
    for (let i = 0; i < 24; i++) pieces.push(makePiece('left'));
    for (let i = 0; i < 24; i++) pieces.push(makePiece('right'));

    const drawFrame = (animate: boolean) => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        if (animate) {
          p.swayPhase += p.swaySpeed;
          p.vx *= 0.985;
          p.vy = Math.min(4.6, p.vy + 0.075);
          p.x += p.vx + Math.sin(p.swayPhase) * 0.65;
          p.y += p.vy;
          p.rotation += p.rotSpeed;
          p.tilt += p.tiltSpeed;

          if (p.y > height + 24) {
            pieces[i] = makePiece();
            continue;
          }
        }

        const scaleX = Math.max(0.22, Math.abs(Math.cos(p.tilt)));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(scaleX, 1);
        ctx.fillStyle = p.color;

        if (p.shape === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(0, -p.h * 0.7);
          ctx.lineTo(p.w * 0.6, 0);
          ctx.lineTo(0, p.h * 0.7);
          ctx.lineTo(-p.w * 0.6, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }
    };

    if (prefersReducedMotion) {
      drawFrame(false);
      return () => resizeObserver.disconnect();
    }

    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      // Frame pacing guard so confetti stays smooth
      if (now - lastTime >= 16) {
        lastTime = now;
        drawFrame(true);
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
      data-testid="victory-overlay"
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center overflow-hidden bg-[#040b18]/82 p-4"
    >
      {/* Radial Golden Celebration Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 34%, rgba(250, 204, 21, 0.22) 0%, rgba(30, 58, 138, 0.12) 45%, rgba(4, 11, 24, 0.85) 100%)',
        }}
      />

      {/* Falling Confetti Particle Canvas (layered over card edge with pointer-events-none) */}
      <canvas
        ref={canvasRef}
        data-testid="victory-confetti-canvas"
        className="pointer-events-none absolute inset-0 z-30 h-full w-full"
      />

      {/* Celebratory Victory Card */}
      <div className="relative z-20 w-full max-w-sm rounded-3xl border border-[#fde047]/60 bg-gradient-to-b from-[#142749] via-[#0d1a33] to-[#081226] p-5 text-center shadow-[0_0_60px_rgba(250,204,21,0.28)]">
        {/* Top Champion Banner */}
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#fde047]/45 bg-[#fde047]/12 px-3 py-1 text-[11px] font-extrabold tracking-widest text-[#fde047] uppercase">
          <Sparkles className="h-3.5 w-3.5" />
          Grand Champion
        </div>

        {/* Glowing Crown Emblem */}
        <div className="relative mx-auto mt-3 flex h-18 w-18 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-full opacity-25"
            style={{ backgroundColor: COLOR_HEX[winnerColor] }}
          />
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#fde047] bg-gradient-to-b from-[#fef08a]/25 to-[#b45309]/25 shadow-[0_0_25px_rgba(250,204,21,0.4)]"
          >
            <Crown className="h-9 w-9 text-[#fde047] drop-shadow-[0_2px_8px_rgba(250,204,21,0.7)]" />
          </div>
        </div>

        <h2
          id="victory-title"
          className="font-display mt-3 text-2xl font-extrabold tracking-tight text-[#ffffff]"
        >
          {winnerPlayer?.name} Wins!
        </h2>
        <p className="mt-1 text-xs font-medium text-[#cbd5e1]">
          Victory in {gameState.turnCount} turns · {totalCaptures} capture
          {totalCaptures === 1 ? '' : 's'} · Leaderboard updated
        </p>

        {/* Podium / Standings */}
        <div className="mt-4 space-y-2 text-left">
          {gameState.winners.map((color, idx) => {
            const isChampion = idx === 0;
            const homeTokens = gameState.tokens[color].filter((t) => t.progress === 56).length;
            return (
              <div
                key={color}
                className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm ${
                  isChampion
                    ? 'border-[#fde047]/65 bg-gradient-to-r from-[#fde047]/18 to-[#0e1b35] shadow-md'
                    : 'border-white/10 bg-[#091326]/90'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`font-mono-num w-6 text-xs font-extrabold ${
                      isChampion ? 'text-[#fde047]' : 'text-[#94a3b8]'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/40"
                    style={{ backgroundColor: COLOR_HEX[color] }}
                  />
                  <span className="truncate font-bold text-[#ffffff]">
                    {gameState.players[color].name}
                  </span>
                  {isChampion && <Crown className="h-3.5 w-3.5 shrink-0 text-[#fde047]" />}
                </div>
                <div className="font-mono-num ml-2 shrink-0 text-[11px] font-semibold text-[#cbd5e1]">
                  {homeTokens}/4 · {gameState.capturesCount[color]} cap
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col gap-2">
          {!isOnlineMatch && (
            <button
              type="button"
              data-start="true"
              onClick={() => {
                soundEngine.playClick();
                onRestart();
              }}
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-[#fef08a]/80 bg-gradient-to-b from-[#fde047] via-[#eab308] to-[#b45309] px-6 py-2.5 text-sm font-extrabold text-[#0f172a] shadow-[0_6px_22px_rgba(234,179,8,0.4)] transition hover:brightness-110 active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" />
              Play Again
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenLeaderboard();
              }}
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#fde047]/35 bg-[#0d1f3c] px-3 py-2 text-xs font-bold text-[#fde047] transition hover:border-[#fde047] hover:bg-[#13294d]"
            >
              <Trophy className="h-4 w-4" />
              Leaderboard
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onExitToTitle();
              }}
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-xs font-bold text-[#f8fafc] transition hover:bg-white/15"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
