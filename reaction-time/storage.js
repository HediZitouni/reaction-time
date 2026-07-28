import AsyncStorage from "@react-native-async-storage/async-storage";

const BEST_SCORE_KEY = "@reaction-time/best-score";

export async function loadBestScore() {
  try {
    const value = await AsyncStorage.getItem(BEST_SCORE_KEY);
    if (value === null || value === "") return null;
    const score = Number(value);
    return Number.isFinite(score) && score >= 0 ? score : null;
  } catch {
    return null;
  }
}

export async function saveBestScore(score) {
  const rounded = Math.round(score);
  if (!Number.isFinite(rounded) || rounded < 0) return false;
  try {
    await AsyncStorage.setItem(BEST_SCORE_KEY, String(rounded));
    return true;
  } catch {
    return false;
  }
}

export async function clearPersistedBestScore() {
  try {
    await AsyncStorage.removeItem(BEST_SCORE_KEY);
    return true;
  } catch {
    return false;
  }
}
