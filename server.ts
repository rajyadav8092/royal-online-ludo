import express from 'express';
import { createServer as createHttpServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  ALL_COLORS,
  applyDiceRoll,
  applyTokenMove,
  createInitialGameState,
  getCurrentPlayerColor,
} from './src/game/ludoEngine';
import {
  EmojiChatMessage,
  GameState,
  InviteSlot,
  LeaderboardEntry,
  OnlineRoomPlayer,
  OnlineRoomSnapshot,
  PlayerColor,
  PlayerConfig,
} from './src/game/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

// Pure In-Memory Storage (Zero Database)
const leaderboardMap = new Map<string, LeaderboardEntry>();

const SEED_LEADERS: LeaderboardEntry[] = [
  { id: 'seed-1', name: 'Rajiv_Royal', wins: 28, matches: 36, captures: 64, points: 3440, favoriteColor: 'red', updatedAt: Date.now() - 3600_000 },
  { id: 'seed-2', name: 'AaravKing', wins: 23, matches: 32, captures: 51, points: 2810, favoriteColor: 'yellow', updatedAt: Date.now() - 7200_000 },
  { id: 'seed-3', name: 'PriyaQueen', wins: 19, matches: 28, captures: 44, points: 2340, favoriteColor: 'green', updatedAt: Date.now() - 10800_000 },
  { id: 'seed-4', name: 'VikramAce', wins: 15, matches: 25, captures: 39, points: 1890, favoriteColor: 'blue', updatedAt: Date.now() - 14400_000 },
  { id: 'seed-5', name: 'SnehaPro', wins: 12, matches: 20, captures: 28, points: 1480, favoriteColor: 'red', updatedAt: Date.now() - 18000_000 },
  { id: 'seed-6', name: 'Kabir3D', wins: 9, matches: 17, captures: 22, points: 1120, favoriteColor: 'green', updatedAt: Date.now() - 21600_000 },
];

for (const entry of SEED_LEADERS) {
  leaderboardMap.set(entry.name.toLowerCase(), entry);
}

function recordLeaderboardMatch(
  participants: Array<{ name: string; color: PlayerColor; isWin: boolean; captures: number }>
) {
  for (const p of participants) {
    const cleanName = p.name.trim().slice(0, 20);
    if (!cleanName || cleanName.startsWith('Bot ')) continue;
    const key = cleanName.toLowerCase();
    const existing = leaderboardMap.get(key);
    const earnedPoints = (p.isWin ? 100 : 20) + p.captures * 10;

    if (existing) {
      existing.wins += p.isWin ? 1 : 0;
      existing.matches += 1;
      existing.captures += p.captures;
      existing.points += earnedPoints;
      existing.favoriteColor = p.color;
      existing.updatedAt = Date.now();
    } else {
      leaderboardMap.set(key, {
        id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        wins: p.isWin ? 1 : 0,
        matches: 1,
        captures: p.captures,
        points: earnedPoints,
        favoriteColor: p.color,
        updatedAt: Date.now(),
      });
    }
  }
}

function getSortedLeaderboard(): LeaderboardEntry[] {
  return Array.from(leaderboardMap.values())
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .slice(0, 25);
}

interface InternalRoom {
  code: string;
  isGlobal: boolean;
  maxPlayers: 1 | 2 | 3 | 4;
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  players: OnlineRoomPlayer[];
  inviteSlots: InviteSlot[];
  gameState: GameState | null;
  sockets: Map<string, WebSocket>;
}

const rooms = new Map<string, InternalRoom>();
const inviteCodeIndex = new Map<string, { roomCode: string; color: PlayerColor }>();
const clientRoomMap = new Map<string, string>();
const activeClients = new Map<string, WebSocket>();

