import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { BlurredLudoBackdrop } from './components/BlurredLudoBackdrop';
import { GameHud } from './components/GameHud';
import { InstructionsModal } from './components/InstructionsModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { LudoScene3D } from './components/LudoScene3D';
import { ModeSetupModal } from './components/ModeSetupModal';
import { SettingsModal } from './components/SettingsModal';
import { TitleOverlay } from './components/TitleOverlay';
import {
  applyDiceRoll,
  applyTokenMove,
  buildComputerPlayers,
  chooseBestAiMove,
  createInitialGameState,
  getCurrentPlayerColor,
} from './game/ludoEngine';
import {
  EmojiChatMessage,
  GameMode,
  GameSettings,
  GameState,
  MoveResult,
  OnlineRoomSnapshot,
  PlayerColor,
  PlayerConfig,
  ScreenPhase,
} from './game/types';

const SETTINGS_STORAGE_KEY = 'ludo_royale_settings_v1';

const DEFAULT_SETTINGS: GameSettings = {
  sfxEnabled: true,
  musicEnabled: true,
  musicVolume: 0.35,
  sfxVolume: 0.75,
  vibrationEnabled: true,
  cameraMode: 'angled',
  playerName: 'Player 1',
};

function loadInitialSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(loadInitialSettings);
  const [screenPhase, setScreenPhase] = useState<ScreenPhase>('title');
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Modals
  const [pendingInstructionMode, setPendingInstructionMode] = useState<GameMode | null>(null);
  const [setupMode, setSetupMode] = useState<GameMode | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // 3D Animation & Dice state
  const [diceRollingVisual, setDiceRollingVisual] = useState(false);
  const [stepAnimationSignal, setStepAnimationSignal] = useState<{
    seq: number;
    color: PlayerColor;
    tokenId: number;
    steps: number[];
    captured: Array<{ color: PlayerColor; id: number }>;
    reachedHome: boolean;
  } | null>(null);

  // WebSocket Multiplayer State
  const wsRef = useRef<WebSocket | null>(null);
  const [onlineConnected, setOnlineConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [onlinePlayersCount, setOnlinePlayersCount] = useState(1);
  const [activeRoom, setActiveRoom] = useState<OnlineRoomSnapshot | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [emojiMessages, setEmojiMessages] = useState<EmojiChatMessage[]>([]);

  const lastOfflineConfigRef = useRef<{
    mode: 'computer' | 'local';
    players: PlayerConfig[];
  } | null>(null);
  const stepSeqRef = useRef(0);
  const recordedMatchIdRef = useRef<number | null>(null);

  // Sync settings to soundEngine & localStorage
  useEffect(() => {
    soundEngine.configure({
      sfxEnabled: settings.sfxEnabled,
      musicEnabled: settings.musicEnabled,
      vibrationEnabled: settings.vibrationEnabled,
      sfxVolume: settings.sfxVolume,
      musicVolume: settings.musicVolume,
    });
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors
    }
  }, [settings]);

  // Unlock Web Audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      soundEngine.unlock();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Mirror screenPhase to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = screenPhase;
  }, [screenPhase]);

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  // Connect WebSocket for online rooms & global matchmaking
  useEffect(() => {
    let closed = false;
    let reconnectTimer: number | null = null;

    const connect = () => {
      if (closed) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!closed) setOnlineConnected(true);
      };

      ws.onmessage = (event) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(event.data));
        } catch {
          return;
        }
        const type = String(msg.type || '');

        if (type === 'connected') {
          setClientId(String(msg.clientId || ''));
          setOnlinePlayersCount(Number(msg.onlinePlayers || 1));
        } else if (type === 'online_stats') {
          setOnlinePlayersCount(Number(msg.onlinePlayers || 1));
        } else if (type === 'room_joined' || type === 'room_updated') {
          setRoomError(null);
          const room = msg.room as OnlineRoomSnapshot;
          setActiveRoom(room);
          if (room.gameState && room.status === 'playing') {
            setGameState(room.gameState);
          }
        } else if (type === 'room_error') {
          setRoomError(String(msg.message || 'Room error'));
        } else if (type === 'game_started') {
          const room = msg.room as OnlineRoomSnapshot;
          setActiveRoom(room);
          setSetupMode(null);
          setPendingInstructionMode(null);
          if (room.gameState) {
            setGameState(room.gameState);
            setScreenPhase('playing');
          }
        } else if (type === 'dice_rolled') {
          const rolled = Number(msg.rolledValue);
          const nextGs = msg.gameState as GameState;
          soundEngine.playDiceRoll();
          setDiceRollingVisual(true);
          window.setTimeout(() => {
            setDiceRollingVisual(false);
            soundEngine.playDiceLand(rolled);
            setGameState(nextGs);
          }, 420);
        } else if (type === 'token_moved') {
          const color = msg.color as PlayerColor;
          const tokenId = Number(msg.tokenId);
          const moveRes = msg.moveResult as MoveResult;
          const nextGs = msg.gameState as GameState;

          stepSeqRef.current += 1;
          setStepAnimationSignal({
            seq: stepSeqRef.current,
            color,
            tokenId,
            steps: moveRes.stepsPath,
            captured: moveRes.capturedTokens,
            reachedHome: moveRes.reachedHome,
          });

          if (moveRes.capturedTokens.length > 0) {
            window.setTimeout(() => soundEngine.playCapture(), 260);
          } else if (moveRes.reachedHome) {
            window.setTimeout(() => soundEngine.playHomeGoal(), 260);
          } else if (moveRes.landedOnSafe) {
            window.setTimeout(() => soundEngine.playSafeTile(), 220);
          }

          setGameState(nextGs);
          if (moveRes.gameFinished) {
            window.setTimeout(() => {
              soundEngine.playVictory();
              setScreenPhase('gameover');
            }, 520);
          }
        } else if (type === 'emoji_chat') {
          const chatMsg = msg.message as EmojiChatMessage;
          if (!chatMsg || !chatMsg.id) return;
          soundEngine.playEmojiPop();
          setEmojiMessages((prev) => [...prev.slice(-15), chatMsg]);
          window.setTimeout(() => {
            setEmojiMessages((prev) => prev.filter((item) => item.id !== chatMsg.id));
          }, 3200);
        }
      };

      ws.onclose = () => {
        if (!closed) {
          setOnlineConnected(false);
          reconnectTimer = window.setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  const sendWs = useCallback((payload: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // Offline Match Starter
  const startOfflineMatch = useCallback((mode: 'computer' | 'local', players: PlayerConfig[]) => {
    lastOfflineConfigRef.current = { mode, players };
    const initial = createInitialGameState(mode, players);
    recordedMatchIdRef.current = null;
    setActiveRoom(null);
    setSetupMode(null);
    setPendingInstructionMode(null);
    setGameState(initial);
    setScreenPhase('playing');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const handleQuickStart = useCallback(() => {
    const players = buildComputerPlayers(1, 3, [settings.playerName || 'Player 1']);
    startOfflineMatch('computer', players);
  }, [settings.playerName, startOfflineMatch]);

  // Support ?autostart=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      handleQuickStart();
    }
  }, [handleQuickStart]);

  // Identify local client's color in online matches
  const localClientColor = useMemo<PlayerColor | null>(() => {
    if (!gameState || !gameState.mode.startsWith('online') || !clientId) return null;
    for (const color of gameState.activeOrder) {
      if (gameState.players[color].clientId === clientId) {
        return color;
      }
    }
    return null;
  }, [gameState, clientId]);

  const isHumanTurn = useMemo(() => {
    if (!gameState || screenPhase !== 'playing') return false;
    const currentColor = getCurrentPlayerColor(gameState);
    const currentPlayer = gameState.players[currentColor];
    if (!currentPlayer || currentPlayer.isAI) return false;
    if (gameState.mode.startsWith('online')) {
      return currentPlayer.clientId === clientId;
    }
    return true;
  }, [gameState, screenPhase, clientId]);

  // Roll Dice Handler (offline & online)
  const handleRollDice = useCallback(() => {
    if (!gameState || screenPhase !== 'playing' || diceRollingVisual) return;
    if (gameState.turnPhase !== 'waiting_roll') return;

    const currentColor = getCurrentPlayerColor(gameState);
    const currentPlayer = gameState.players[currentColor];

    if (gameState.mode.startsWith('online')) {
      if (!currentPlayer.isAI && currentPlayer.clientId !== clientId) return;
      sendWs({ type: 'roll_dice' });
      return;
    }

    soundEngine.playDiceRoll();
    setDiceRollingVisual(true);
    const rolled = Math.floor(Math.random() * 6) + 1;

    window.setTimeout(() => {
      setDiceRollingVisual(false);
      soundEngine.playDiceLand(rolled);
      setGameState((prev) => (prev ? applyDiceRoll(prev, rolled) : prev));
    }, 450);
  }, [gameState, screenPhase, diceRollingVisual, clientId, sendWs]);

  // Token Selection Handler (plays requested vibration sound on token click!)
  const handleSelectToken = useCallback(
    (tokenId: number) => {
      if (!gameState || screenPhase !== 'playing') return;
      if (gameState.turnPhase !== 'selecting_token') return;
      if (!gameState.validTokenIds.includes(tokenId)) return;

      const currentColor = getCurrentPlayerColor(gameState);
      const currentPlayer = gameState.players[currentColor];

      // Trigger tactile vibration sound when user clicks a token (goti)
      if (!currentPlayer.isAI) {
        soundEngine.playTokenVibrate();
      }

      if (gameState.mode.startsWith('online')) {
        if (!currentPlayer.isAI && currentPlayer.clientId !== clientId) return;
        sendWs({ type: 'move_token', tokenId });
        return;
      }

      const result = applyTokenMove(gameState, tokenId);
      stepSeqRef.current += 1;
      setStepAnimationSignal({
        seq: stepSeqRef.current,
        color: currentColor,
        tokenId,
        steps: result.stepsPath,
        captured: result.capturedTokens,
        reachedHome: result.reachedHome,
      });

      if (result.capturedTokens.length > 0) {
        window.setTimeout(() => soundEngine.playCapture(), 260);
      } else if (result.reachedHome) {
        window.setTimeout(() => soundEngine.playHomeGoal(), 260);
      } else if (result.landedOnSafe) {
        window.setTimeout(() => soundEngine.playSafeTile(), 220);
      }

      setGameState(result.nextState);

      if (result.gameFinished) {
        window.setTimeout(() => {
          soundEngine.playVictory();
          setScreenPhase('gameover');
        }, 550);
      }
    },
    [gameState, screenPhase, clientId, sendWs]
  );

  // Record Offline Game Results to In-Memory Global Leaderboard
  useEffect(() => {
    if (
      screenPhase === 'gameover' &&
      gameState &&
      !gameState.mode.startsWith('online') &&
      recordedMatchIdRef.current !== gameState.startedAt
    ) {
      recordedMatchIdRef.current = gameState.startedAt;
      const winnerColor = gameState.winners[0];
      const participants = gameState.activeOrder.map((c) => ({
        name: gameState.players[c].name,
        color: c,
        isWin: c === winnerColor,
        captures: gameState.capturesCount[c] || 0,
      }));
      fetch('/api/leaderboard/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants }),
      }).catch(() => {});
    }
  }, [screenPhase, gameState]);

  // AI Turn Automation (for Computer mode & AI-filled online seats hosted by this client)
  useEffect(() => {
    if (screenPhase !== 'playing' || !gameState || diceRollingVisual) return;
    if (gameState.turnPhase === 'finished') return;

    const currentColor = getCurrentPlayerColor(gameState);
    const currentPlayer = gameState.players[currentColor];
    if (!currentPlayer.isAI) return;

    if (gameState.mode.startsWith('online')) {
      if (!activeRoom || activeRoom.hostId !== clientId) return;
    }

    const timer = window.setTimeout(() => {
      if (gameState.turnPhase === 'waiting_roll') {
        handleRollDice();
      } else if (gameState.turnPhase === 'selecting_token') {
        const bestId = chooseBestAiMove(gameState);
        handleSelectToken(bestId);
      }
    }, 620);

    return () => clearTimeout(timer);
  }, [screenPhase, gameState, diceRollingVisual, activeRoom, clientId, handleRollDice, handleSelectToken]);

  // Global Keyboard Shortcuts (Enter/Space on Title, Space to Roll, Esc/P to Pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (screenPhase === 'title' && !pendingInstructionMode && !setupMode && !showSettings && !showLeaderboard) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          soundEngine.playClick();
          handleQuickStart();
        }
        return;
      }

      if (screenPhase === 'playing') {
        if (e.key === ' ' && isHumanTurn && gameState?.turnPhase === 'waiting_roll') {
          e.preventDefault();
          handleRollDice();
        } else if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
          e.preventDefault();
          soundEngine.playClick();
          setScreenPhase('paused');
        }
      } else if (screenPhase === 'paused') {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
          e.preventDefault();
          soundEngine.playClick();
          setScreenPhase('playing');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    screenPhase,
    pendingInstructionMode,
    setupMode,
    showSettings,
    showLeaderboard,
    isHumanTurn,
    gameState,
    handleQuickStart,
    handleRollDice,
  ]);

  const handleRestartOffline = () => {
    if (lastOfflineConfigRef.current) {
      startOfflineMatch(lastOfflineConfigRef.current.mode, lastOfflineConfigRef.current.players);
    }
  };

  const handleExitToTitle = () => {
    if (activeRoom) {
      sendWs({ type: 'leave_room' });
      setActiveRoom(null);
    }
    setEmojiMessages([]);
    setGameState(null);
    setScreenPhase('title');
  };

  const handleSendEmoji = useCallback(
    (emoji: string) => {
      soundEngine.playClick();
      sendWs({ type: 'emoji_chat', emoji });
    },
    [sendWs]
  );

  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-[#061124]">
      {/* Fixed blurred Ludo wallpaper on wide/desktop/console screens */}
      <BlurredLudoBackdrop />

      {/* Mobile-width game frame on all screens */}
      <main className="relative z-10 h-dvh w-full max-w-[460px] overflow-hidden bg-[#0a182e] shadow-[0_0_90px_rgba(0,0,0,0.92)] sm:border-x sm:border-[#d4af37]/35">
        {/* Persistent 3D Three.js Canvas */}
      <LudoScene3D
        screenPhase={screenPhase}
        gameState={gameState}
        cameraMode={settings.cameraMode}
        isHumanTurn={isHumanTurn}
        diceRollingVisual={diceRollingVisual}
        onSelectToken={handleSelectToken}
        onRollDice={handleRollDice}
        onStepHop={(remaining) => soundEngine.playStep(6 - remaining)}
        stepAnimationSignal={stepAnimationSignal}
      />

      {/* Title Screen */}
      {screenPhase === 'title' && (
        <TitleOverlay
          settings={settings}
          onlinePlayersCount={onlinePlayersCount}
          onSelectMode={(mode) => setPendingInstructionMode(mode)}
          onQuickStart={handleQuickStart}
          onOpenSettings={() => setShowSettings(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onToggleMusic={() => updateSettings({ musicEnabled: !settings.musicEnabled })}
        />
      )}

      {/* Active Gameplay HUD */}
      {screenPhase !== 'title' && gameState && (
        <GameHud
          screenPhase={screenPhase}
          gameState={gameState}
          settings={settings}
          isHumanTurn={isHumanTurn}
          localClientColor={localClientColor}
          diceRollingVisual={diceRollingVisual}
          roomCode={activeRoom?.code ?? null}
          emojiMessages={emojiMessages}
          onSendEmoji={handleSendEmoji}
          onRollDice={handleRollDice}
          onSelectToken={handleSelectToken}
          onTogglePause={() =>
            setScreenPhase((prev) => (prev === 'paused' ? 'playing' : 'paused'))
          }
          onRestart={handleRestartOffline}
          onExitToTitle={handleExitToTitle}
          onOpenSettings={() => setShowSettings(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onToggleMusic={() => updateSettings({ musicEnabled: !settings.musicEnabled })}
          onToggleCamera={() =>
            updateSettings({
              cameraMode: settings.cameraMode === 'angled' ? 'top' : 'angled',
            })
          }
        />
      )}

      {/* Normal Instruction Modal (shown whenever user clicks any mode to play Ludo, with OK button) */}
      {pendingInstructionMode && (
        <InstructionsModal
          mode={pendingInstructionMode}
          onConfirm={() => {
            const m = pendingInstructionMode;
            setPendingInstructionMode(null);
            setRoomError(null);
            setSetupMode(m);
          }}
          onCancel={() => setPendingInstructionMode(null)}
        />
      )}

      {/* Mode Setup / Lobby Modal */}
      {setupMode && (
        <ModeSetupModal
          mode={setupMode}
          defaultPlayerName={settings.playerName}
          onlineConnected={onlineConnected}
          onlinePlayersCount={onlinePlayersCount}
          clientId={clientId}
          activeRoom={activeRoom}
          roomError={roomError}
          onStartOffline={startOfflineMatch}
          onCreateOnlineRoom={(name, friendCount) => {
            setRoomError(null);
            sendWs({ type: 'create_room', name, friendCount });
          }}
          onJoinOnlineRoom={(code, name) => {
            setRoomError(null);
            sendWs({ type: 'join_room', code, name });
          }}
          onJoinGlobalQueue={(name, maxPlayers) => {
            setRoomError(null);
            sendWs({ type: 'join_global', name, maxPlayers });
          }}
          onStartOnlineRoom={(fillWithBots) => {
            sendWs({ type: 'start_room_game', fillWithBots });
          }}
          onLeaveOnlineRoom={() => {
            sendWs({ type: 'leave_room' });
            setActiveRoom(null);
            setRoomError(null);
          }}
          onClose={() => setSetupMode(null)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Global Leaderboard Modal */}
      {showLeaderboard && (
        <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
      )}
      </main>
    </div>
  );
}
