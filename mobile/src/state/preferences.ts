import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  hapticFeedback: "shotten.mobile.hapticFeedback",
  showFullNames: "shotten.mobile.showFullNames",
  defaultLeague: "shotten.mobile.defaultLeague",
} as const;

export interface Preferences {
  hapticFeedback: boolean;
  showFullNames: boolean;
  defaultLeague: string;
}

export const DEFAULT_PREFERENCES: Preferences = {
  hapticFeedback: true,
  showFullNames: true,
  defaultLeague: "",
};

export async function getPreferences(): Promise<Preferences> {
  const [haptic, fullNames, league] = await Promise.all([
    AsyncStorage.getItem(KEYS.hapticFeedback),
    AsyncStorage.getItem(KEYS.showFullNames),
    AsyncStorage.getItem(KEYS.defaultLeague),
  ]);

  return {
    hapticFeedback: haptic === null ? DEFAULT_PREFERENCES.hapticFeedback : haptic === "true",
    showFullNames: fullNames === null ? DEFAULT_PREFERENCES.showFullNames : fullNames === "true",
    defaultLeague: league ?? DEFAULT_PREFERENCES.defaultLeague,
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