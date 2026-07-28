const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PHASE,
  getPartyLayout,
  getPartyZoneOrientation,
  getPlayerIndexFromTouch,
  computePartyRankings,
  createPartyState,
  applyTouchStarts,
  applyTouchReleases,
  applyZoneTouchStart,
  applyZoneTouchRelease,
  applyLobbyPresses,
  beginPartyWaiting,
  beginPartyGo,
  getZoneCenter,
  allPlayersReady,
  allPlayersDone,
} = require("./gameLogic");

const PAD = { width: 400, height: 800 };

function touch(id, playerIndex, layout, playerCount = 6) {
  const { x, y } = getZoneCenter(playerIndex, PAD, layout);
  return { id, x, y };
}

function readyAllPlayers(state, layout) {
  let next = state;
  for (let playerIndex = 0; playerIndex < state.playerCount; playerIndex++) {
    const point = touch(playerIndex, playerIndex, layout, state.playerCount);
    next = applyTouchStarts(next, [point], PAD, layout);
  }
  return next;
}

test("getPartyLayout uses horizontal bands", () => {
  assert.deepEqual(getPartyLayout(2).rows, [[0], [1]]);
  assert.deepEqual(getPartyLayout(3).rows, [[0], [1], [2]]);
  assert.deepEqual(getPartyLayout(6).rows, [
    [0, 1],
    [2, 3],
    [4, 5],
  ]);
  assert.deepEqual(getPartyLayout(10).rows, [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
    [8, 9],
  ]);
});

test("getPlayerIndexFromTouch maps each zone in a 6-player grid", () => {
  const layout = getPartyLayout(6);
  for (let playerIndex = 0; playerIndex < 6; playerIndex++) {
    const { x, y } = getZoneCenter(playerIndex, PAD, layout);
    assert.equal(
      getPlayerIndexFromTouch(x, y, PAD.width, PAD.height, layout),
      playerIndex
    );
  }
});

test("computePartyRankings orders valid scores then fouls", () => {
  const rankings = computePartyRankings(
    [220, 180, null, 200],
    [false, false, true, false],
    4
  );
  assert.deepEqual(rankings, [3, 1, 4, 2]);
});

test("computePartyRankings ties only on identical scores", () => {
  const rankings = computePartyRankings(
    [200, 200, 210],
    [false, false, false],
    3
  );
  assert.deepEqual(rankings, [1, 1, 3]);
});

test("computePartyRankings returns empty ranks when everyone fouled", () => {
  const rankings = computePartyRankings(
    [null, null],
    [true, true],
    2
  );
  assert.deepEqual(rankings, [null, null]);
});

test("lobby touch start marks players ready one by one", () => {
  const layout = getPartyLayout(4);
  let state = createPartyState(4);

  const firstFinger = touch(1, 0, layout);
  state = applyTouchStarts(state, [firstFinger], PAD, layout);
  assert.deepEqual(state.started, [true, false, false, false]);
  assert.equal(state.phase, PHASE.IDLE);

  const thirdFinger = touch(2, 2, layout);
  state = applyTouchStarts(state, [thirdFinger], PAD, layout);
  assert.deepEqual(state.started, [true, false, true, false]);
});

test("lobby simultaneous touch start starts waiting once", () => {
  const layout = getPartyLayout(6);
  let state = createPartyState(6);

  const fingers = Array.from({ length: 6 }, (_, playerIndex) =>
    touch(playerIndex, playerIndex, layout)
  );
  state = applyTouchStarts(state, fingers, PAD, layout);

  assert.equal(state.phase, PHASE.WAITING);
  assert.equal(state.activeTouches.size, 0);
  assert.equal(allPlayersReady(state.started), false);
});

test("waiting touch start fouls immediately", () => {
  const layout = getPartyLayout(6);
  let state = createPartyState(6);
  state = readyAllPlayers(state, layout);

  state = applyTouchStarts(state, [touch(10, 0, layout)], PAD, layout);
  assert.equal(state.phase, PHASE.WAITING);
  assert.equal(state.fouls[0], true);
});

test("waiting release does not foul", () => {
  const layout = getPartyLayout(6);
  let state = createPartyState(6);
  state = readyAllPlayers(state, layout);

  const finger = touch(10, 2, layout);
  state = applyTouchStarts(state, [finger], PAD, layout);
  assert.equal(state.fouls[2], true);

  state = applyTouchReleases(state, [finger]);
  assert.equal(state.fouls[2], true);
  assert.equal(state.activeTouches.size, 0);
});

test("six fingers held during waiting foul on press, not on release", () => {
  const layout = getPartyLayout(6);
  let state = createPartyState(6);
  state = readyAllPlayers(state, layout);

  const fingers = Array.from({ length: 6 }, (_, playerIndex) =>
    touch(playerIndex, playerIndex, layout)
  );

  state = applyTouchStarts(state, fingers, PAD, layout);
  assert.deepEqual(state.fouls, [true, true, true, true, true, true]);
  assert.equal(state.activeTouches.size, 6);
});

test("pressing one of six waiting fingers fouls only that player", () => {
  const layout = getPartyLayout(6);
  let state = createPartyState(6);
  state = readyAllPlayers(state, layout);

  state = applyTouchStarts(state, [touch(0, 0, layout)], PAD, layout);

  assert.deepEqual(state.fouls, [true, false, false, false, false, false]);
});

test("go phase scores only on press", () => {
  const layout = getPartyLayout(4);
  let state = createPartyState(4);
  state = readyAllPlayers(state, layout);
  beginPartyGo(state, 1000);

  const finger = touch(1, 0, layout);
  state = applyTouchStarts(state, [finger], PAD, layout, 1180);
  assert.equal(state.scores[0], 180);

  state = applyTouchReleases(state, [finger]);
  assert.equal(state.scores[0], 180);
});

