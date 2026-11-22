import {
  GameMode,
  GameState,
  MoveResult,
  PlayerColor,
  PlayerConfig,
  TokenState,
} from './types';

export const ALL_COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export const COLOR_LABELS: Record<PlayerColor, string> = {
  red: 'Crimson Red',
  green: 'Emerald Green',
  yellow: 'Royal Gold',
  blue: 'Sapphire Blue',
};

export const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#e13b3b',
  green: '#22a858',
  yellow: '#eab308',
  blue: '#2563eb',
};

// 52-square clockwise outer track (row, col) on 15x15 Ludo board
export const MAIN_TRACK_COORDS: ReadonlyArray<[number, number]> = [
  [6, 1], // 0: Red start (SAFE)
  [6, 2], // 1
  [6, 3], // 2
  [6, 4], // 3
  [6, 5], // 4
  [5, 6], // 5
  [4, 6], // 6
  [3, 6], // 7
  [2, 6], // 8: Star (SAFE)
  [1, 6], // 9
  [0, 6], // 10
  [0, 7], // 11
  [0, 8], // 12
  [1, 8], // 13: Green start (SAFE)
  [2, 8], // 14
  [3, 8], // 15
  [4, 8], // 16
  [5, 8], // 17
  [6, 9], // 18
  [6, 10], // 19
  [6, 11], // 20
  [6, 12], // 21: Star (SAFE)
  [6, 13], // 22
  [6, 14], // 23
  [7, 14], // 24
  [8, 14], // 25
  [8, 13], // 26: Yellow start (SAFE)
  [8, 12], // 27
  [8, 11], // 28
  [8, 10], // 29
  [8, 9], // 30
  [9, 8], // 31
  [10, 8], // 32
  [11, 8], // 33
  [12, 8], // 34: Star (SAFE)
  [13, 8], // 35
  [14, 8], // 36
  [14, 7], // 37
  [14, 6], // 38
  [13, 6], // 39: Blue start (SAFE)
  [12, 6], // 40
  [11, 6], // 41
  [10, 6], // 42
  [9, 6], // 43
  [8, 5], // 44
  [8, 4], // 45
  [8, 3], // 46
  [8, 2], // 47: Star (SAFE)
  [8, 1], // 48
  [8, 0], // 49
  [7, 0], // 50
  [6, 0], // 51
];

export const START_TRACK_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

export const SAFE_TRACK_INDICES = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);
export const STAR_TRACK_INDICES = new Set<number>([8, 21, 34, 47]);

export const HOME_STRETCH_COORDS: Record<PlayerColor, ReadonlyArray<[number, number]>> = {
  red: [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
    [7, 6.25],
  ],
  green: [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
    [6.25, 7],
  ],
  yellow: [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
    [7, 7.75],
  ],
  blue: [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
    [7.75, 7],
  ],
};

// Base yard slots (fractional row, col inside the 6x6 colored corners)
export const YARD_COORDS: Record<PlayerColor, ReadonlyArray<[number, number]>> = {
  red: [
    [1.65, 1.65],
    [1.65, 3.35],
    [3.35, 1.65],
    [3.35, 3.35],
  ],
  green: [
    [1.65, 10.65],
    [1.65, 12.35],
    [3.35, 10.65],
    [3.35, 12.35],
  ],
  yellow: [
    [10.65, 10.65],
    [10.65, 12.35],
    [12.35, 10.65],
    [12.35, 12.35],
  ],
  blue: [
    [10.65, 1.65],
    [10.65, 3.35],
    [12.35, 1.65],
    [12.35, 3.35],
  ],
};

export function getGlobalTrackIndex(color: PlayerColor, progress: number): number | null {
  if (progress < 0 || progress > 50) return null;
  return (START_TRACK_INDEX[color] + progress) % 52;
}

export function getTokenBoardCoord(
  color: PlayerColor,
  tokenId: number,
  progress: number
): [number, number] {
  if (progress < 0) {
    return YARD_COORDS[color][tokenId];
  }
  if (progress <= 50) {
    const idx = (START_TRACK_INDEX[color] + progress) % 52;
    return MAIN_TRACK_COORDS[idx];
  }
  const stretchIdx = Math.min(progress - 51, 5);
  return HOME_STRETCH_COORDS[color][stretchIdx];
}