const ALLOWED_EMOJIS = new Set(['👏', '😂', '🔥', '😎', '😭', '😡', '🎲', '🙏', '❤️', '⚡']);
const CODE_WORDS = ['KING', 'GOLD', 'STAR', 'LUDO', 'CROWN', 'ROYAL', 'ACES', 'DICE', 'HERO', 'GEMS'];

function generateUniqueCode(): string {
  for (let attempt = 0; attempt < 60; attempt++) {
    const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
    const num = Math.floor(10 + Math.random() * 89);
    const code = `${word}${num}`.slice(0, 6);
    if (!rooms.has(code) && !inviteCodeIndex.has(code)) return code;
  }
  return `L${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

function toSnapshot(room: InternalRoom): OnlineRoomSnapshot {
  return {
    code: room.code,
    isGlobal: room.isGlobal,
    maxPlayers: room.maxPlayers,
    hostId: room.hostId,
    status: room.status,
    players: room.players.map((p) => ({ ...p })),
    inviteSlots: room.inviteSlots.map((s) => ({ ...s })),
    gameState: room.gameState,
  };
}

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(room: InternalRoom, payload: unknown) {
  const raw = JSON.stringify(payload);
  for (const ws of room.sockets.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(raw);
    }
  }
}

function broadcastOnlineStats() {
  const waitingGlobal = Array.from(rooms.values())
    .filter((r) => r.isGlobal && r.status === 'waiting')
    .reduce((sum, r) => sum + r.players.length, 0);
  const raw = JSON.stringify({
    type: 'online_stats',
    onlinePlayers: activeClients.size,
    waitingGlobal,
  });
  for (const ws of activeClients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(raw);
    }
  }
}

function getSeatPoolForSize(size: number): PlayerColor[] {
  if (size <= 2) return ['red', 'yellow'];
  if (size === 3) return ['red', 'green', 'yellow'];
  return ALL_COLORS;
}

function pickNextAvailableColor(players: OnlineRoomPlayer[], maxPlayers: 1 | 2 | 3 | 4): PlayerColor {
  const targetSize = maxPlayers === 1 ? 4 : maxPlayers;
  const pool = getSeatPoolForSize(targetSize);
  const taken = new Set(players.map((p) => p.color));
  return pool.find((c) => !taken.has(c)) || ALL_COLORS.find((c) => !taken.has(c)) || 'red';
}

function startRoomGame(room: InternalRoom, fillWithBots = false) {
  const targetSize = room.maxPlayers === 1 ? 4 : room.maxPlayers;
  const pool = getSeatPoolForSize(targetSize);
  const configs: PlayerConfig[] = room.players.map((p) => ({
    color: p.color,
    name: p.name,
    isAI: false,
    isActive: true,
    isConnected: true,
    clientId: p.clientId,
  }));

  if (fillWithBots || room.maxPlayers === 1) {
    const taken = new Set(configs.map((c) => c.color));
    for (const color of pool) {
      if (!taken.has(color) && configs.length < targetSize) {
        configs.push({
          color,
          name: `Bot ${color[0].toUpperCase()}${color.slice(1)}`,
          isAI: true,
          isActive: true,
        });
      }
    }
  }

  room.status = 'playing';
  room.gameState = createInitialGameState(room.isGlobal ? 'online_global' : 'online_private', configs);
  broadcastRoom(room, { type: 'game_started', room: toSnapshot(room) });
  broadcastOnlineStats();
}

function leaveCurrentRoom(clientId: string) {
  const code = clientRoomMap.get(clientId);
  if (!code) return;
  clientRoomMap.delete(clientId);
  const room = rooms.get(code);
  if (!room) return;

  room.sockets.delete(clientId);
  const leavingPlayer = room.players.find((p) => p.clientId === clientId);
  room.players = room.players.filter((p) => p.clientId !== clientId);

  // Release any invite slot claimed by this client while waiting
  if (room.status === 'waiting') {
    for (const slot of room.inviteSlots) {
      if (slot.claimedByClientId === clientId) {
        slot.claimedByClientId = null;
        slot.claimedByName = null;
      }
    }
  }

  if (room.players.length === 0 || room.sockets.size === 0) {
    for (const slot of room.inviteSlots) {
      inviteCodeIndex.delete(slot.code);
    }
    rooms.delete(code);
    broadcastOnlineStats();
    return;
  }

  if (room.hostId === clientId) {
    room.hostId = room.players[0].clientId;
  }

  if (room.status === 'playing' && room.gameState && leavingPlayer) {
    const seat = room.gameState.players[leavingPlayer.color];
    if (seat) {
      seat.isAI = true;
      seat.isConnected = false;
      seat.name = `${seat.name} (AI)`;
      room.gameState.lastEventText = `${leavingPlayer.name} left — AI took over.`;
    }
  }

  broadcastRoom(room, {
    type: 'room_updated',
    room: toSnapshot(room),
    notice: leavingPlayer ? `${leavingPlayer.name} left the room.` : undefined,
  });
  broadcastOnlineStats();
}

async function bootstrap() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, onlinePlayers: activeClients.size });
  });

  app.get('/api/leaderboard', (_req, res) => {
    res.json({ entries: getSortedLeaderboard() });
  });

  app.post('/api/leaderboard/record', (req, res) => {
    const { participants } = req.body as {
      participants?: Array<{ name: string; color: PlayerColor; isWin: boolean; captures: number }>;
    };
    if (!Array.isArray(participants)) {
      res.status(400).json({ error: 'participants array required' });
      return;
    }
    recordLeaderboardMatch(participants);
    res.json({ entries: getSortedLeaderboard() });
  });

  const httpServer = createHttpServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    const clientId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    activeClients.set(clientId, ws);

    sendJson(ws, {
      type: 'connected',
      clientId,
      onlinePlayers: activeClients.size,
    });
    broadcastOnlineStats();

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      const type = String(msg.type || '');

      if (type === 'create_room') {
        leaveCurrentRoom(clientId);
        const name = String(msg.name || 'Host').trim().slice(0, 18) || 'Host';
        const rawFriendCount = Number(msg.friendCount ?? 3);
        const friendCount = Math.max(1, Math.min(3, rawFriendCount)) as 1 | 2 | 3;
        const maxPlayers = (friendCount + 1) as 2 | 3 | 4;

        const roomCode = generateUniqueCode();
        const seatPool = getSeatPoolForSize(maxPlayers);
        const hostColor = seatPool[0];
        const friendColors = seatPool.slice(1);

        const inviteSlots: InviteSlot[] = friendColors.map((color) => {
          const slotCode = generateUniqueCode();
          inviteCodeIndex.set(slotCode, { roomCode, color });
          return {
            code: slotCode,
            color,
            claimedByClientId: null,
            claimedByName: null,
          };
        });

        const room: InternalRoom = {
          code: roomCode,
          isGlobal: false,
          maxPlayers,
          hostId: clientId,
          status: 'waiting',
          players: [{ clientId, name, color: hostColor, ready: true }],
          inviteSlots,
          gameState: null,
          sockets: new Map([[clientId, ws]]),
        };

        rooms.set(roomCode, room);
        clientRoomMap.set(clientId, roomCode);
        sendJson(ws, { type: 'room_joined', room: toSnapshot(room) });
        broadcastOnlineStats();
      } else if (type === 'join_room') {
        const inputCode = String(msg.code || '').trim().toUpperCase();
        const name = String(msg.name || 'Friend').trim().slice(0, 18) || 'Friend';

        // Match either an individual friend invite slot code OR fallback room code
        const indexedSlot = inviteCodeIndex.get(inputCode);
        const room = indexedSlot ? rooms.get(indexedSlot.roomCode) : rooms.get(inputCode);

        if (!room) {
          sendJson(ws, { type: 'room_error', message: `Invite code "${inputCode}" not found.` });
          return;
        }
        if (room.status !== 'waiting') {
          sendJson(ws, { type: 'room_error', message: 'This match has already started.' });
          return;
        }
        if (room.players.length >= room.maxPlayers) {
          sendJson(ws, { type: 'room_error', message: 'This room is already full.' });
          return;
        }

        let assignedColor: PlayerColor;
        if (indexedSlot) {
          const slot = room.inviteSlots.find((s) => s.code === inputCode);
          if (!slot) {
            sendJson(ws, { type: 'room_error', message: `Invite code "${inputCode}" is invalid.` });
            return;
          }
          if (slot.claimedByClientId && slot.claimedByClientId !== clientId) {
            sendJson(ws, {
              type: 'room_error',
              message: `Invite code "${inputCode}" was already used by ${slot.claimedByName}.`,
            });
            return;
          }
          assignedColor = slot.color;
          leaveCurrentRoom(clientId);
          slot.claimedByClientId = clientId;
          slot.claimedByName = name;
        } else {
          leaveCurrentRoom(clientId);
          assignedColor = pickNextAvailableColor(room.players, room.maxPlayers);
          const openSlot = room.inviteSlots.find((s) => s.color === assignedColor);
          if (openSlot) {
            openSlot.claimedByClientId = clientId;
            openSlot.claimedByName = name;
          }
        }

        room.players.push({ clientId, name, color: assignedColor, ready: true });
        room.sockets.set(clientId, ws);
        clientRoomMap.set(clientId, room.code);

        sendJson(ws, { type: 'room_joined', room: toSnapshot(room) });
        broadcastRoom(room, {
          type: 'room_updated',
          room: toSnapshot(room),
          notice: `${name} joined the room.`,
        });
        broadcastOnlineStats();
      } else if (type === 'join_global') {
        leaveCurrentRoom(clientId);
        const name = String(msg.name || 'Player').trim().slice(0, 18) || 'Player';
        const rawMax = Number(msg.maxPlayers ?? 4);
        const maxPlayers = ([1, 2, 3, 4].includes(rawMax) ? rawMax : 4) as 1 | 2 | 3 | 4;

        // 1-Player Global Arena launches immediately with Arena AI opponents
        if (maxPlayers === 1) {
          const code = `GLB-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const room: InternalRoom = {
            code,
            isGlobal: true,
            maxPlayers: 1,
            hostId: clientId,
            status: 'waiting',
            players: [{ clientId, name, color: 'red', ready: true }],
            inviteSlots: [],
            gameState: null,
            sockets: new Map([[clientId, ws]]),
          };
          rooms.set(code, room);
          clientRoomMap.set(clientId, code);
          sendJson(ws, { type: 'room_joined', room: toSnapshot(room) });
          startRoomGame(room, true);
          return;
        }

        let targetRoom = Array.from(rooms.values()).find(
          (r) =>
            r.isGlobal &&
            r.status === 'waiting' &&
            r.maxPlayers === maxPlayers &&
            r.players.length < r.maxPlayers
        );

        if (!targetRoom) {
          const code = `GLB-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          targetRoom = {
            code,
            isGlobal: true,
            maxPlayers,
            hostId: clientId,
            status: 'waiting',
            players: [{ clientId, name, color: 'red', ready: true }],
            inviteSlots: [],
            gameState: null,
            sockets: new Map([[clientId, ws]]),
          };
          rooms.set(code, targetRoom);
          clientRoomMap.set(clientId, targetRoom.code);
          sendJson(ws, { type: 'room_joined', room: toSnapshot(targetRoom) });
        } else {
          const color = pickNextAvailableColor(targetRoom.players, targetRoom.maxPlayers);
          targetRoom.players.push({ clientId, name, color, ready: true });
          targetRoom.sockets.set(clientId, ws);
          clientRoomMap.set(clientId, targetRoom.code);
          sendJson(ws, { type: 'room_joined', room: toSnapshot(targetRoom) });
          broadcastRoom(targetRoom, {
            type: 'room_updated',
            room: toSnapshot(targetRoom),
            notice: `${name} joined Global Match!`,
          });

          if (targetRoom.players.length >= targetRoom.maxPlayers) {
            startRoomGame(targetRoom, false);
          }
        }
        broadcastOnlineStats();
      } else if (type === 'leave_room') {
        leaveCurrentRoom(clientId);
      } else if (type === 'start_room_game') {
        const code = clientRoomMap.get(clientId);
        if (!code) return;
        const room = rooms.get(code);
        if (!room || room.status !== 'waiting') return;
        const fillWithBots = Boolean(msg.fillWithBots);
        if (room.players.length < 2 && !fillWithBots) {
          sendJson(ws, { type: 'room_error', message: 'Wait for friends to join or fill empty seats with AI.' });
          return;
        }
        startRoomGame(room, fillWithBots);
      } else if (type === 'emoji_chat') {
        const code = clientRoomMap.get(clientId);
        if (!code) return;
        const room = rooms.get(code);
        if (!room) return;
        const emoji = String(msg.emoji || '');
        if (!ALLOWED_EMOJIS.has(emoji)) return;
        const sender = room.players.find((p) => p.clientId === clientId);
        if (!sender) return;

        const chatMsg: EmojiChatMessage = {
          id: `em-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          clientId,
          color: sender.color,
          name: sender.name,
          emoji,
          timestamp: Date.now(),
        };
        broadcastRoom(room, { type: 'emoji_chat', message: chatMsg });
      } else if (type === 'roll_dice') {
        const code = clientRoomMap.get(clientId);
        if (!code) return;
        const room = rooms.get(code);
        if (!room || !room.gameState || room.status !== 'playing') return;

        const currentColor = getCurrentPlayerColor(room.gameState);
        const currentPlayer = room.gameState.players[currentColor];
        if (!currentPlayer.isAI && currentPlayer.clientId !== clientId) {
          return;
        }
        if (room.gameState.turnPhase !== 'waiting_roll') return;

        const rolledValue = Math.floor(Math.random() * 6) + 1;
        const nextState = applyDiceRoll(room.gameState, rolledValue);
        room.gameState = nextState;

        broadcastRoom(room, {
          type: 'dice_rolled',
          rolledValue,
          color: currentColor,
          gameState: nextState,
        });
      } else if (type === 'move_token') {
        const code = clientRoomMap.get(clientId);
        if (!code) return;
        const room = rooms.get(code);
        if (!room || !room.gameState || room.status !== 'playing') return;

        const currentColor = getCurrentPlayerColor(room.gameState);
        const currentPlayer = room.gameState.players[currentColor];
        if (!currentPlayer.isAI && currentPlayer.clientId !== clientId) {
          return;
        }
        const tokenId = Number(msg.tokenId);
        if (!room.gameState.validTokenIds.includes(tokenId)) return;

        const result = applyTokenMove(room.gameState, tokenId);
        room.gameState = result.nextState;

        if (result.gameFinished) {
          room.status = 'finished';
          const winnerColor = result.nextState.winners[0];
          const participants = result.nextState.activeOrder.map((c) => ({
            name: result.nextState.players[c].name,
            color: c,
            isWin: c === winnerColor,
            captures: result.nextState.capturesCount[c] || 0,
          }));
          recordLeaderboardMatch(participants);
        }

        broadcastRoom(room, {
          type: 'token_moved',
          tokenId,
          color: currentColor,
          moveResult: result,
          gameState: result.nextState,
        });
      }
    });

    ws.on('close', () => {
      activeClients.delete(clientId);
      leaveCurrentRoom(clientId);
      broadcastOnlineStats();
    });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Online Ludo Game server listening on http://localhost:${PORT}`);
  });
}

bootstrap();
