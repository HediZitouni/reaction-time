export const PHASE = {
  IDLE: "idle",
  WAITING: "waiting",
  GO: "go",
  RESULT: "result",
};

export function createPlayerArray(count, value) {
  return Array.from({ length: count }, () =>
    typeof value === "function" ? value() : value
  );
}

export function getPartyLayout(playerCount) {
  if (playerCount === 2) return { rows: [[0], [1]] };
  if (playerCount === 3) return { rows: [[0], [1], [2]] };

  const cols = 2;
  const rows = [];
  for (let i = 0; i < playerCount; i += cols) {
    const row = [];
    for (let j = 0; j < cols && i + j < playerCount; j++) {
      row.push(i + j);
    }
    rows.push(row);
  }
  return { rows };
}

export function getPartyZoneOrientation(rowIndex, colIndex, layout) {
  const { rows } = layout;
  const rowCount = rows.length;
  const colsInRow = rows[rowIndex].length;

  if (rowIndex === 0) return "top";
  if (rowIndex === rowCount - 1) return "bottom";

  if (colsInRow === 1) return "left";

  return colIndex === 0 ? "left" : "right";
}

export function getPlayerIndexFromTouch(x, y, width, height, layout) {
  const { rows } = layout;
  const clampedX = Math.max(0, Math.min(x, width - 1));
  const clampedY = Math.max(0, Math.min(y, height - 1));
  const rowHeight = height / rows.length;
  const rowIndex = Math.min(Math.floor(clampedY / rowHeight), rows.length - 1);
  const row = rows[rowIndex];
  const colWidth = width / row.length;
  const colIndex = Math.min(Math.floor(clampedX / colWidth), row.length - 1);
  return row[colIndex];
}

export function playerHasActiveTouch(playerId, activeTouches) {
  for (const trackedPlayerId of activeTouches.values()) {
    if (trackedPlayerId === playerId) return true;
  }
  return false;
}

export function computePartyRankings(scores, fouls, playerCount) {
  const rankings = createPlayerArray(playerCount, null);
  const valid = [];
  const fouled = [];
  const pending = [];

  for (let i = 0; i < playerCount; i++) {
    if (fouls[i]) fouled.push(i);
    else if (scores[i] !== null) valid.push({ index: i, score: scores[i] });
    else pending.push(i);
  }

  valid.sort((a, b) => a.score - b.score);

  if (valid.length === 0) {
    return rankings;
  }

  let rank = 1;
  let i = 0;
  while (i < valid.length) {
    let j = i + 1;
    while (j < valid.length && valid[j].score === valid[i].score) j++;
    for (let k = i; k < j; k++) rankings[valid[k].index] = rank;
    rank += j - i;
    i = j;
  }

  for (const index of fouled) {
    rankings[index] = rank;
    rank++;
  }
  for (const index of pending) {
    rankings[index] = rank;
    rank++;
  }

  return rankings;
}

export function allPlayersReady(started) {
  return started.every(Boolean);
}

export function allPlayersDone(scores, fouls) {
  for (let i = 0; i < scores.length; i++) {
    if (!fouls[i] && scores[i] === null) return false;
  }
  return true;
}

export function createPartyState(playerCount) {
  return {
    phase: PHASE.IDLE,
    playerCount,
    started: createPlayerArray(playerCount, false),
    scores: createPlayerArray(playerCount, null),
    fouls: createPlayerArray(playerCount, false),
    rankings: createPlayerArray(playerCount, null),
    activeTouches: new Map(),
    zoneArmed: createPlayerArray(playerCount, false),
    goTimestamp: null,
  };
}

function clonePartyState(state) {
  return {
    ...state,
    started: [...state.started],
    scores: [...state.scores],
    fouls: [...state.fouls],
    rankings: [...state.rankings],
    zoneArmed: [...state.zoneArmed],
    activeTouches: new Map(state.activeTouches),
  };
}

function clearZoneTracking(state) {
  state.activeTouches.clear();
  state.zoneArmed = createPlayerArray(state.playerCount, false);
}

export function recordPartyFoul(state, playerIndex) {
  if (state.fouls[playerIndex] || state.scores[playerIndex] !== null) {
    return false;
  }
  state.fouls[playerIndex] = true;
  return true;
}

export function recordPartyScore(state, playerIndex, now) {
  if (
    state.goTimestamp === null ||
    state.fouls[playerIndex] ||
    state.scores[playerIndex] !== null
  ) {
    return false;
  }
  state.scores[playerIndex] = now - state.goTimestamp;
  return true;
}

export function tryFinishPartyRound(state) {
  if (state.phase !== PHASE.WAITING && state.phase !== PHASE.GO) {
    return false;
  }
  if (!allPlayersDone(state.scores, state.fouls)) {
    return false;
  }
  state.phase = PHASE.RESULT;
  state.rankings = computePartyRankings(
    state.scores,
    state.fouls,
    state.playerCount
  );
  state.started = createPlayerArray(state.playerCount, false);
  return true;
}

export function applyLobbyPresses(state, playerIndices) {
  if (state.phase !== PHASE.IDLE && state.phase !== PHASE.RESULT) {
    return { startedRound: false };
  }

  let changed = false;
  for (const playerIndex of playerIndices) {
    if (state.started[playerIndex]) continue;
    state.started[playerIndex] = true;
    state.fouls[playerIndex] = false;
    state.scores[playerIndex] = null;
    changed = true;
  }

  if (!changed) {
    return { startedRound: false };
  }

  state.rankings = createPlayerArray(state.playerCount, null);

  if (allPlayersReady(state.started)) {
    beginPartyWaiting(state);
    return { startedRound: true };
  }

  return { startedRound: false };
}

