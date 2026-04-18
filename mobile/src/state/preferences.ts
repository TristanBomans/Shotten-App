import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReleaseScope } from "../lib/types";

const KEYS = {
  hapticFeedback: "shotten.mobile.hapticFeedback",
  showFullNames: "shotten.mobile.showFullNames",
  defaultLeague: "shotten.mobile.defaultLeague",
  releaseScope: "shotten.mobile.releaseScope",
} as const;

export interface Preferences {
  hapticFeedback: boolean;
  showFullNames: boolean;
  defaultLeague: string;
  releaseScope: ReleaseScope;
}

export const DEFAULT_PREFERENCES: Preferences = {
  hapticFeedback: true,
  showFullNames: true,
  defaultLeague: "",
  releaseScope: "stable",
};

export function normalizeReleaseScope(value: string | null | undefined): ReleaseScope {
  return value === "all" ? "all" : "stable";
}

export async function getPreferences(): Promise<Preferences> {
  const [haptic, fullNames, league, releaseScope] = await Promise.all([
    AsyncStorage.getItem(KEYS.hapticFeedback),
    AsyncStorage.getItem(KEYS.showFullNames),
    AsyncStorage.getItem(KEYS.defaultLeague),
    AsyncStorage.getItem(KEYS.releaseScope),
  ]);

  return {
    hapticFeedback: haptic === null ? DEFAULT_PREFERENCES.hapticFeedback : haptic === "true",
    showFullNames: fullNames === null ? DEFAULT_PREFERENCES.showFullNames : fullNames === "true",
    defaultLeague: league ?? DEFAULT_PREFERENCES.defaultLeague,
    releaseScope: normalizeReleaseScope(releaseScope),
  };
}

export async function setHapticFeedback(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.hapticFeedback, value.toString());
}

export async function setShowFullNames(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.showFullNames, value.toString());
}

export async function setDefaultLeague(value: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.defaultLeague, value);
}

export async function clearDefaultLeague(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.defaultLeague);
}

export async function setReleaseScope(value: ReleaseScope): Promise<void> {
  await AsyncStorage.setItem(KEYS.releaseScope, value);
}
