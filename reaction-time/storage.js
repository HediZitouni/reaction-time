import AsyncStorage from "@react-native-async-storage/async-storage";

const LEGACY_BEST_SCORE_KEY = "@reaction-time/best-score";
const STATS_KEY = "@reaction-time/stats";

export const STAT_KEYS = {
  RECORD: "record",
  GAMES_PLAYED: "gamesPlayed",
  FALSE_STARTS: "falseStarts",
  AVERAGE: "average",
  MEDIAN: "median",
  WORST: "worst",
};

const TIME_STAT_KEYS = new Set([
  STAT_KEYS.GAMES_PLAYED,
  STAT_KEYS.AVERAGE,
  STAT_KEYS.MEDIAN,
  STAT_KEYS.WORST,
]);

export function createDefaultStats() {
  return { record: null, falseStarts: 0, times: [] };
}

function normalizeTimes(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((value) => Math.round(Number(value)))
    .filter((value) => Number.isFinite(value) && value >= 0);
}

function normalizeRecord(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const record = Math.round(Number(raw));
  return Number.isFinite(record) && record >= 0 ? record : null;
}

export function normalizeStats(raw) {
  if (!raw || typeof raw !== "object") return createDefaultStats();
  const falseStarts = Number.isFinite(raw.falseStarts)
    ? Math.max(0, Math.floor(raw.falseStarts))
    : 0;
  const times = normalizeTimes(raw.times);
  const record = normalizeRecord(raw.record);
  return { record, falseStarts, times };
}

export function getGamesPlayed(stats) {
  return stats?.times?.length ?? 0;
}

export function computeAverage(stats) {
  if (!stats?.times?.length) return null;
  const totalMs = stats.times.reduce((sum, time) => sum + time, 0);
  return Math.round(totalMs / stats.times.length);
}

export function computeMedian(stats) {
  if (!stats?.times?.length) return null;
  const sorted = [...stats.times].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function computeWorst(stats) {
  if (!stats?.times?.length) return null;
  return Math.max(...stats.times);
}

async function saveStats(stats) {
  const normalized = normalizeStats(stats);
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return null;
  }
}

async function migrateLegacyBestScore(stats) {
  try {
    const legacyValue = await AsyncStorage.getItem(LEGACY_BEST_SCORE_KEY);
    if (legacyValue === null || legacyValue === "") return stats;

    const legacyRecord = normalizeRecord(legacyValue);
    await AsyncStorage.removeItem(LEGACY_BEST_SCORE_KEY);
    if (legacyRecord === null) return stats;

    if (stats.record === null || legacyRecord < stats.record) {
      return { ...stats, record: legacyRecord };
    }
    return stats;
  } catch {
    return stats;
  }
}

export async function loadStats() {
  try {
    const value = await AsyncStorage.getItem(STATS_KEY);
    let stats = value ? normalizeStats(JSON.parse(value)) : createDefaultStats();
    const migrated = await migrateLegacyBestScore(stats);
    if (migrated !== stats) {
      const saved = await saveStats(migrated);
      return saved ?? migrated;
    }
    return stats;
  } catch {
    return createDefaultStats();
  }
}

export async function loadBestScore() {
  const stats = await loadStats();
  return stats.record;
}

export async function saveBestScore(score) {
  const rounded = Math.round(score);
  if (!Number.isFinite(rounded) || rounded < 0) return false;

  const stats = await loadStats();
  if (stats.record !== null && rounded >= stats.record) return false;

  const saved = await saveStats({ ...stats, record: rounded });
  return saved !== null;
}

export async function clearPersistedBestScore() {
  const stats = await loadStats();
  const saved = await saveStats({ ...stats, record: null });
  if (saved === null) return false;

  try {
    await AsyncStorage.removeItem(LEGACY_BEST_SCORE_KEY);
    return true;
  } catch {
    return false;
  }
}

export async function recordValidGame(score) {
  const rounded = Math.round(score);
  if (!Number.isFinite(rounded) || rounded < 0) return null;

  const stats = await loadStats();
  const record =
    stats.record === null ? rounded : Math.min(stats.record, rounded);
  const next = {
    ...stats,
    record,
    times: [...stats.times, rounded],
  };
  const saved = await saveStats(next);
  return saved ?? next;
}

export async function recordFalseStart() {
  const stats = await loadStats();
  const next = {
    ...stats,
    falseStarts: stats.falseStarts + 1,
  };
  const saved = await saveStats(next);
  return saved ?? next;
}

export async function resetStat(statKey) {
  const stats = await loadStats();

  if (statKey === STAT_KEYS.RECORD) {
    const saved = await saveStats({ ...stats, record: null });
    if (saved === null) return null;
    try {
      await AsyncStorage.removeItem(LEGACY_BEST_SCORE_KEY);
    } catch {
      // Ignore legacy cleanup errors once unified stats are saved.
    }
    return { stats: saved };
  }

  if (TIME_STAT_KEYS.has(statKey)) {
    const saved = await saveStats({ ...stats, times: [] });
    return saved ? { stats: saved } : null;
  }

  if (statKey === STAT_KEYS.FALSE_STARTS) {
    const saved = await saveStats({ ...stats, falseStarts: 0 });
    return saved ? { stats: saved } : null;
  }

  return null;
}

export async function resetAllStats() {
  const saved = await saveStats(createDefaultStats());
  if (saved === null) return null;

  try {
    await AsyncStorage.removeItem(LEGACY_BEST_SCORE_KEY);
  } catch {
    // Ignore legacy cleanup errors once unified stats are saved.
  }

  return saved;
}
