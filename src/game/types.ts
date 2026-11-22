export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export type GameMode = 'computer' | 'local' | 'online_private' | 'online_global';

export type ScreenPhase = 'title' | 'playing' | 'paused' | 'gameover';

export type TurnPhase = 'waiting_roll' | 'rolling' | 'selecting_token' | 'animating' | 'finished';

export interface TokenState {
  id: number; // 0..3
  color: PlayerColor;
  progress: number; // -1 = yard, 0..50 = main track, 51..55 = home stretch, 56 = finished
}

export interface PlayerConfig {
  color: PlayerColor;
  name: string;
  isAI: boolean;
  isActive: boolean;
  isConnected?: boolean;
  clientId?: string;
}

export interface GameState {
  mode: GameMode;
  players: Record<PlayerColor, PlayerConfig>;
  activeOrder: PlayerColor[];
  currentTurnIndex: number;
  turnPhase: TurnPhase;
  diceValue: number | null;
  consecutiveSixes: number;
  tokens: Record<PlayerColor, TokenState[]>;
  validTokenIds: number[];
  winners: PlayerColor[];
  turnCount: number;
  lastEventText: string;
  capturesCount: Record<PlayerColor, number>;
  startedAt: number;
}

export interface MoveResult {
  nextState: GameState;
  movedFromProgress: number;
  movedToProgress: number;
  stepsPath: number[];
  capturedTokens: Array<{ color: PlayerColor; id: number }>;
  reachedHome: boolean;
  landedOnSafe: boolean;
  grantedBonusRoll: boolean;
  gameFinished: boolean;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  wins: number;
  matches: number;
  captures: number;
  points: number;
  favoriteColor: PlayerColor;
  updatedAt: number;
}

export interface GameSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  vibrationEnabled: boolean;
  cameraMode: 'angled' | 'top';
  playerName: string;
}

export interface OnlineRoomPlayer {
  clientId: string;
  name: string;
  color: PlayerColor;
  ready: boolean;
}

export interface InviteSlot {
  code: string;
  color: PlayerColor;
  claimedByClientId: string | null;
  claimedByName: string | null;
}

export interface EmojiChatMessage {
  id: string;
  clientId: string;
  color: PlayerColor;
  name: string;
  emoji: string;
  timestamp: number;
}

export interface OnlineRoomSnapshot {
  code: string;
  isGlobal: boolean;
  maxPlayers: 1 | 2 | 3 | 4;
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  players: OnlineRoomPlayer[];
  inviteSlots?: InviteSlot[];
  gameState: GameState | null;
}
