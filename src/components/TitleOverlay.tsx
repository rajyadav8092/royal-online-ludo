import React from 'react';
import {
  Bot,
  Globe,
  KeyRound,
  Music,
  Play,
  Settings,
  Trophy,
  Users,
  VolumeX,
} from 'lucide-react';
import { GameMode, GameSettings } from '../game/types';
import { soundEngine } from '../audio/soundEngine';
import { InstagramBadge } from './InstagramBadge';

interface TitleOverlayProps {
  settings: GameSettings;
  onlinePlayersCount: number;
  onSelectMode: (mode: GameMode) => void;
  onQuickStart: () => void;
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
  onToggleMusic: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  settings,
  onlinePlayersCount,
  onSelectMode,
  onQuickStart,
  onOpenSettings,
  onOpenLeaderboard,
  onToggleMusic,
}) => {
  const modeCards: Array<{
    mode: GameMode;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    accent: string;
  }> = [
    {
      mode: 'computer',
      title: 'Computer Mode',
      subtitle: '1–3 Humans vs 1–3 AI Players',
      icon: <Bot className="h-5 w-5 text-[#f3cf68]" />,
      accent: 'border-[#d4af37]/40 hover:border-[#d4af37]',
    },
    {
      mode: 'local',
      title: 'Play with Friend',
      subtitle: 'Pick your blocks · Pass & Play',
      icon: <Users className="h-5 w-5 text-[#4ade80]" />,
      accent: 'border-[#22a858]/40 hover:border-[#22a858]',
    },
    {
      mode: 'online_private',
      title: 'Online with Friends',
      subtitle: 'Unique code per friend · Emoji chat',
      icon: <KeyRound className="h-5 w-5 text-[#60a5fa]" />,
      accent: 'border-[#3b82f6]/40 hover:border-[#3b82f6]',
    },
    {
      mode: 'online_global',
      title: 'Global Online',
      subtitle: `1–4 Players · ${onlinePlayersCount} online`,
      icon: <Globe className="h-5 w-5 text-[#f472b6]" />,
      accent: 'border-[#ec4899]/40 hover:border-[#ec4899]',
    },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between bg-gradient-to-r from-[#0b1118]/92 via-[#0b1118]/55 to-transparent p-4 sm:p-7 lg:p-10">
      {/* Top Bar: Instagram Follow Link + Utility Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <InstagramBadge />

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            aria-label={settings.musicEnabled ? 'Mute Music' : 'Play Music'}
            onClick={() => {
              soundEngine.playClick();
              onToggleMusic();
            }}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-[#121a24]/92 text-[#f4f1ea] transition hover:border-[#d4af37]"
          >
            {settings.musicEnabled ? (
              <Music className="h-5 w-5 text-[#f3cf68]" />
            ) : (
              <VolumeX className="h-5 w-5 text-[#94a3b8]" />
            )}
          </button>
          <button
            type="button"
            aria-label="Open Leaderboard"
            onClick={() => {
              soundEngine.playClick();
              onOpenLeaderboard();
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-[#121a24]/92 px-3.5 text-xs font-bold text-[#f4f1ea] transition hover:border-[#d4af37]"
          >
            <Trophy className="h-4 w-4 text-[#f3cf68]" />
            <span className="hidden sm:inline">Leaderboard</span>
          </button>
          <button
            type="button"
            aria-label="Open Settings"
            onClick={() => {
              soundEngine.playClick();
              onOpenSettings();
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-[#121a24]/92 px-3.5 text-xs font-bold text-[#f4f1ea] transition hover:border-[#d4af37]"
          >
            <Settings className="h-4 w-4 text-[#cbd5e1]" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Main Content: Left Negative-Space Lockup + Mode Grid */}
      <div className="my-auto flex w-full max-w-[600px] flex-col gap-5">
        {/* Custom Inline SVG Title Lockup */}
        <div className="pointer-events-none">
          <svg
            viewBox="0 0 540 112"
            className="h-auto w-full max-w-[440px] drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
            aria-label="Online Ludo Game"
          >
            <defs>
              <linearGradient id="goldEmblem" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="50%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#9a7215" />
              </linearGradient>
            </defs>
            {/* Crown Crest */}
            <path
              d="M14 52 L22 22 L38 38 L52 16 L66 38 L82 22 L90 52 Z"
              fill="url(#goldEmblem)"
              stroke="#141a22"
              strokeWidth="2.5"
            />
            <rect x="14" y="56" width="76" height="9" rx="4" fill="url(#goldEmblem)" />
            {/* Typography Lockup */}
            <text
              x="108"
              y="52"
              fill="#f8f4ea"
              fontFamily="Outfit, sans-serif"
              fontWeight="800"
              fontSize="36"
              letterSpacing="1.2"
            >
              ONLINE LUDO
            </text>
            <text
              x="384"
              y="52"
              fill="url(#goldEmblem)"
              fontFamily="Outfit, sans-serif"
              fontWeight="800"
              fontSize="36"
              letterSpacing="1.2"
            >
              GAME
            </text>
            <text
              x="110"
              y="84"
              fill="#cbd5e1"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="600"
              fontSize="15"
              letterSpacing="4.5"
            >
              3D MULTIPLAYER EDITION
            </text>
          </svg>
        </div>

        {/* Primary Quick Start CTA */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={() => {
              soundEngine.playClick();
              onQuickStart();
            }}
            className="inline-flex min-h-[48px] items-center gap-2.5 rounded-xl bg-[#d4af37] px-7 py-3 text-base font-extrabold text-[#11161d] shadow-lg transition hover:bg-[#e5c14d] active:scale-[0.98]"
          >
            <Play className="h-5 w-5 fill-current" />
            Quick Play
          </button>
          <span className="text-xs font-semibold text-[#e2e8f0] drop-shadow">
            or choose a game mode below
          </span>
        </div>

        {/* 4 Mode Cards */}
        <div className="pointer-events-auto grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {modeCards.map((card) => (
            <button
              key={card.mode}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onSelectMode(card.mode);
              }}
              className={`flex min-h-[68px] items-center gap-3.5 rounded-xl border bg-[#121a24]/95 px-4 py-3 text-left transition duration-150 hover:-translate-y-0.5 ${card.accent}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
                {card.icon}
              </div>
              <div className="min-w-0">
                <div className="font-display truncate text-sm font-bold text-[#f4f1ea]">
                  {card.title}
                </div>
                <div className="truncate text-xs text-[#b5c2d1]">{card.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Control Hint Line (Flat, borderless) */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-[#cbd5e1] drop-shadow">
        <span>Enter / Space Quick Play · Tap 3D Die to Roll · Tap Highlighted Token to Move</span>
      </div>
    </div>
  );
};