export function createInitialTokens(): Record<PlayerColor, TokenState[]> {
  return {
    red: [0, 1, 2, 3].map((id) => ({ id, color: 'red', progress: -1 })),
    green: [0, 1, 2, 3].map((id) => ({ id, color: 'green', progress: -1 })),
    yellow: [0, 1, 2, 3].map((id) => ({ id, color: 'yellow', progress: -1 })),
    blue: [0, 1, 2, 3].map((id) => ({ id, color: 'blue', progress: -1 })),
  };
}

export function createInitialGameState(
  mode: GameMode,
  playerConfigs: PlayerConfig[]
): GameState {
  const players: Record<PlayerColor, PlayerConfig> = {
    red: { color: 'red', name: 'Red', isAI: false, isActive: false },
    green: { color: 'green', name: 'Green', isAI: false, isActive: false },
    yellow: { color: 'yellow', name: 'Yellow', isAI: false, isActive: false },
    blue: { color: 'blue', name: 'Blue', isAI: false, isActive: false },
  };

  for (const cfg of playerConfigs) {
    players[cfg.color] = { ...cfg, isActive: true };
  }

  // Keep clockwise board order
  const activeOrder = ALL_COLORS.filter((c) => players[c].isActive);

  return {
    mode,
    players,
    activeOrder,
    currentTurnIndex: 0,
    turnPhase: 'waiting_roll',
    diceValue: null,
    consecutiveSixes: 0,
    tokens: createInitialTokens(),
    validTokenIds: [],
    winners: [],
    turnCount: 1,
    lastEventText: `${players[activeOrder[0]].name}'s turn — Roll the dice!`,
    capturesCount: { red: 0, green: 0, yellow: 0, blue: 0 },
    startedAt: Date.now(),
  };
}

export function getCurrentPlayerColor(state: GameState): PlayerColor {
  return state.activeOrder[state.currentTurnIndex];
}

export function getValidTokenIds(
  tokens: TokenState[],
  diceValue: number
): number[] {
  const valid: number[] = [];
  for (const token of tokens) {
    if (token.progress === 56) continue;
    if (token.progress === -1) {
      if (diceValue === 6) {
        valid.push(token.id);
      }
    } else if (token.progress + diceValue <= 56) {
      valid.push(token.id);
    }
  }
  return valid;
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    activeOrder: [...state.activeOrder],
    validTokenIds: [...state.validTokenIds],
    winners: [...state.winners],
    capturesCount: { ...state.capturesCount },
    players: {
      red: { ...state.players.red },
      green: { ...state.players.green },
      yellow: { ...state.players.yellow },
      blue: { ...state.players.blue },
    },
    tokens: {
      red: state.tokens.red.map((t) => ({ ...t })),
      green: state.tokens.green.map((t) => ({ ...t })),
      yellow: state.tokens.yellow.map((t) => ({ ...t })),
      blue: state.tokens.blue.map((t) => ({ ...t })),
    },
  };
}

function getNextActiveTurnIndex(state: GameState): number {
  const count = state.activeOrder.length;
  for (let offset = 1; offset <= count; offset++) {
    const candidateIdx = (state.currentTurnIndex + offset) % count;
    const candidateColor = state.activeOrder[candidateIdx];
    if (!state.winners.includes(candidateColor)) {
      return candidateIdx;
    }
  }
  return state.currentTurnIndex;
}

export function applyDiceRoll(state: GameState, rolledValue: number): GameState {
  const next = cloneState(state);
  const activeColor = getCurrentPlayerColor(next);
  const playerName = next.players[activeColor].name;

  next.diceValue = rolledValue;

  if (rolledValue === 6 && next.consecutiveSixes >= 2) {
    // Three 6s in a row forfeits turn
    next.consecutiveSixes = 0;
    next.validTokenIds = [];
    next.currentTurnIndex = getNextActiveTurnIndex(next);
    next.turnPhase = 'waiting_roll';
    next.diceValue = null;
    next.turnCount += 1;
    const nextColor = getCurrentPlayerColor(next);
    next.lastEventText = `${playerName} rolled three 6s! Turn passes to ${next.players[nextColor].name}.`;
    return next;
  }

  const nextSixes = rolledValue === 6 ? next.consecutiveSixes + 1 : 0;
  next.consecutiveSixes = nextSixes;

  const valid = getValidTokenIds(next.tokens[activeColor], rolledValue);
  next.validTokenIds = valid;

  if (valid.length === 0) {
    next.currentTurnIndex = getNextActiveTurnIndex(next);
    next.turnPhase = 'waiting_roll';
    next.consecutiveSixes = 0;
    next.turnCount += 1;
    const nextColor = getCurrentPlayerColor(next);
    next.lastEventText = `${playerName} rolled ${rolledValue} — No valid moves. ${next.players[nextColor].name}'s turn.`;
    return next;
  }

  next.turnPhase = 'selecting_token';
  next.lastEventText = `${playerName} rolled ${rolledValue}! Select a highlighted token.`;
  return next;
}