export function beginPartyWaiting(state) {
  if (state.phase !== PHASE.IDLE && state.phase !== PHASE.RESULT) {
    return false;
  }
  state.phase = PHASE.WAITING;
  state.goTimestamp = null;
  state.started = createPlayerArray(state.playerCount, false);
  state.scores = createPlayerArray(state.playerCount, null);
  state.fouls = createPlayerArray(state.playerCount, false);
  state.rankings = createPlayerArray(state.playerCount, null);
  clearZoneTracking(state);
  return true;
}

export function beginPartyGo(state, now) {
  if (state.phase !== PHASE.WAITING) {
    return false;
  }
  state.phase = PHASE.GO;
  state.goTimestamp = now;
  return true;
}

export function applyTouchStarts(state, touchPoints, padSize, layout) {
  const next = clonePartyState(state);

  for (const { id, x, y } of touchPoints) {
    const playerIndex = getPlayerIndexFromTouch(
      x,
      y,
      padSize.width,
      padSize.height,
      layout
    );

    if (
      next.phase === PHASE.IDLE ||
      next.phase === PHASE.RESULT ||
      next.phase === PHASE.WAITING ||
      next.phase === PHASE.GO
    ) {
      if (!playerHasActiveTouch(playerIndex, next.activeTouches)) {
        next.activeTouches.set(id, playerIndex);
      }
    }
  }

  tryFinishPartyRound(next);
  return next;
}

export function applyTouchReleases(
  state,
  touchPoints,
  shouldPress,
  padSize,
  layout,
  now = Date.now()
) {
  const next = clonePartyState(state);
  const playerIndices = [];

  for (const { id, x, y } of touchPoints) {
    const tracked = next.activeTouches.get(id);
    next.activeTouches.delete(id);

    if (!shouldPress) continue;

    const playerIndex =
      tracked !== undefined
        ? tracked
        : next.phase === PHASE.WAITING || next.phase === PHASE.GO
          ? getPlayerIndexFromTouch(
              x,
              y,
              padSize.width,
              padSize.height,
              layout
            )
          : null;

    if (playerIndex === null || playerIndex === undefined) continue;
    playerIndices.push(playerIndex);
  }

  if (!shouldPress || playerIndices.length === 0) {
    return next;
  }

  const uniqueIndices = [...new Set(playerIndices)];

  if (next.phase === PHASE.IDLE || next.phase === PHASE.RESULT) {
    applyLobbyPresses(next, uniqueIndices);
    return next;
  }

  for (const playerIndex of uniqueIndices) {
    if (next.phase === PHASE.WAITING) {
      recordPartyFoul(next, playerIndex);
    } else if (next.phase === PHASE.GO) {
      recordPartyScore(next, playerIndex, now);
    }
  }

  tryFinishPartyRound(next);
  return next;
}

function clearPlayerTouches(state, playerIndex) {
  for (const [id, index] of [...state.activeTouches.entries()]) {
    if (index === playerIndex) {
      state.activeTouches.delete(id);
    }
  }
}

function processZoneRelease(state, playerIndex, now) {
  if (!state.zoneArmed[playerIndex]) {
    return false;
  }

  if (state.phase === PHASE.WAITING) {
    recordPartyFoul(state, playerIndex);
    tryFinishPartyRound(state);
  } else if (state.phase === PHASE.GO) {
    recordPartyScore(state, playerIndex, now);
    tryFinishPartyRound(state);
  }

  state.zoneArmed[playerIndex] = false;
  clearPlayerTouches(state, playerIndex);
  return true;
}

export function applyZoneTouchStart(state, playerIndex, touchId) {
  const next = clonePartyState(state);
  const hasTracked = playerHasActiveTouch(playerIndex, next.activeTouches);

  if (hasTracked) {
    return next;
  }

  next.activeTouches.set(touchId, playerIndex);
  if (next.phase === PHASE.WAITING || next.phase === PHASE.GO) {
    next.zoneArmed[playerIndex] = true;
  }
  return next;
}

export function applyZoneTouchRelease(
  state,
  playerIndex,
  touchId,
  shouldPress,
  now = Date.now()
) {
  const next = clonePartyState(state);
  next.activeTouches.delete(touchId);

  if (!shouldPress) {
    return next;
  }

  if (next.phase === PHASE.IDLE || next.phase === PHASE.RESULT) {
    applyLobbyPresses(next, [playerIndex]);
    clearPlayerTouches(next, playerIndex);
    return next;
  }

  processZoneRelease(next, playerIndex, now);
  return next;
}

export function getZoneCenter(playerIndex, padSize, layout) {
  const { rows } = layout;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const colIndex = rows[rowIndex].indexOf(playerIndex);
    if (colIndex === -1) continue;
    const rowHeight = padSize.height / rows.length;
    const colWidth = padSize.width / rows[rowIndex].length;
    return {
      x: colWidth * colIndex + colWidth / 2,
      y: rowHeight * rowIndex + rowHeight / 2,
    };
  }
  throw new Error(`Unknown player index: ${playerIndex}`);
}
