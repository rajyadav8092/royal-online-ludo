import React from 'react';
import { BookOpen, Check } from 'lucide-react';
import { GameMode } from '../game/types';
import { soundEngine } from '../audio/soundEngine';

interface InstructionsModalProps {
  mode: GameMode;
  onConfirm: () => void;
  onCancel: () => void;
}

const MODE_TITLES: Record<GameMode, string> = {
  computer: 'Computer Mode (Vs AI)',
  local: 'Play with Friend (Local)',
  online_private: 'Play with Friend Online',
  online_global: 'Global Online Arena',
};

export const InstructionsModal: React.FC<InstructionsModalProps> = ({
  mode,
  onConfirm,
  onCancel,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="instructions-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#d4af37]/35 bg-[#151e29] p-6 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4af37]/15 text-[#f3cf68]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 id="instructions-title" className="font-display text-xl font-bold text-[#f4f1ea]">
              How to Play — {MODE_TITLES[mode]}
            </h2>
            <p className="text-xs text-[#a9b3c1]">Quick rules before you enter the match</p>
          </div>
        </div>

        <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[#d9dde4]">
          <li className="flex gap-2.5">
            <span className="font-mono-num font-bold text-[#f3cf68]">01.</span>
            <span>Roll a <strong>6</strong> on the 3D die to unlock a token (goti) from your home yard onto the board.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-mono-num font-bold text-[#f3cf68]">02.</span>
            <span>Tap any highlighted 3D token on the board (or its quick-select button) to move it forward.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-mono-num font-bold text-[#f3cf68]">03.</span>
            <span><strong>Star tiles</strong> and colored start squares are safe zones — tokens cannot be captured there.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-mono-num font-bold text-[#f3cf68]">04.</span>
            <span>Land on an opponent&apos;s token on a normal square to capture it and earn a <strong>bonus roll</strong>!</span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-mono-num font-bold text-[#f3cf68]">05.</span>
            <span>Rolling a 6 or reaching the center Home crown also grants a bonus roll (three 6s in a row skips turn).</span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-mono-num font-bold text-[#f3cf68]">06.</span>
            <span>Watch the <strong>3D Die</strong> move to each active player&apos;s corner! Bring all 4 tokens home first to win, and use <strong>Emoji Quick-Chat</strong> in online matches anytime.</span>
          </li>
        </ul>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onCancel();
            }}
            className="min-h-[44px] rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-[#cbd5e1] transition hover:bg-white/10"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onConfirm();
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#d4af37] px-7 py-2.5 text-sm font-bold text-[#11161d] transition hover:bg-[#e3be46]"
          >
            <Check className="h-4 w-4" />
            OK, Got It!
          </button>
        </div>
      </div>
    </div>
  );
};
