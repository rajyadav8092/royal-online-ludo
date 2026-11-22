import React from 'react';
import { soundEngine } from '../audio/soundEngine';

interface InstagramBadgeProps {
  compact?: boolean;
}

export const InstagramBadge: React.FC<InstagramBadgeProps> = ({ compact = false }) => {
  return (
    <a
      href="https://www.instagram.com/x__rajiv__yadav"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => soundEngine.playClick()}
      aria-label="Follow us on Instagram @x__rajiv__yadav"
      className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-[#facc15]/45 bg-[#0e2242]/95 text-[#ffffff] shadow-md transition-transform duration-150 hover:scale-[1.02] hover:border-[#fde047] focus-visible:outline-2 focus-visible:outline-[#facc15] ${
        compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4 shrink-0 text-[#e879a8]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
      <span className="whitespace-nowrap font-medium text-[#d8d1c2]">Follow us on</span>
      <span className="whitespace-nowrap font-semibold text-[#f3cf68]">@x__rajiv__yadav</span>
    </a>
  );
};
