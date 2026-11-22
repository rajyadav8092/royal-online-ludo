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
      subtitle: '1–3 Humans vs 1–3 AI',
      icon: <Bot className="h-5 w-5 text-[#fde047]" />,
      accent: 'border-[#facc15]/55 hover:border-[#fde047] bg-gradient-to-b from-[#162d52]/95 to-[#0d1c36]/95',
    },
    {
      mode: 'local',
      title: 'Play with Friend',
      subtitle: 'Pick blocks · Pass & Play',
      icon: <Users className="h-5 w-5 text-[#4ade80]" />,
      accent: 'border-[#22c55e]/55 hover:border-[#4ade80] bg-gradient-to-b from-[#12332d]/95 to-[#0b211f]/95',
    },
    {
      mode: 'online_private',
      title: 'Online Friends',
      subtitle: 'Unique codes · Emoji chat',
      icon: <KeyRound className="h-5 w-5 text-[#60a5fa]" />,
      accent: 'border-[#3b82f6]/55 hover:border-[#60a5fa] bg-gradient-to-b from-[#162d57]/95 to-[#0d1c38]/95',
    },
    {
      mode: 'online_global',
      title: 'Global Online',
      subtitle: `1–4 Players · ${onlinePlayersCount} live`,
      icon: <Globe className="h-5 w-5 text-[#f472b6]" />,
      accent: 'border-[#ec4899]/55 hover:border-[#f472b6] bg-gradient-to-b from-[#2c1b47]/95 to-[#18122e]/95',
    },
  ];

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3.5 sm:p-4"
      style={{
        background:
          'linear-gradient(180deg, rgba(7,18,38,0.86) 0%, rgba(7,18,38,0.12) 34%, rgba(7,18,38,0.12) 58%, rgba(7,18,38,0.92) 86%)',
      }}
    >
      {/* Top Bar: Instagram Follow Link + Shiny Utility Buttons */}
      <div className="flex items-center justify-between gap-2">
        <InstagramBadge compact />

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            aria-label={settings.musicEnabled ? 'Mute Music' : 'Play Music'}
            onClick={() => {
              soundEngine.playClick();
              onToggleMusic();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#facc15]/40 bg-[#0e2242]/92 text-[#f8fafc] shadow-md transition hover:border-[#fde047] hover:brightness-110"
          >
            {settings.musicEnabled ? (
              <Music className="h-4 w-4 text-[#fde047]" />
            ) : (
              <VolumeX className="h-4 w-4 text-[#94a3b8]" />
            )}
          </button>
          <button
            type="button"
            aria-label="Open Leaderboard"
            onClick={() => {
              soundEngine.playClick();
              onOpenLeaderboard();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#facc15]/40 bg-[#0e2242]/92 text-[#f8fafc] shadow-md transition hover:border-[#fde047] hover:brightness-110"
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
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#facc15]/40 bg-[#0e2242]/92 text-[#f8fafc] shadow-md transition hover:border-[#fde047] hover:brightness-110"
          >
            <Settings className="h-4 w-4 text-[#e2e8f0]" />
          </button>
        </div>
      </div>

      {/* Upper Emblem Lockup (Leaves Center Open for Shiny 3D Board Showcase) */}
      <div className="pointer-events-none mt-1 flex flex-col items-center">
        <svg
          viewBox="0 0 540 110"
          className="h-auto w-full max-w-[360px] drop-shadow-[0_6px_20px_rgba(0,0,0,0.9)]"
          aria-label="Online Ludo Game"
        >
          <defs>
            <linearGradient id="goldEmblem" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>
          {/* Crown Crest */}
          <path
            d="M14 52 L22 20 L38 37 L52 14 L66 37 L82 20 L90 52 Z"
            fill="url(#goldEmblem)"
            stroke="#0f172a"
            strokeWidth="3"
          />
          <rect x="14" y="56" width="76" height="9" rx="4" fill="url(#goldEmblem)" stroke="#0f172a" strokeWidth="1.5" />
          {/* Typography Lockup */}
          <text
            x="108"
            y="51"
            fill="#ffffff"
            fontFamily="Outfit, sans-serif"
            fontWeight="800"
            fontSize="36"
            letterSpacing="1.2"
          >
            ONLINE LUDO
          </text>
          <text
            x="384"
            y="51"
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
            y="82"
            fill="#e2e8f0"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="700"
            fontSize="15"
            letterSpacing="4.5"
          >
            3D MULTIPLAYER EDITION
          </text>
        </svg>
      </div>

      {/* Spacer allowing center 3D Board Drone Orbit to gleam clearly */}
      <div className="flex-1" />

      {/* Bottom Glossy Quick Play + 2x2 Mode Cards */}
      <div className="pointer-events-auto flex flex-col gap-2.5">
        <button
          type="button"
          data-start="true"
          onClick={() => {
            soundEngine.playClick();
            onQuickStart();
          }}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-2xl border border-[#fef08a]/80 bg-gradient-to-b from-[#fde047] via-[#eab308] to-[#b45309] px-6 py-2.5 text-base font-extrabold text-[#0f172a] shadow-[0_6px_24px_rgba(234,179,8,0.45)] transition hover:brightness-110 active:scale-[0.98]"
        >
          <Play className="h-5 w-5 fill-current" />
          Quick Play
        </button>

        <div className="grid grid-cols-2 gap-2">
          {modeCards.map((card) => (
            <button
              key={card.mode}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onSelectMode(card.mode);
              }}
              className={`flex min-h-[62px] items-center gap-2.5 rounded-xl border px-3 py-2 text-left shadow-lg transition duration-150 hover:-translate-y-0.5 hover:brightness-110 ${card.accent}`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10">
                {card.icon}
              </div>
              <div className="min-w-0">
                <div className="font-display truncate text-xs font-bold text-[#ffffff] sm:text-sm">
                  {card.title}
                </div>
                <div className="truncate text-[11px] font-medium text-[#cbd5e1]">{card.subtitle}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center text-[11px] font-medium text-[#cbd5e1]">
          Tap 3D Die to Roll · Tap Highlighted Token to Move
        </div>
      </div>
    </div>
  );
};
