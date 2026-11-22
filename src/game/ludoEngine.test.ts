import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDiceRoll,
  applyTokenMove,
  buildComputerPlayers,
  chooseBestAiMove,
  createInitialGameState,
  getCurrentPlayerColor,
  getGlobalTrackIndex,
  getTokenBoardCoord,
  getValidTokenIds,
} from './ludoEngine';

test('board coordinates align symmetrically across all 4 colors', () => {
  assert.deepEqual(getTokenBoardCoord('red', 0, 0), [6, 1]);
  assert.deepEqual(getTokenBoardCoord('green', 0, 0), [1, 8]);
  assert.deepEqual(getTokenBoardCoord('yellow', 0, 0), [8, 13]);
  assert.deepEqual(getTokenBoardCoord('blue', 0, 0), [13, 6]);

  assert.deepEqual(getTokenBoardCoord('red', 0, 50), [7, 0]);
  assert.deepEqual(getTokenBoardCoord('red', 0, 51), [7, 1]);
  assert.deepEqual(getTokenBoardCoord('green', 0, 50), [0, 7]);
  assert.deepEqual(getTokenBoardCoord('green', 0, 51), [1, 7]);
  assert.deepEqual(getTokenBoardCoord('yellow', 0, 50), [7, 14]);
  assert.deepEqual(getTokenBoardCoord('yellow', 0, 51), [7, 13]);
  assert.deepEqual(getTokenBoardCoord('blue', 0, 50), [14, 7]);
  assert.deepEqual(getTokenBoardCoord('blue', 0, 51), [13, 7]);
});

test('buildComputerPlayers supports 1-3 humans and 1-3 AI seats cleanly', () => {
  const oneVsThree = buildComputerPlayers(1, 3, ['Rajiv']);
  assert.equal(oneVsThree.length, 4);
  assert.equal(oneVsThree.filter((p) => !p.isAI).length, 1);
  assert.equal(oneVsThree.filter((p) => p.isAI).length, 3);

  const threeVsOne = buildComputerPlayers(3, 1, ['Rajiv', 'Amit', 'Priya']);
  assert.equal(threeVsOne.length, 4);
  assert.equal(threeVsOne.filter((p) => !p.isAI).length, 3);
  assert.equal(threeVsOne.filter((p) => p.isAI).length, 1);

  const twoVsOne = buildComputerPlayers(2, 1, ['Rajiv', 'Amit']);
  assert.equal(twoVsOne.length, 3);
  assert.equal(twoVsOne.filter((p) => !p.isAI).length, 2);
  assert.equal(twoVsOne.filter((p) => p.isAI).length, 1);

  const oneVsOne = buildComputerPlayers(1, 1, ['Rajiv']);
  assert.equal(oneVsOne.length, 2);
  assert.deepEqual(oneVsOne.map((p) => p.color), ['red', 'yellow']);
});

test('rolling < 6 with all tokens in yard skips turn', () => {
  const players = buildComputerPlayers(1, 3, ['Rajiv']);
  const state = createInitialGameState('computer', players);
  assert.equal(getCurrentPlayerColor(state), 'red');

  const rolled = applyDiceRoll(state, 4);
  assert.equal(rolled.validTokenIds.length, 0);
  assert.equal(rolled.turnPhase, 'waiting_roll');
  assert.equal(getCurrentPlayerColor(rolled), 'green');
});

test('rolling 6 unlocks yard token and grants bonus roll', () => {
  const players = buildComputerPlayers(2, 1, ['Rajiv', 'Amit']);
  const state = createInitialGameState('computer', players);

  const rolled = applyDiceRoll(state, 6);
  assert.deepEqual(rolled.validTokenIds, [0, 1, 2, 3]);
  assert.equal(rolled.turnPhase, 'selecting_token');

  const move = applyTokenMove(rolled, 0);
  assert.equal(move.nextState.tokens.red[0].progress, 0);
  assert.equal(move.grantedBonusRoll, true);
  assert.equal(getCurrentPlayerColor(move.nextState), 'red');
});

test('three consecutive 6s forfeits turn', () => {
  const players = buildComputerPlayers(1, 3, ['Rajiv']);
  let state = createInitialGameState('computer', players);
  state.tokens.red[0].progress = 5;

  state = applyDiceRoll(state, 6);
  state = applyTokenMove(state, 0).nextState;
  assert.equal(state.consecutiveSixes, 1);

  state = applyDiceRoll(state, 6);
  state = applyTokenMove(state, 0).nextState;
  assert.equal(state.consecutiveSixes, 2);

  state = applyDiceRoll(state, 6);
  assert.equal(getCurrentPlayerColor(state), 'green');
  assert.equal(state.consecutiveSixes, 0);
});

test('capturing opponent on non-safe tile sends opponent to yard and grants bonus roll', () => {
  const players = buildComputerPlayers(1, 3, ['Rajiv']);
  let state = createInitialGameState('computer', players);

  state.tokens.red[0].progress = 5;
  state.tokens.green[0].progress = 49;
  assert.equal(getGlobalTrackIndex('green', 49), 10);
  assert.equal(getGlobalTrackIndex('red', 10), 10);

  state = applyDiceRoll(state, 5);
  const res = applyTokenMove(state, 0);
  assert.equal(res.capturedTokens.length, 1);
  assert.equal(res.capturedTokens[0].color, 'green');
  assert.equal(res.nextState.tokens.green[0].progress, -1);
  assert.equal(res.grantedBonusRoll, true);
  assert.equal(res.nextState.capturesCount.red, 1);
});

test('safe star tiles protect opponent tokens from capture', () => {
  const players = buildComputerPlayers(1, 3, ['Rajiv']);
  let state = createInitialGameState('computer', players);

  state.tokens.red[0].progress = 3;
  state.tokens.green[0].progress = 47;

  state = applyDiceRoll(state, 5);
  const res = applyTokenMove(state, 0);
  assert.equal(res.landedOnSafe, true);
  assert.equal(res.capturedTokens.length, 0);
  assert.equal(res.nextState.tokens.green[0].progress, 47);
});

test('exact roll required to reach Home (56) and winning triggers finished phase', () => {
  const players = buildComputerPlayers(1, 2, ['Rajiv']);
  let state = createInitialGameState('computer', players);
  state.tokens.red[0].progress = 56;
  state.tokens.red[1].progress = 56;
  state.tokens.red[2].progress = 56;
  state.tokens.red[3].progress = 54;

  const validFor4 = getValidTokenIds(state.tokens.red, 4);
  assert.deepEqual(validFor4, []);

  state = applyDiceRoll(state, 2);
  const res = applyTokenMove(state, 3);
  assert.equal(res.reachedHome, true);
  assert.equal(res.nextState.winners[0], 'red');
});

test('AI prefers capturing an opponent when available', () => {
  const players = buildComputerPlayers(1, 3, ['Rajiv']);
  let state = createInitialGameState('computer', players);
  state.tokens.red[0].progress = 5;
  state.tokens.red[1].progress = 12;
  state.tokens.green[0].progress = 49;

  state = applyDiceRoll(state, 5);
  const bestId = chooseBestAiMove(state);
  assert.equal(bestId, 0);
});