export function applyTokenMove(state: GameState, tokenId: number): MoveResult {
  if (state.diceValue === null) {
    throw new Error('Cannot move token without a rolled dice value.');
  }
  const dice = state.diceValue;
  const activeColor = getCurrentPlayerColor(state);

  if (!state.validTokenIds.includes(tokenId)) {
    throw new Error(`Token ${tokenId} is not a valid move for ${activeColor}.`);
  }

  const next = cloneState(state);
  const token = next.tokens[activeColor][tokenId];
  const movedFromProgress = token.progress;

  const stepsPath: number[] = [];
  if (movedFromProgress === -1) {
    token.progress = 0;
    stepsPath.push(0);
  } else {
    for (let s = 1; s <= dice; s++) {
      stepsPath.push(movedFromProgress + s);
    }
    token.progress = movedFromProgress + dice;
  }

  const movedToProgress = token.progress;
  const reachedHome = movedToProgress === 56;
  const targetTrackIndex = getGlobalTrackIndex(activeColor, movedToProgress);
  const landedOnSafe = targetTrackIndex !== null && SAFE_TRACK_INDICES.has(targetTrackIndex);

  const capturedTokens: Array<{ color: PlayerColor; id: number }> = [];

  if (targetTrackIndex !== null && !landedOnSafe) {
    for (const oppColor of next.activeOrder) {
      if (oppColor === activeColor) continue;
      for (const oppToken of next.tokens[oppColor]) {
        const oppTrackIdx = getGlobalTrackIndex(oppColor, oppToken.progress);
        if (oppTrackIdx === targetTrackIndex) {
          oppToken.progress = -1;
          capturedTokens.push({ color: oppColor, id: oppToken.id });
          next.capturesCount[activeColor] += 1;
        }
      }
    }
  }

  // Check if player finished all 4 tokens
  const allFinished = next.tokens[activeColor].every((t) => t.progress === 56);
  if (allFinished && !next.winners.includes(activeColor)) {
    next.winners.push(activeColor);
  }

  // Determine remaining non-finished players
  const remainingPlayers = next.activeOrder.filter((c) => !next.winners.includes(c));
  const gameFinished = remainingPlayers.length <= 1;

  if (gameFinished) {
    if (remainingPlayers.length === 1 && !next.winners.includes(remainingPlayers[0])) {
      next.winners.push(remainingPlayers[0]);
    }
    next.turnPhase = 'finished';
    next.validTokenIds = [];
    const champion = next.players[next.winners[0]];
    next.lastEventText = `${champion.name} wins the Ludo Royale crown!`;
    return {
      nextState: next,
      movedFromProgress,
      movedToProgress,
      stepsPath,
      capturedTokens,
      reachedHome,
      landedOnSafe,
      grantedBonusRoll: false,
      gameFinished: true,
    };
  }

  // Bonus roll on rolling 6, capturing an opponent, or entering home (if player still has tokens to play)
  const playerStillPlaying = !next.winners.includes(activeColor);
  const grantedBonusRoll =
    playerStillPlaying && (dice === 6 || capturedTokens.length > 0 || reachedHome);

  next.validTokenIds = [];
  next.diceValue = null;
  next.turnPhase = 'waiting_roll';

  const playerName = next.players[activeColor].name;

  if (grantedBonusRoll) {
    if (capturedTokens.length > 0) {
      next.lastEventText = `${playerName} captured an opponent! Bonus roll!`;
    } else if (reachedHome) {
      next.lastEventText = `${playerName} reached Home! Bonus roll!`;
    } else {
      next.lastEventText = `${playerName} rolled a 6! Roll again!`;
    }
  } else {
    next.consecutiveSixes = 0;
    next.currentTurnIndex = getNextActiveTurnIndex(next);
    next.turnCount += 1;
    const nextColor = getCurrentPlayerColor(next);
    next.lastEventText = `${next.players[nextColor].name}'s turn — Roll the dice!`;
  }

  return {
    nextState: next,
    movedFromProgress,
    movedToProgress,
    stepsPath,
    capturedTokens,
    reachedHome,
    landedOnSafe,
    grantedBonusRoll,
    gameFinished: false,
  };
}

