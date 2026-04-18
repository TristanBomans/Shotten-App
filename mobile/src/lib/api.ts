import { buildApiUrl } from "./config";
import type {
  AttendanceStatus,
  AttendanceUpdateResponse,
  Match,
  Player,
  Team,
  ScraperTeam,
  ScraperPlayer,
  ScraperMatch,
  VersionInfo,
} from "./types";

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

// =============================================================================
// PLAYERS
// =============================================================================

export async function fetchPlayers(): Promise<Player[]> {
  const players = await requestJson<Player[]>("/api/Players");
  return players.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createPlayer(name: string, teamIds: number[] = []): Promise<Player> {
  return requestJson<Player>("/api/Players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, teamIds }),
  });
}

export async function updatePlayer(id: number, data: { name: string; teamIds: number[] }): Promise<Player> {
  return requestJson<Player>(`/api/Players/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deletePlayer(id: number): Promise<void> {
  const response = await fetch(buildApiUrl(`/api/Players/${id}`), {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete player");
  }
}

// =============================================================================
// TEAMS
// =============================================================================

export async function fetchTeams(): Promise<Team[]> {
  return requestJson<Team[]>("/api/Teams");
}

// =============================================================================
// MATCHES
// =============================================================================

export async function fetchMatches(playerId: number): Promise<Match[]> {
  return requestJson<Match[]>(`/api/Matches?playerId=${playerId}`);
}

export async function updateAttendance(
  matchId: number,
  playerId: number,
  status: AttendanceStatus
): Promise<AttendanceUpdateResponse> {
  return requestJson<AttendanceUpdateResponse>(
    `/api/Matches/${matchId}/players/${playerId}/attendance?status=${status}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

// =============================================================================
// SCRAPER (LZV)
// =============================================================================

export async function fetchScraperTeams(): Promise<ScraperTeam[]> {
  return requestJson<ScraperTeam[]>("/api/lzv/stats");
}

export async function fetchScraperTeamById(externalId: number): Promise<ScraperTeam | null> {
  try {
    return await requestJson<ScraperTeam>(`/api/lzv/team/${externalId}`);
  } catch {
    return null;
  }
}

export async function fetchScraperPlayers(): Promise<ScraperPlayer[]> {
  return requestJson<ScraperPlayer[]>("/api/lzv/players");
}

export async function fetchScraperPlayersByTeam(teamId: number): Promise<ScraperPlayer[]> {
  try {
    return await requestJson<ScraperPlayer[]>(`/api/lzv/players?teamId=${teamId}`);
  } catch {
    return [];
  }
}

export async function fetchScraperTeamMatches(teamId: number): Promise<ScraperMatch[]> {
  try {
    return await requestJson<ScraperMatch[]>(`/api/lzv/matches?teamId=${teamId}`);
  } catch {
    return [];
  }
}

// =============================================================================
// VERSION INFO
// =============================================================================

export async function fetchVersionInfo(): Promise<VersionInfo | null> {
  try {
    // Fetch from the PWA's version.json 
    const response = await fetch("https://shotten.taltiko.com/version.json", {
      headers: { "Cache-Control": "no-cache" },
    });
    if (!response.ok) return null;
    return (await response.json()) as VersionInfo;
  } catch {
    return null;
  }
}
