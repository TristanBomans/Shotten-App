import AsyncStorage from "@react-native-async-storage/async-storage";

const PLAYER_SESSION_KEY = "shotten.mobile.player-session";

export interface PlayerSession {
  playerId: number;
  playerName: string;
}

export async function getPlayerSession(): Promise<PlayerSession | null> {
  const value = await AsyncStorage.getItem(PLAYER_SESSION_KEY);
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PlayerSession>;
    if (typeof parsed.playerId !== "number" || typeof parsed.playerName !== "string") {
      return null;
    }

    return {
      playerId: parsed.playerId,
      playerName: parsed.playerName
    };
  } catch {
    return null;
  }
}

export async function setPlayerSession(session: PlayerSession): Promise<void> {
  await AsyncStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(session));
}

export async function clearPlayerSession(): Promise<void> {
  await AsyncStorage.removeItem(PLAYER_SESSION_KEY);
}
