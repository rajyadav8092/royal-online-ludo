import React, { useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  Globe,
  KeyRound,
  Play,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { ALL_COLORS, buildComputerPlayers, COLOR_HEX, COLOR_LABELS } from '../game/ludoEngine';
import {
  GameMode,
  OnlineRoomSnapshot,
  PlayerColor,
  PlayerConfig,
} from '../game/types';
import { soundEngine } from '../audio/soundEngine';

interface ModeSetupModalProps {
  mode: GameMode;
  defaultPlayerName: string;
  onlineConnected: boolean;
  onlinePlayersCount: number;
  clientId: string | null;
  activeRoom: OnlineRoomSnapshot | null;
  roomError: string | null;
  onStartOffline: (mode: 'computer' | 'local', players: PlayerConfig[]) => void;
  onCreateOnlineRoom: (name: string, friendCount: 1 | 2 | 3) => void;
  onJoinOnlineRoom: (code: string, name: string) => void;
  onJoinGlobalQueue: (name: string, maxPlayers: 1 | 2 | 3 | 4) => void;
  onStartOnlineRoom: (fillWithBots: boolean) => void;
  onLeaveOnlineRoom: () => void;
  onClose: () => void;
}

export const ModeSetupModal: React.FC<ModeSetupModalProps> = ({
  mode,
  defaultPlayerName,
  onlineConnected,
  onlinePlayersCount,
  clientId,
  activeRoom,
  roomError,
  onStartOffline,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onJoinGlobalQueue,
  onStartOnlineRoom,
  onLeaveOnlineRoom,
  onClose,
}) => {
  // Computer Mode state: 1, 2, or 3 human players + 1, 2, or 3 AI players (total <= 4)
  const [humanCount, setHumanCount] = useState<1 | 2 | 3>(1);
  const [aiCount, setAiCount] = useState<1 | 2 | 3>(3);
  const [humanNames, setHumanNames] = useState<[string, string, string]>([
    defaultPlayerName || 'Player 1',
    'Player 2',
    'Player 3',
  ]);

  // Local Friend Mode state (user chooses blocks, no AI)
  const [localSelectedColors, setLocalSelectedColors] = useState<PlayerColor[]>([
    'red',
    'green',
    'yellow',
    'blue',
  ]);
  const [localNames, setLocalNames] = useState<Record<PlayerColor, string>>({
    red: defaultPlayerName || 'Friend 1',
    green: 'Friend 2',
    yellow: 'Friend 3',
    blue: 'Friend 4',
  });

  // Online Private (1 host + 1, 2, or 3 invited friends -> unique invite code per friend)
  const [onlineName, setOnlineName] = useState(defaultPlayerName || 'Player');
  const [friendCount, setFriendCount] = useState<1 | 2 | 3>(3);
  const [globalMaxPlayers, setGlobalMaxPlayers] = useState<1 | 2 | 3 | 4>(4);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleSelectHumanCount = (count: 1 | 2 | 3) => {
    soundEngine.playClick();
    setHumanCount(count);
    if (count + aiCount > 4) {
      setAiCount(Math.max(1, 4 - count) as 1 | 2 | 3);
    }
  };

  const handleSelectAiCount = (count: 1 | 2 | 3) => {
    soundEngine.playClick();
    setAiCount(count);
    if (humanCount + count > 4) {
      setHumanCount(Math.max(1, 4 - count) as 1 | 2 | 3);
    }
  };

  const toggleLocalColor = (color: PlayerColor) => {
    soundEngine.playClick();
    setLocalSelectedColors((prev) => {
      if (prev.includes(color)) {
        if (prev.length <= 2) return prev;
        return prev.filter((c) => c !== color);
      }
      return ALL_COLORS.filter((c) => prev.includes(c) || c === color);
    });
  };

  const handleCopyCode = async (code: string) => {
    soundEngine.playClick();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleStartComputer = () => {
    soundEngine.playClick();
    const players = buildComputerPlayers(
      humanCount,
      aiCount,
      humanNames.map((n) => n.trim())
    );
    onStartOffline('computer', players);
  };

  const handleStartLocal = () => {
    soundEngine.playClick();
    const players: PlayerConfig[] = localSelectedColors.map((color, idx) => ({
      color,
      name: localNames[color].trim() || `Friend ${idx + 1}`,
      isAI: false,
      isActive: true,
    }));
    onStartOffline('local', players);
  };

  const isHost = activeRoom && clientId && activeRoom.hostId === clientId;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="custom-scroll max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#d4af37]/35 bg-[#151e29] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37]/15 text-[#f3cf68]">
              {mode === 'computer' && <Bot className="h-5 w-5" />}
              {mode === 'local' && <Users className="h-5 w-5" />}
              {mode === 'online_private' && <KeyRound className="h-5 w-5" />}
              {mode === 'online_global' && <Globe className="h-5 w-5" />}
            </div>
            <div>
              <h2 id="setup-modal-title" className="font-display text-xl font-bold text-[#f4f1ea]">
                {mode === 'computer' && 'Computer Mode Setup'}
                {mode === 'local' && 'Play with Friend — Choose Blocks'}
                {mode === 'online_private' && 'Play with Friend Online'}
                {mode === 'online_global' && 'Global Online Matchmaking'}
              </h2>
              <p className="text-xs text-[#a9b3c1]">
                {mode === 'computer' && 'Choose 1–3 Human Players and 1–3 Computer AI Players (up to 4 seats)'}
                {mode === 'local' && 'Pick your color blocks — zero bots, pure pass & play'}
                {mode === 'online_private' && 'Generate unique invite codes for 1–3 friends or paste a friend’s code'}
                {mode === 'online_global' && `${onlinePlayersCount} player(s) online right now · Pick 1–4 players`}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close setup"
            onClick={() => {
              soundEngine.playClick();
              if (activeRoom) onLeaveOnlineRoom();
              onClose();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#d8d1c2] hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MODE 1: COMPUTER (1, 2, or 3 Humans + 1, 2, or 3 Computer Players) */}
        {mode === 'computer' && (
          <div className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#0e141b] p-4">
                <span className="block text-xs font-semibold text-[#a9b3c1]">Human Players</span>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {([1, 2, 3] as const).map((h) => (
                    <button
                      key={h}
                      type="button"
                      data-testid={`comp-humans-${h}`}
                      onClick={() => handleSelectHumanCount(h)}
                      className={`min-h-[44px] rounded-xl text-xs font-bold transition sm:text-sm ${
                        humanCount === h
                          ? 'bg-[#22a858] text-white'
                          : 'bg-white/5 text-[#cbd5e1] hover:bg-white/10'
                      }`}
                    >
                      {h} {h === 1 ? 'Player' : 'Players'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0e141b] p-4">
                <span className="block text-xs font-semibold text-[#a9b3c1]">Computer Players (AI)</span>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {([1, 2, 3] as const).map((ai) => (
                    <button
                      key={ai}
                      type="button"
                      data-testid={`comp-ai-${ai}`}
                      onClick={() => handleSelectAiCount(ai)}
                      className={`min-h-[44px] rounded-xl text-xs font-bold transition sm:text-sm ${
                        aiCount === ai
                          ? 'bg-[#d4af37] text-[#11161d]'
                          : 'bg-white/5 text-[#cbd5e1] hover:bg-white/10'
                      }`}
                    >
                      {ai} AI
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: humanCount }).map((_, idx) => (
                <div key={idx}>
                  <label
                    htmlFor={`comp-p${idx + 1}`}
                    className="block text-xs font-semibold text-[#a9b3c1]"
                  >
                    Human Player {idx + 1}
                  </label>
                  <input
                    id={`comp-p${idx + 1}`}
                    type="text"
                    maxLength={16}
                    value={humanNames[idx]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHumanNames((prev) => {
                        const next: [string, string, string] = [...prev];
                        next[idx] = val;
                        return next;
                      });
                    }}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0e141b] px-3.5 py-2.5 text-sm text-[#f4f1ea] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0e141b] p-3.5 text-xs text-[#cbd5e1]">
              Match Preview:{' '}
              <span className="font-semibold text-[#4ade80]">
                {humanCount} Human{humanCount > 1 ? 's' : ''}
              </span>{' '}
              +{' '}
              <span className="font-semibold text-[#f3cf68]">
                {aiCount} Computer AI
              </span>{' '}
              ({humanCount + aiCount} seats total)
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleStartComputer}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#d4af37] px-7 py-2.5 text-sm font-bold text-[#11161d] transition hover:bg-[#e3be46]"
              >
                <Play className="h-4 w-4 fill-current" />
                Start Computer Match
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: PLAY WITH FRIEND (LOCAL) */}
        {mode === 'local' && (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#a9b3c1]">
                Select which player blocks are active (2 to 4 friends, no computer):
              </span>
              <div className="flex gap-1.5">
                {([2, 3, 4] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      if (cnt === 2) setLocalSelectedColors(['red', 'yellow']);
                      else if (cnt === 3) setLocalSelectedColors(['red', 'green', 'yellow']);
                      else setLocalSelectedColors(['red', 'green', 'yellow', 'blue']);
                    }}
                    className={`min-h-[36px] rounded-lg px-3 text-xs font-bold transition ${
                      localSelectedColors.length === cnt
                        ? 'bg-[#d4af37] text-[#11161d]'
                        : 'bg-white/10 text-[#cbd5e1]'
                    }`}
                  >
                    {cnt} Friends
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {ALL_COLORS.map((color) => {
                const selected = localSelectedColors.includes(color);
                return (
                  <div
                    key={color}
                    className={`rounded-xl border p-3.5 transition ${
                      selected
                        ? 'border-[#d4af37]/60 bg-[#0e141b]'
                        : 'border-white/10 bg-[#0e141b]/45 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleLocalColor(color)}
                        className="flex min-h-[36px] items-center gap-2.5 text-left"
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-white/30"
                          style={{ backgroundColor: COLOR_HEX[color] }}
                        />
                        <span className="text-sm font-bold text-[#f4f1ea]">
                          {COLOR_LABELS[color]}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleLocalColor(color)}
                        className={`min-h-[32px] rounded-lg px-2.5 text-xs font-bold ${
                          selected ? 'bg-[#22a858] text-white' : 'bg-white/10 text-[#94a3b8]'
                        }`}
                      >
                        {selected ? 'Active' : 'Off'}
                      </button>
                    </div>
                    {selected && (
                      <input
                        type="text"
                        maxLength={16}
                        aria-label={`${COLOR_LABELS[color]} player name`}
                        value={localNames[color]}
                        onChange={(e) =>
                          setLocalNames((prev) => ({ ...prev, [color]: e.target.value }))
                        }
                        className="mt-2.5 w-full rounded-lg border border-white/15 bg-[#151e29] px-3 py-2 text-xs text-[#f4f1ea] focus:border-[#d4af37] focus:outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleStartLocal}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#d4af37] px-7 py-2.5 text-sm font-bold text-[#11161d] transition hover:bg-[#e3be46]"
              >
                <Play className="h-4 w-4 fill-current" />
                Start Pass &amp; Play ({localSelectedColors.length} Players)
              </button>
            </div>
          </div>
        )}

        {/* MODE 3: ONLINE WITH FRIENDS (2 BLOCKS: GENERATE UNIQUE INVITE CODES & PASTE INVITE CODE) */}
        {mode === 'online_private' && (
          <div className="mt-5 space-y-5">
            {!activeRoom ? (
              <>
                <div>
                  <label htmlFor="online-priv-name" className="block text-xs font-semibold text-[#a9b3c1]">
                    Your Display Name
                  </label>
                  <input
                    id="online-priv-name"
                    type="text"
                    maxLength={18}
                    value={onlineName}
                    onChange={(e) => setOnlineName(e.target.value)}
                    placeholder="Enter your name"
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0e141b] px-3.5 py-2.5 text-sm text-[#f4f1ea] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>

                {roomError && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-2.5 text-xs font-medium text-rose-200">
                    {roomError}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Block 1: Generate Separate Invite Codes per Friend */}
                  <div className="flex flex-col justify-between rounded-xl border border-[#d4af37]/35 bg-[#0e141b] p-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-[#f3cf68]">
                        <Sparkles className="h-4 w-4" />
                        Block 1 · Generate Invite Codes
                      </div>
                      <p className="mt-1 text-xs text-[#a9b3c1]">
                        You are Player 1. Choose how many friends to invite — each friend gets their own unique code!
                      </p>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {([1, 2, 3] as const).map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            data-testid={`invite-friend-count-${cnt}`}
                            onClick={() => {
                              soundEngine.playClick();
                              setFriendCount(cnt);
                            }}
                            className={`min-h-[40px] rounded-lg text-xs font-bold transition ${
                              friendCount === cnt
                                ? 'bg-[#d4af37] text-[#11161d]'
                                : 'bg-white/5 text-[#cbd5e1] hover:bg-white/10'
                            }`}
                          >
                            {cnt} {cnt === 1 ? 'Friend' : 'Friends'}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] text-[#94a3b8]">
                        Total match size: {friendCount + 1} players (You + {friendCount} invite code{friendCount > 1 ? 's' : ''})
                      </p>
                    </div>

                    <button
                      type="button"
                      data-testid="generate-invite-codes-btn"
                      disabled={!onlineConnected}
                      onClick={() => {
                        soundEngine.playClick();
                        onCreateOnlineRoom(onlineName.trim() || 'Host', friendCount);
                      }}
                      className="mt-4 min-h-[44px] w-full rounded-xl bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-[#11161d] transition hover:bg-[#e3be46] disabled:opacity-50"
                    >
                      {onlineConnected
                        ? `Generate ${friendCount} Invite Code${friendCount > 1 ? 's' : ''}`
                        : 'Connecting...'}
                    </button>
                  </div>

                  {/* Block 2: Paste Invite Code */}
                  <div className="flex flex-col justify-between rounded-xl border border-white/15 bg-[#0e141b] p-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-[#60a5fa]">
                        <UserPlus className="h-4 w-4" />
                        Block 2 · Paste Invite Code
                      </div>
                      <p className="mt-1 text-xs text-[#a9b3c1]">
                        Received a friend&apos;s invite code? Paste or type it below to claim your seat.
                      </p>

                      <label htmlFor="paste-invite-code" className="sr-only">
                        Invite Code
                      </label>
                      <input
                        id="paste-invite-code"
                        data-testid="paste-invite-code-input"
                        type="text"
                        maxLength={8}
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        placeholder="e.g. KING42"
                        className="font-mono-num mt-3 w-full rounded-xl border border-white/15 bg-[#151e29] px-3.5 py-2.5 text-center text-base font-bold tracking-widest text-[#f4f1ea] uppercase focus:border-[#60a5fa] focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      data-testid="join-with-code-btn"
                      disabled={!onlineConnected || joinCodeInput.trim().length < 4}
                      onClick={() => {
                        soundEngine.playClick();
                        onJoinOnlineRoom(joinCodeInput.trim(), onlineName.trim() || 'Player');
                      }}
                      className="mt-4 min-h-[44px] w-full rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#3b82f6] disabled:opacity-50"
                    >
                      Join Room with Code
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Active Private Room Waiting Lobby with Individual Friend Invite Codes */
              <div className="space-y-4">
                {activeRoom.inviteSlots && activeRoom.inviteSlots.length > 0 && (
                  <div className="rounded-xl border border-[#d4af37]/40 bg-[#0e141b] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#f3cf68]">
                        Individual Friend Invite Codes ({activeRoom.inviteSlots.length})
                      </span>
                      <span className="text-[11px] text-[#94a3b8]">
                        Send one unique code to each friend
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                      {activeRoom.inviteSlots.map((slot, idx) => (
                        <div
                          key={slot.code}
                          className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#151e29] p-3"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: COLOR_HEX[slot.color] }}
                              />
                              <span className="text-xs font-bold text-[#f4f1ea]">
                                Friend {idx + 1}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-bold ${
                                slot.claimedByClientId ? 'text-[#4ade80]' : 'text-[#94a3b8]'
                              }`}
                            >
                              {slot.claimedByClientId ? 'Joined' : 'Waiting'}
                            </span>
                          </div>

                          <div
                            data-testid={`invite-slot-code-${idx}`}
                            className="font-mono-num my-2 text-center text-lg font-extrabold tracking-widest text-[#f3cf68]"
                          >
                            {slot.code}
                          </div>

                          {slot.claimedByName ? (
                            <div className="truncate rounded-lg bg-[#22a858]/15 px-2 py-1.5 text-center text-xs font-semibold text-[#4ade80]">
                              {slot.claimedByName}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleCopyCode(slot.code)}
                              className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg border border-[#d4af37]/35 bg-[#d4af37]/10 px-2.5 py-1 text-xs font-bold text-[#f3cf68] hover:bg-[#d4af37]/20"
                            >
                              {copiedCode === slot.code ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                              {copiedCode === slot.code ? 'Copied' : 'Copy Code'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#a9b3c1]">
                    <span>Connected Players in Match</span>
                    <span className="font-mono-num font-bold text-[#f4f1ea]">
                      {activeRoom.players.length} / {activeRoom.maxPlayers}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activeRoom.players.map((p) => (
                      <div
                        key={p.clientId}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0e141b] px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3.5 w-3.5 rounded-full"
                            style={{ backgroundColor: COLOR_HEX[p.color] }}
                          />
                          <span className="text-sm font-semibold text-[#f4f1ea]">{p.name}</span>
                        </div>
                        <span className="text-xs text-[#94a3b8]">
                          {p.clientId === activeRoom.hostId ? 'Host' : 'Joined'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {roomError && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-2.5 text-xs text-rose-200">
                    {roomError}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onLeaveOnlineRoom();
                    }}
                    className="min-h-[42px] rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-[#cbd5e1] hover:bg-white/10"
                  >
                    Leave Lobby
                  </button>

                  {isHost ? (
                    <div className="flex flex-wrap gap-2">
                      {activeRoom.players.length < activeRoom.maxPlayers && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            onStartOnlineRoom(true);
                          }}
                          className="min-h-[44px] rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/15 px-4 py-2 text-xs font-bold text-[#f3cf68] hover:bg-[#d4af37]/25"
                        >
                          Start Now (Fill empty with AI)
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid="start-online-match-btn"
                        disabled={activeRoom.players.length < 2}
                        onClick={() => {
                          soundEngine.playClick();
                          onStartOnlineRoom(false);
                        }}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#22a858] px-6 py-2 text-sm font-bold text-white hover:bg-[#27bd64] disabled:opacity-45"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        Start Match
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[#a9b3c1]">
                      Waiting for host to start the match...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 4: GLOBAL ONLINE ARENA (1, 2, 3, OR 4 PLAYERS) */}
        {mode === 'online_global' && (
          <div className="mt-5 space-y-5">
            {!activeRoom ? (
              <>
                <div>
                  <label htmlFor="global-name" className="block text-xs font-semibold text-[#a9b3c1]">
                    Your Arena Name
                  </label>
                  <input
                    id="global-name"
                    type="text"
                    maxLength={18}
                    value={onlineName}
                    onChange={(e) => setOnlineName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0e141b] px-3.5 py-2.5 text-sm text-[#f4f1ea] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0e141b] p-4">
                  <span className="block text-xs font-semibold text-[#a9b3c1]">
                    Select Player Count (1, 2, 3, or 4 Players)
                  </span>
                  <div className="mt-2.5 grid grid-cols-4 gap-2">
                    {([1, 2, 3, 4] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        data-testid={`global-players-${cnt}`}
                        onClick={() => {
                          soundEngine.playClick();
                          setGlobalMaxPlayers(cnt);
                        }}
                        className={`min-h-[44px] rounded-xl text-xs font-bold transition sm:text-sm ${
                          globalMaxPlayers === cnt
                            ? 'bg-[#d4af37] text-[#11161d]'
                            : 'bg-white/5 text-[#cbd5e1] hover:bg-white/10'
                        }`}
                      >
                        {cnt} {cnt === 1 ? 'Player' : 'Players'}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-[#94a3b8]">
                    {globalMaxPlayers === 1
                      ? '1 Player: Launches immediately in Global Arena with 3 AI challengers.'
                      : `${globalMaxPlayers} Players: Matches with ${globalMaxPlayers - 1} live global player${globalMaxPlayers > 2 ? 's' : ''}.`}
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-200">
                  <span>Live Global Players Online</span>
                  <span className="font-mono-num text-sm font-bold">{onlinePlayersCount}</span>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!onlineConnected}
                    onClick={() => {
                      soundEngine.playClick();
                      onJoinGlobalQueue(onlineName.trim() || 'Player', globalMaxPlayers);
                    }}
                    className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#22a858] px-7 py-2.5 text-sm font-bold text-white transition hover:bg-[#27bd64] disabled:opacity-50"
                  >
                    <Globe className="h-4 w-4" />
                    {onlineConnected ? 'Join Global Matchmaking' : 'Connecting...'}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/35 bg-[#0e141b] p-4 text-center">
                  <div className="text-sm font-bold text-[#f3cf68]">
                    Searching Global Arena ({activeRoom.players.length} / {activeRoom.maxPlayers} Players Joined)
                  </div>
                  <p className="mt-1 text-xs text-[#a9b3c1]">
                    Match starts automatically as soon as all {activeRoom.maxPlayers} online players join!
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {activeRoom.players.map((p) => (
                    <div
                      key={p.clientId}
                      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#0e141b] px-3.5 py-2.5"
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: COLOR_HEX[p.color] }}
                      />
                      <span className="text-sm font-semibold text-[#f4f1ea]">{p.name}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onLeaveOnlineRoom();
                    }}
                    className="min-h-[42px] rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-[#cbd5e1]"
                  >
                    Cancel Search
                  </button>

                  {isHost && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onStartOnlineRoom(true);
                      }}
                      className="min-h-[44px] rounded-xl bg-[#d4af37] px-5 py-2 text-xs font-bold text-[#11161d] hover:bg-[#e3be46]"
                    >
                      Start Now (Fill empty with AI)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
