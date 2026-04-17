import { buildApiUrl } from "./config";
import type { AttendanceStatus, AttendanceUpdateResponse, Match, Player } from "./types";

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) {
      return "";
    }

    try {
      const parsed = JSON.parse(text) as { error?: string };
      return parsed.error ?? text;
    } catch {
      return text;
    }
  } catch {
    return "";
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), init);

  if (!response.ok) {
    const errorMessage = await readErrorMessage(response);
    throw new Error(errorMessage || `Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export async function fetchPlayers(): Promise<Player[]> {
  const players = await requestJson<Player[]>("/api/Players");
  return players.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchMatches(playerId: number): Promise<Match[]> {
  return requestJson<Match[]>(`/api/Matches?playerId=${playerId}`);
}

export async function updateAttendance(
  matchId: number,
  playerId: number,
  status: Exclude<AttendanceStatus, "Maybe">
): Promise<AttendanceUpdateResponse> {
  return requestJson<AttendanceUpdateResponse>(
    `/api/Matches/${matchId}/players/${playerId}/attendance?status=${status}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
