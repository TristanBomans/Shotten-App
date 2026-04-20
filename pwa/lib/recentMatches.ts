import { parseDateToTimestamp } from './dateUtils';
import { isSameTeamName } from './teamNameMatching';

export const OWN_RECENT_TEAM_IDS = [1319, 2002] as const;
export const OWN_RECENT_TEAMS: Record<number, string> = {
    1319: 'Wille ma ni kunne',
    2002: 'FC Degradé',
};
export const RECENT_MATCH_WINDOW_MS = 72 * 60 * 60 * 1000;
export const RECENT_MATCH_LIMIT = 5;

export type RecentMatchResult = 'W' | 'L' | 'D';

export interface RecentMatchSource {
    external_id: string;
    date: string;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    location?: string | null;
    team_id: number;
    status: 'Scheduled' | 'Played' | 'Postponed';
}

export interface RecentMatchItem {
    externalId: string;
    date: string;
    teamId: number;
    teamName: string;
    opponent: string;
    homeTeam: string;
    awayTeam: string;
    location?: string;
    teamScore: number;
    opponentScore: number;
    scoreline: string;
    result: RecentMatchResult;
    isRecent: boolean;
}

export interface RecentMatchesResponse {
    matches: RecentMatchItem[];
    recentCount: number;
    hasRecentWithin3Days: boolean;
}

export function buildRecentMatchItem(match: RecentMatchSource, nowTs = Date.now()): RecentMatchItem {
    const teamName = OWN_RECENT_TEAMS[match.team_id] ?? match.home_team;
    const isHome = isSameTeamName(match.home_team, teamName);
    const teamScore = isHome ? match.home_score : match.away_score;
    const opponentScore = isHome ? match.away_score : match.home_score;
    const result: RecentMatchResult = teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'D';
    const matchTs = parseDateToTimestamp(match.date);

    return {
        externalId: match.external_id,
        date: match.date,
        teamId: match.team_id,
        teamName,
        opponent: isHome ? match.away_team : match.home_team,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        location: match.location ?? undefined,
        teamScore,
        opponentScore,
        scoreline: `${teamScore} - ${opponentScore}`,
        result,
        isRecent: matchTs > 0 && matchTs <= nowTs && nowTs - matchTs <= RECENT_MATCH_WINDOW_MS,
    };
}