test("go phase ignores press without go timestamp", () => {
  const layout = getPartyLayout(2);
  let state = createPartyState(2);
  state = readyAllPlayers(state, layout);

  const finger = touch(1, 0, layout);
  state = applyTouchStarts(state, [finger], PAD, layout, 1500);
  assert.equal(state.scores[0], null);
});

test("round finishes when every player either scored or fouled", () => {
  const layout = getPartyLayout(3);
  let state = createPartyState(3);
  state = readyAllPlayers(state, layout);

  state = applyTouchStarts(state, [touch(2, 1, layout)], PAD, layout);
  beginPartyGo(state, 1000);

  state = applyTouchStarts(
    state,
    [touch(1, 0, layout)],
    PAD,
    layout,
    1100
  );
  assert.equal(state.phase, PHASE.GO);

  state = applyTouchStarts(
    state,
    [touch(3, 2, layout)],
    PAD,
    layout,
    1250
  );

  assert.equal(state.phase, PHASE.RESULT);
  assert.deepEqual(state.scores, [100, null, 250]);
  assert.deepEqual(state.fouls, [false, true, false]);
  assert.deepEqual(state.rankings, [1, 3, 2]);
});

test("beginPartyWaiting clears active touches", () => {
  const layout = getPartyLayout(4);
  let state = createPartyState(4);
  const finger = touch(1, 0, layout);
  state = applyTouchStarts(state, [finger], PAD, layout);
  assert.equal(state.activeTouches.size, 1);

  applyLobbyPresses(state, [0, 1, 2, 3]);
  assert.equal(state.phase, PHASE.WAITING);
  assert.equal(state.activeTouches.size, 0);
});

test("duplicate foul on same player is ignored", () => {
  const layout = getPartyLayout(4);
  let state = createPartyState(4);
  state = readyAllPlayers(state, layout);

  const finger = touch(1, 0, layout);
  state = applyTouchStarts(state, [finger], PAD, layout);
  state = applyTouchStarts(state, [finger], PAD, layout);

  assert.deepEqual(
    state.fouls.filter(Boolean).length,
    1
  );
});

test("only one zone touch is tracked per player", () => {
  const layout = getPartyLayout(4);
  let state = createPartyState(4);
  state = readyAllPlayers(state, layout);

  state = applyTouchStarts(
    state,
    [touch(1, 0, layout), touch(2, 0, layout)],
    PAD,
    layout
  );

  assert.equal(state.activeTouches.size, 1);
  assert.equal(state.fouls[0], true);
});

test("getPartyZoneOrientation faces edges correctly", () => {
  const layout6 = getPartyLayout(6);
  assert.equal(getPartyZoneOrientation(0, 0, layout6), "top");
  assert.equal(getPartyZoneOrientation(0, 1, layout6), "top");
  assert.equal(getPartyZoneOrientation(1, 0, layout6), "left");
  assert.equal(getPartyZoneOrientation(1, 1, layout6), "right");
  assert.equal(getPartyZoneOrientation(2, 0, layout6), "bottom");
  assert.equal(getPartyZoneOrientation(2, 1, layout6), "bottom");

  const layout3 = getPartyLayout(3);
  assert.equal(getPartyZoneOrientation(1, 0, layout3), "left");
});

test("placing fingers in order 1,2,4,3 during waiting fouls each on press", () => {
  const layout = getPartyLayout(4);
  let state = createPartyState(4);
  state = readyAllPlayers(state, layout);

  state = applyZoneTouchStart(state, 0, 1);
  state = applyZoneTouchStart(state, 1, 2);
  state = applyZoneTouchStart(state, 3, 4);
  state = applyZoneTouchStart(state, 2, 3);

  assert.deepEqual(state.fouls, [true, true, true, true]);
  assert.equal(state.activeTouches.size, 4);
});

test("only the player who presses during waiting is fouled", () => {
  const layout = getPartyLayout(4);
  let state = createPartyState(4);
  state = readyAllPlayers(state, layout);

  state = applyZoneTouchStart(state, 0, 1);

  assert.deepEqual(state.fouls, [true, false, false, false]);
});

test("zone release clears tracking without fouling", () => {
  const layout = getPartyLayout(4);
  let state = createPartyState(4);
  state = readyAllPlayers(state, layout);

  state = applyZoneTouchStart(state, 0, 1);
  state = applyZoneTouchRelease(state, 0, 1);

  assert.equal(state.fouls[0], true);
  assert.equal(state.activeTouches.size, 0);
  assert.equal(state.zoneArmed[0], false);
});

test("touch cancel clears visual but does not add extra fouls", () => {
  const layout = getPartyLayout(6);
  let state = createPartyState(6);
  state = readyAllPlayers(state, layout);

  for (let i = 0; i < 6; i++) {
    state = applyZoneTouchStart(state, i, i + 1);
  }
  assert.deepEqual(state.zoneArmed, [true, true, true, true, true, true]);

  for (let i = 0; i < 4; i++) {
    state = applyZoneTouchRelease(state, i, i + 1);
  }
  assert.deepEqual(state.fouls, [true, true, true, true, true, true]);
  assert.equal(state.activeTouches.size, 2);
});

test("re-pressing after touch cancel during waiting does not double foul", () => {
  const layout = getPartyLayout(6);
  let state = createPartyState(6);
  state = readyAllPlayers(state, layout);

  state = applyZoneTouchStart(state, 0, 1);
  state = applyZoneTouchRelease(state, 0, 1);
  state = applyZoneTouchStart(state, 0, 2);

  assert.equal(state.fouls.filter(Boolean).length, 1);
  assert.equal(state.activeTouches.get(2), 0);
});
