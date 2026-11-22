import React, { useEffect, useState } from 'react';
import { RefreshCw, Trophy, X } from 'lucide-react';
import { COLOR_HEX } from '../game/ludoEngine';
import { LeaderboardEntry } from '../game/types';
import { soundEngine } from '../audio/soundEngine';

interface LeaderboardModalProps {
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      setError('Unable to reach live leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-[#d4af37]/35 bg-[#151e29] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37]/15 text-[#f3cf68]">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 id="leaderboard-title" className="font-display text-xl font-bold text-[#f4f1ea]">
                Global Leaderboard
              </h2>
              <p className="text-xs text-[#a9b3c1]">Live session champions · Ranked by Royale Points</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Refresh leaderboard"
              onClick={() => {
                soundEngine.playClick();
                loadLeaderboard();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#d8d1c2] hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              aria-label="Close leaderboard"
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#d8d1c2] hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="custom-scroll mt-4 flex-1 overflow-y-auto pr-1">
          {loading && entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#94a3b8]">Loading standings...</div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-rose-400">{error}</div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#94a3b8]">No matches recorded yet.</div>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-[#94a3b8]">
                  <th className="py-2.5 pr-2 font-semibold">Rank</th>
                  <th className="py-2.5 px-2 font-semibold">Player</th>
                  <th className="py-2.5 px-2 text-right font-semibold">Wins</th>
                  <th className="py-2.5 px-2 text-right font-semibold">Win %</th>
                  <th className="py-2.5 px-2 text-right font-semibold">Captures</th>
                  <th className="py-2.5 pl-2 text-right font-semibold">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map((entry, index) => {
                  const winRate = entry.matches > 0 ? Math.round((entry.wins / entry.matches) * 100) : 0;
                  return (
                    <tr key={entry.id} className="hover:bg-white/[0.03]">
                      <td className="font-mono-num py-3 pr-2 font-bold text-[#f3cf68]">
                        #{index + 1}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: COLOR_HEX[entry.favoriteColor] }}
                          />
                          <span className="font-semibold text-[#f4f1ea]">{entry.name}</span>
                        </div>
                      </td>
                      <td className="font-mono-num py-3 px-2 text-right text-[#d8d1c2]">
                        {entry.wins}/{entry.matches}
                      </td>
                      <td className="font-mono-num py-3 px-2 text-right text-[#a9b3c1]">
                        {winRate}%
                      </td>
                      <td className="font-mono-num py-3 px-2 text-right text-[#d8d1c2]">
                        {entry.captures}
                      </td>
                      <td className="font-mono-num py-3 pl-2 text-right font-bold text-[#f3cf68]">
                        {entry.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
