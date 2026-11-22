import React from 'react';
import { Music, Smartphone, Video, Volume2, X } from 'lucide-react';
import { GameSettings } from '../game/types';
import { soundEngine } from '../audio/soundEngine';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdate: (patch: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdate,
  onClose,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-3.5"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#d4af37]/35 bg-[#151e29] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 id="settings-title" className="font-display text-xl font-bold text-[#f4f1ea]">
            Game Settings
          </h2>
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#d8d1c2] hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="settings-player-name" className="block text-xs font-semibold text-[#a9b3c1]">
              Your Player Name
            </label>
            <input
              id="settings-player-name"
              type="text"
              maxLength={18}
              value={settings.playerName}
              onChange={(e) => onUpdate({ playerName: e.target.value })}
              placeholder="Enter your name"
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0e141b] px-3.5 py-2.5 text-sm text-[#f4f1ea] focus:border-[#d4af37] focus:outline-none"
            />
          </div>

          {/* Background Music Toggle */}
          <div className="rounded-xl border border-white/10 bg-[#0e141b] p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Music className="h-4 w-4 text-[#f3cf68]" />
                <span className="text-sm font-semibold text-[#f4f1ea]">Background Music</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.musicEnabled}
                aria-label="Toggle Background Music"
                onClick={() => {
                  soundEngine.playClick();
                  onUpdate({ musicEnabled: !settings.musicEnabled });
                }}
                className={`min-h-[36px] min-w-[64px] rounded-lg px-3 text-xs font-bold transition ${
                  settings.musicEnabled
                    ? 'bg-[#22a858] text-white'
                    : 'bg-white/10 text-[#94a3b8]'
                }`}
              >
                {settings.musicEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            {settings.musicEnabled && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-[#94a3b8]">Volume</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  aria-label="Music Volume"
                  value={settings.musicVolume}
                  onChange={(e) => onUpdate({ musicVolume: Number(e.target.value) })}
                  className="flex-1 accent-[#d4af37]"
                />
                <span className="font-mono-num w-9 text-right text-xs text-[#d8d1c2]">
                  {Math.round(settings.musicVolume * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Sound Effects Toggle */}
          <div className="rounded-xl border border-white/10 bg-[#0e141b] p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Volume2 className="h-4 w-4 text-[#f3cf68]" />
                <span className="text-sm font-semibold text-[#f4f1ea]">Click & Dice SFX</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.sfxEnabled}
                aria-label="Toggle Sound Effects"
                onClick={() => {
                  onUpdate({ sfxEnabled: !settings.sfxEnabled });
                  if (!settings.sfxEnabled) {
                    setTimeout(() => soundEngine.playClick(), 20);
                  }
                }}
                className={`min-h-[36px] min-w-[64px] rounded-lg px-3 text-xs font-bold transition ${
                  settings.sfxEnabled
                    ? 'bg-[#22a858] text-white'
                    : 'bg-white/10 text-[#94a3b8]'
                }`}
              >
                {settings.sfxEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            {settings.sfxEnabled && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-[#94a3b8]">Volume</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  aria-label="SFX Volume"
                  value={settings.sfxVolume}
                  onChange={(e) => onUpdate({ sfxVolume: Number(e.target.value) })}
                  className="flex-1 accent-[#d4af37]"
                />
                <span className="font-mono-num w-9 text-right text-xs text-[#d8d1c2]">
                  {Math.round(settings.sfxVolume * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Token Vibration Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0e141b] p-3.5">
            <div className="flex items-center gap-2.5">
              <Smartphone className="h-4 w-4 text-[#f3cf68]" />
              <span className="text-sm font-semibold text-[#f4f1ea]">Token Click Vibration</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.vibrationEnabled}
              aria-label="Toggle Token Vibration"
              onClick={() => {
                soundEngine.playClick();
                onUpdate({ vibrationEnabled: !settings.vibrationEnabled });
              }}
              className={`min-h-[36px] min-w-[64px] rounded-lg px-3 text-xs font-bold transition ${
                settings.vibrationEnabled
                  ? 'bg-[#22a858] text-white'
                  : 'bg-white/10 text-[#94a3b8]'
              }`}
            >
              {settings.vibrationEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 3D Drone View */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0e141b] p-3.5">
            <div className="flex items-center gap-2.5">
              <Video className="h-4 w-4 text-[#f3cf68]" />
              <span className="text-sm font-semibold text-[#f4f1ea]">Drone View</span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onUpdate({ cameraMode: 'angled' });
                }}
                className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold transition ${
                  settings.cameraMode === 'angled'
                    ? 'bg-[#d4af37] text-[#11161d]'
                    : 'bg-white/10 text-[#cbd5e1]'
                }`}
              >
                3D Drone
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onUpdate({ cameraMode: 'top' });
                }}
                className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold transition ${
                  settings.cameraMode === 'top'
                    ? 'bg-[#d4af37] text-[#11161d]'
                    : 'bg-white/10 text-[#cbd5e1]'
                }`}
              >
                Top Drone
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="min-h-[44px] rounded-xl bg-[#d4af37] px-6 py-2 text-sm font-bold text-[#11161d] hover:bg-[#e3be46]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
