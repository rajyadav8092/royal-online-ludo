import React from 'react';
import {
  Camera,
  Crown,
  Home,
  Music,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Smile,
  Trophy,
  VolumeX,
} from 'lucide-react';
import { ALL_COLORS, COLOR_HEX, getCurrentPlayerColor } from '../game/ludoEngine';
import {
  EmojiChatMessage,
  GameSettings,
  GameState,
  PlayerColor,
  ScreenPhase,
} from '../game/types';
import { soundEngine } from '../audio/soundEngine';
import { InstagramBadge } from './InstagramBadge';

const QUICK_EMOJIS = ['👏', '😂', '🔥', '😎', '😭', '😡', '🎲', '🙏', '❤️', '⚡'] as const;

interface GameHudProps {
  screenPhase: ScreenPhase;
  gameState: GameState;
  settings: GameSettings;
  isHumanTurn: boolean;
  localClientColor: PlayerColor | null;
  diceRollingVisual: boolean;
  roomCode: string | null;
  emojiMessages: EmojiChatMessage[];
  onSendEmoji?: (emoji: string) => void;
  onRollDice: () => void;
  onSelectToken: (tokenId: number) => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onExitToTitle: () => void;
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
  onToggleMusic: () => void;
  onToggleCamera: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  screenPhase,
  gameState,
  settings,
  isHumanTurn,
  localClientColor,
  diceRollingVisual,
  roomCode,
  emojiMessages,
  onSendEmoji,
  onRollDice,
  onSelectToken,
  onTogglePause,
  onRestart,
  onExitToTitle,
  onOpenSettings,
  onOpenLeaderboard,
  onToggleMusic,
  onToggleCamera,
}) => {
  const currentColor = getCurrentPlayerColor(gameState);
  const currentPlayer = gameState.players[currentColor];
  const isOnlineMatch = gameState.mode.startsWith('online');

  const canRoll =
    screenPhase === 'playing' &&
    isHumanTurn &&
    gameState.turnPhase === 'waiting_roll' &&
    !diceRollingVisual;

  const canSelectToken =
    screenPhase === 'playing' &&
    isHumanTurn &&
    gameState.turnPhase === 'selecting_token';

  const latestEmojiForColor = (color: PlayerColor): EmojiChatMessage | undefined => {
    for (let i = emojiMessages.length - 1; i >= 0; i--) {
      if (emojiMessages[i].color === color) return emojiMessages[i];
    }
    return undefined;
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-3">
      {/* Top Perimeter Strip: Instagram Link + Turn Banner + Utility Buttons */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col items-start gap-1">
          <InstagramBadge compact />
          {roomCode && !roomCode.startsWith('GLB-') && (
            <div className="pointer-events-auto rounded-lg border border-[#facc15]/45 bg-[#0d1d35]/95 px-2.5 py-1 text-xs text-[#e2e8f0] shadow">
              Room: <span className="font-mono-num font-bold text-[#fde047]">{roomCode}</span>
            </div>
          )}
        </div>

        {/* Active Turn Banner */}
        <div className="order-last w-full">
          <div className="mx-auto flex items-center justify-center gap-2 rounded-xl border border-[#facc15]/35 bg-[#0d1d35]/95 px-3.5 py-1.5 text-xs shadow-md">
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-white/50"
              style={{ backgroundColor: COLOR_HEX[currentColor] }}
            />
            <span className="truncate font-semibold text-[#ffffff]">{gameState.lastEventText}</span>
          </div>
        </div>

        {/* Compact Icon Utilities */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            aria-label={settings.musicEnabled ? 'Mute Music' : 'Enable Music'}
            onClick={() => {
              soundEngine.playClick();
              onToggleMusic();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#facc15]/35 bg-[#0d1d35]/95 text-[#f8fafc] shadow hover:border-[#fde047]"
          >
            {settings.musicEnabled ? (
              <Music className="h-4 w-4 text-[#fde047]" />
            ) : (
              <VolumeX className="h-4 w-4 text-[#94a3b8]" />
            )}
          </button>
          <button
            type="button"
            aria-label={settings.cameraMode === 'angled' ? 'Switch to Top Drone View' : 'Switch to 3D Drone View'}
            title={settings.cameraMode === 'angled' ? 'Drone View: 3D (Tap for Top)' : 'Drone View: Top (Tap for 3D)'}
            onClick={() => {
              soundEngine.playClick();
              onToggleCamera();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#facc15]/35 bg-[#0d1d35]/95 text-[#f8fafc] shadow hover:border-[#fde047]"
          >
            <Camera className="h-4 w-4 text-[#e2e8f0]" />
          </button>
          <button
            type="button"
            aria-label="Open Leaderboard"
            onClick={() => {
              soundEngine.playClick();
              onOpenLeaderboard();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#facc15]/35 bg-[#0d1d35]/95 text-[#f8fafc] shadow hover:border-[#fde047]"
          >
            <Trophy className="h-4 w-4 text-[#fde047]" />
          </button>
          <button
            type="button"
            aria-label="Open Settings"
            onClick={() => {
              soundEngine.playClick();
              onOpenSettings();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#facc15]/35 bg-[#0d1d35]/95 text-[#f8fafc] shadow hover:border-[#fde047]"
          >
            <Settings className="h-4 w-4 text-[#e2e8f0]" />
          </button>
          <button
            type="button"
            aria-label="Pause Game"
            onClick={() => {
              soundEngine.playClick();
              onTogglePause();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#facc15]/35 bg-[#0d1d35]/95 text-[#f8fafc] shadow hover:border-[#fde047]"
          >
            <Pause className="h-4 w-4 text-[#f8fafc]" />
          </button>
        </div>
      </div>

      {/* Bottom Perimeter: Player Status Strip + Emoji Quick-Chat (Online) + Dice/Token Action Dock */}
      <div className="flex flex-col gap-2">
        {/* Compact Player Roster with Live Emoji Bubbles */}
        {(() => {
          const activeColors = ALL_COLORS.filter((c) => gameState.players[c].isActive);
          const gridCols =
            activeColors.length === 3 ? 'grid-cols-3' : 'grid-cols-2';
          return (
            <div className={`mx-auto grid w-full gap-1.5 ${gridCols}`}>
              {activeColors.map((color) => {
                const p = gameState.players[color];
                const isTurn = color === currentColor && gameState.turnPhase !== 'finished';
                const homeCount = gameState.tokens[color].filter((t) => t.progress === 56).length;
                const isYou = localClientColor ? color === localClientColor : !p.isAI;
                const activeEmoji = latestEmojiForColor(color);

                return (
                  <div
                    key={color}
                    className={`relative flex items-center justify-between rounded-xl border px-3 py-1.5 text-xs transition ${
                      isTurn
                        ? 'border-[#d4af37] bg-[#192330]/95 shadow-md'
                        : 'border-white/10 bg-[#121a24]/88 opacity-85'
                    }`}
                  >
                    {activeEmoji && (
                      <div
                        key={activeEmoji.id}
                        data-testid={`player-emoji-${color}`}
                        className="pointer-events-none absolute -top-9 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-[#d4af37]/70 bg-[#0e141b] px-2.5 py-0.5 text-lg shadow-xl"
                      >
                        <span>{activeEmoji.emoji}</span>
                      </div>
                    )}

                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: COLOR_HEX[color] }}
                      />
                      <span className="truncate font-semibold text-[#f4f1ea]">
                        {p.name}
                        {isYou && isOnlineMatch ? ' (You)' : ''}
                      </span>
                    </div>
                    <span className="font-mono-num ml-2 shrink-0 text-[11px] font-bold text-[#f3cf68]">
                      {homeCount}/4
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Online Emoji Quick-Chat Bar (works anytime, even during opponent's turn!) */}
        {isOnlineMatch && screenPhase === 'playing' && onSendEmoji && (
          <div
            data-testid="emoji-chat-bar"
            className="pointer-events-auto mx-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-[#d4af37]/30 bg-[#121a24]/92 px-2.5 py-1.5 shadow-lg"
          >
            <span className="hidden items-center gap-1 pr-1 text-[11px] font-semibold text-[#a9b3c1] sm:inline-flex">
              <Smile className="h-3.5 w-3.5 text-[#f3cf68]" />
              React:
            </span>
            {QUICK_EMOJIS.map((emoji, idx) => (
              <button
                key={emoji}
                type="button"
                data-testid={`emoji-btn-${idx}`}
                aria-label={`Send emoji ${emoji}`}
                onClick={() => onSendEmoji(emoji)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#182330] text-lg transition hover:scale-110 hover:border-[#d4af37] active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Action Dock: Roll Dice or Quick-Select Highlighted Token */}
        <div className="pointer-events-auto mx-auto flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-[#facc15]/45 bg-gradient-to-b from-[#132645]/95 to-[#0c182d]/95 px-4 py-2 shadow-xl">
          <div className="flex items-center gap-2 pr-1">
            <span className="text-xs font-medium text-[#cbd5e1]">Dice:</span>
            <span
              data-testid="hud-dice-value"
              className="font-mono-num flex h-9 w-9 items-center justify-center rounded-lg border border-[#facc15]/50 bg-[#081326] text-lg font-extrabold text-[#fde047]"
            >
              {diceRollingVisual ? '...' : gameState.diceValue ?? '—'}
            </span>
          </div>

          {canRoll && (
            <button
              type="button"
              data-testid="roll-dice-btn"
              onClick={onRollDice}
              className="min-h-[42px] rounded-xl border border-[#fef08a]/70 bg-gradient-to-b from-[#fde047] via-[#eab308] to-[#b45309] px-6 py-2 text-sm font-extrabold text-[#0f172a] shadow-lg transition hover:brightness-110 active:scale-[0.97]"
            >
              Roll Dice
            </button>
          )}

          {canSelectToken && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-[#f3cf68]">Tap Token:</span>
              {gameState.validTokenIds.map((tid) => (
                <button
                  key={tid}
                  type="button"
                  data-testid={`select-token-${tid}`}
                  onClick={() => onSelectToken(tid)}
                  style={{ borderColor: COLOR_HEX[currentColor] }}
                  className="font-mono-num min-h-[44px] min-w-[44px] rounded-xl border-2 bg-[#1a2432] px-3 text-sm font-bold text-[#f4f1ea] transition hover:bg-[#253244] active:scale-95"
                >
                  #{tid + 1}
                </button>
              ))}
            </div>
          )}

          {!canRoll && !canSelectToken && gameState.turnPhase !== 'finished' && (
            <span className="px-2 text-xs font-medium text-[#cbd5e1]">
              {currentPlayer.isAI
                ? `${currentPlayer.name} is playing...`
                : diceRollingVisual
                  ? 'Rolling 3D dice...'
                  : `Waiting for ${currentPlayer.name}...`}
            </span>
          )}
        </div>
      </div>

      {/* PAUSE MODAL */}
      {screenPhase === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-title"
          className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#d4af37]/40 bg-[#151e29] p-6 text-center shadow-2xl">
            <h2 id="pause-title" className="font-display text-2xl font-bold text-[#f4f1ea]">
              Match Paused
            </h2>
            <p className="mt-1 text-xs text-[#a9b3c1]">
              Turn {gameState.turnCount} · {currentPlayer.name}&apos;s turn
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onTogglePause();
                }}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-5 py-2.5 text-sm font-bold text-[#11161d] hover:bg-[#e5c14d]"
              >
                <Play className="h-4 w-4 fill-current" />
                Resume Match
              </button>
              {!isOnlineMatch && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onRestart();
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-[#f4f1ea] hover:bg-white/10"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restart Match
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onExitToTitle();
                }}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-[#cbd5e1] hover:bg-white/10"
              >
                <Home className="h-4 w-4" />
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER / VICTORY MODAL */}
      {screenPhase === 'gameover' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="victory-title"
          className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#d4af37]/50 bg-[#151e29] p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d4af37]/20 text-[#f3cf68]">
              <Crown className="h-8 w-8" />
            </div>
            <h2 id="victory-title" className="font-display mt-3 text-2xl font-extrabold text-[#f4f1ea]">
              {gameState.players[gameState.winners[0]]?.name} Wins!
            </h2>
            <p className="mt-1 text-xs text-[#a9b3c1]">
              Completed in {gameState.turnCount} turns · Leaderboard updated
            </p>

            <div className="mt-4 space-y-2 text-left">
              {gameState.winners.map((color, idx) => (
                <div
                  key={color}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0e141b] px-3.5 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-num font-bold text-[#f3cf68]">#{idx + 1}</span>
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLOR_HEX[color] }}
                    />
                    <span className="font-semibold text-[#f4f1ea]">
                      {gameState.players[color].name}
                    </span>
                  </div>
                  <span className="font-mono-num text-xs text-[#a9b3c1]">
                    {gameState.capturesCount[color]} captures
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {!isOnlineMatch && (
                <button
                  type="button"
                  data-start="true"
                  onClick={() => {
                    soundEngine.playClick();
                    onRestart();
                  }}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#d4af37] px-6 py-2.5 text-sm font-bold text-[#11161d] hover:bg-[#e5c14d]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Play Again
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onExitToTitle();
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold text-[#f4f1ea] hover:bg-white/10"
              >
                <Home className="h-4 w-4" />
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
