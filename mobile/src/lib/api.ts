import { buildApiUrl } from "./config";
import type {
  AttendanceStatus,
  AttendanceUpdateResponse,
  GithubRelease,
  Match,
  Player,
  ScraperMatch,
  ScraperPlayer,
  ScraperTeam,
  Team,
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

interface GithubReleaseApiAsset {
  name: string;
  content_type?: string;
  browser_download_url?: string;
}

interface GithubReleaseApiItem {
  tag_name?: string;
  name?: string;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string | null;
  assets?: GithubReleaseApiAsset[];
}

function mapGithubRelease(raw: GithubReleaseApiItem): GithubRelease | null {
  if (!raw.tag_name || !raw.html_url) {
    return null;
  }

  const assets = (raw.assets ?? [])
    .filter((asset): asset is Required<Pick<GithubReleaseApiAsset, "name" | "browser_download_url">> & GithubReleaseApiAsset => {
      return Boolean(asset.name && asset.browser_download_url);
    })
    .map((asset) => ({
      name: asset.name,
      contentType: asset.content_type ?? "",
      browserDownloadUrl: asset.browser_download_url,
    }));

  return {
    tagName: raw.tag_name,
    name: raw.name ?? raw.tag_name,
    htmlUrl: raw.html_url,
    draft: Boolean(raw.draft),
    prerelease: Boolean(raw.prerelease),
    publishedAt: raw.published_at ?? null,
    assets,
  };
}

export async function fetchGithubReleases(limit = 20): Promise<GithubRelease[] | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/TristanBomans/Shotten-App/releases?per_page=${limit}`, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as GithubReleaseApiItem[];
    if (!Array.isArray(payload)) {
      return null;
    }

    return payload
      .map(mapGithubRelease)
      .filter((release): release is GithubRelease => release !== null);
  } catch {
    return null;
  }
}