export function chooseBestAiMove(state: GameState): number {
  const activeColor = getCurrentPlayerColor(state);
  const dice = state.diceValue;
  if (dice === null || state.validTokenIds.length === 0) return 0;
  if (state.validTokenIds.length === 1) return state.validTokenIds[0];

  let bestId = state.validTokenIds[0];
  let bestScore = -Infinity;

  for (const id of state.validTokenIds) {
    const token = state.tokens[activeColor][id];
    let score = 0;

    if (token.progress === -1) {
      // Unlocking a token on 6 is usually strong
      score += 48;
      const startIdx = START_TRACK_INDEX[activeColor];
      // Check if an opponent sits nearby ahead
      for (const oppColor of state.activeOrder) {
        if (oppColor === activeColor) continue;
        for (const opp of state.tokens[oppColor]) {
          const oppIdx = getGlobalTrackIndex(oppColor, opp.progress);
          if (oppIdx !== null && (oppIdx - startIdx + 52) % 52 <= 6) {
            score += 8;
          }
        }
      }
    } else {
      const targetProgress = token.progress + dice;
      if (targetProgress === 56) {
        score += 120; // Reaching home is top priority
      } else if (targetProgress >= 51) {
        score += 75; // Safe inside home column
      } else {
        const targetTrackIdx = getGlobalTrackIndex(activeColor, targetProgress)!;
        const currentTrackIdx = getGlobalTrackIndex(activeColor, token.progress)!;

        // Check capture opportunity
        if (!SAFE_TRACK_INDICES.has(targetTrackIdx)) {
          for (const oppColor of state.activeOrder) {
            if (oppColor === activeColor) continue;
            for (const opp of state.tokens[oppColor]) {
              const oppIdx = getGlobalTrackIndex(oppColor, opp.progress);
              if (oppIdx === targetTrackIdx) {
                score += 140; // Capturing opponent!
              }
            }
          }
        }

        // Landing on a safe star
        if (SAFE_TRACK_INDICES.has(targetTrackIdx)) {
          score += 55;
        }

        // Leaving a safe square can be risky if opponents are behind
        if (SAFE_TRACK_INDICES.has(currentTrackIdx)) {
          score -= 12;
        }

        // Check if currently in danger (opponent within 1..6 steps behind)
        if (!SAFE_TRACK_INDICES.has(currentTrackIdx)) {
          for (const oppColor of state.activeOrder) {
            if (oppColor === activeColor) continue;
            for (const opp of state.tokens[oppColor]) {
              const oppIdx = getGlobalTrackIndex(oppColor, opp.progress);
              if (oppIdx !== null) {
                const dist = (currentTrackIdx - oppIdx + 52) % 52;
                if (dist >= 1 && dist <= 6) {
                  score += 35; // Escape danger!
                }
              }
            }
          }
        }

        // Prefer advancing front-running tokens slightly
        score += targetProgress * 0.6;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  return bestId;
}

export function buildComputerPlayers(
  humanCount: 1 | 2 | 3,
  aiCount: 1 | 2 | 3,
  humanNames: string[]
): PlayerConfig[] {
  const safeHumans = Math.max(1, Math.min(3, humanCount));
  const safeAi = Math.max(1, Math.min(4 - safeHumans, aiCount));
  const total = safeHumans + safeAi;

  const chosenColors: PlayerColor[] =
    total === 2
      ? ['red', 'yellow']
      : total === 3
        ? ['red', 'green', 'yellow']
        : ['red', 'green', 'yellow', 'blue'];

  // Spread 2 humans across opposite corners on a 4-player board
  const humanIndices =
    safeHumans === 1
      ? [0]
      : safeHumans === 2
        ? total === 4
          ? [0, 2]
          : [0, 1]
        : [0, 1, 2];

  return chosenColors.map((color, idx) => {
    const humanSlot = humanIndices.indexOf(idx);
    const isHuman = humanSlot !== -1;
    return {
      color,
      name: isHuman
        ? (humanNames[humanSlot]?.trim() || `Player ${humanSlot + 1}`)
        : `Bot ${COLOR_LABELS[color].split(' ')[0]}`,
      isAI: !isHuman,
      isActive: true,
    };
  });
}
