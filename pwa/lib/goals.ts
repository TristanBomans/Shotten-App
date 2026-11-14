// =============================================================================
// GOALS & ASSISTS
// Links app players (core_players) to scraped LZV players (lzv_players) and
// derives goal stats from lzv_player_team_stats and lzv_match_details lineups.
// Pure module: used by the /api/lzv/goals consumer, the mock data and the UI.
// =============================================================================

import type { Match, Player } from './mockData';

/** One LZV player on one of our own LZV teams (lzv_player_team_stats row). */
export interface GoalsLzvTeamStats {
    lzvTeamId: number;
    number: number | null;
    gamesPlayed: number;
    goals: number;
    assists: number;
}

export interface GoalsLzvPlayer {
    /** lzvcup.be player id (lzv_players.external_id, lineup playerId). */
    externalId: number;
    name: string;
    teams: GoalsLzvTeamStats[];
}

export interface GoalsLineupEntry {
    lzvPlayerExternalId: number | null;
    name: string;
    goals: number;
    assists: number;
}

/** Our side of one LZV result page. */
export interface GoalsLineup {
    resultId: number;
    lzvTeamId: number;
    players: GoalsLineupEntry[];
}

export interface GoalsData {
    /** core team id -> LZV team id, for our own LZV-linked teams. */
    teams: { teamId: number; lzvTeamId: number }[];
    lzvPlayers: GoalsLzvPlayer[];
    /** Explicit links set by an admin (core_players.lzv_player_external_id). */
    links: { playerId: number; lzvPlayerExternalId: number }[];
    lineups: GoalsLineup[];
    /** True while migration 009 hasn't been run: only name matching works. */
    linkColumnMissing?: boolean;
}

export const EMPTY_GOALS_DATA: GoalsData = { teams: [], lzvPlayers: [], links: [], lineups: [] };

// -----------------------------------------------------------------------------
// Linking
// -----------------------------------------------------------------------------

export type LzvLinkSource = 'manual' | 'auto';

export interface LzvLink {
    lzvPlayerExternalId: number;
    source: LzvLinkSource;
}

export function normalizePersonName(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function nameTokens(name: string): string[] {
    return normalizePersonName(name).split(' ').filter(Boolean);
}

/**
 * How well an app name matches an LZV name; 0 = no match.
 * 3: same name. 2: same words in another order ("Bomans Tristan").
 * 1: every app word appears in the LZV name ("Tristan" -> "Tristan Bomans").
 */
export function nameMatchScore(appName: string, lzvName: string): number {
    const a = nameTokens(appName);
    const b = nameTokens(lzvName);
    if (a.length === 0 || b.length === 0) return 0;
    if (a.join(' ') === b.join(' ')) return 3;
    const sortedA = [...a].sort().join(' ');
    const sortedB = [...b].sort().join(' ');
    if (sortedA === sortedB) return 2;
    const bSet = new Set(b);
    if (a.every(t => bSet.has(t))) return 1;
    return 0;
}

/**
 * Resolve the LZV player for every app player: an explicit admin link wins;
 * otherwise a unique name match among LZV players of the player's own teams.
 * Ambiguous matches (two candidates, or two app players claiming the same
 * LZV player) stay unlinked rather than guessing.
 */
export function resolveLzvLinks(players: Player[], data: GoalsData): Map<number, LzvLink> {
    const result = new Map<number, LzvLink>();
    const known = new Set(data.lzvPlayers.map(p => p.externalId));
    const claimed = new Set<number>();

    for (const link of data.links) {
        if (!known.has(link.lzvPlayerExternalId)) continue;
        result.set(link.playerId, { lzvPlayerExternalId: link.lzvPlayerExternalId, source: 'manual' });
        claimed.add(link.lzvPlayerExternalId);
    }

    const lzvTeamByCoreTeam = new Map(data.teams.map(t => [t.teamId, t.lzvTeamId]));
    const autoClaims = new Map<number, number[]>();

    for (const player of players) {
        if (result.has(player.id)) continue;
        const playerLzvTeams = new Set(
            player.teamIds.map(id => lzvTeamByCoreTeam.get(id)).filter((id): id is number => id != null)
        );
        // Only guess within the player's own LZV teams; no team, no guess.
        if (playerLzvTeams.size === 0) continue;
        const candidates = data.lzvPlayers.filter(p =>
            !claimed.has(p.externalId)
            && p.teams.some(t => playerLzvTeams.has(t.lzvTeamId))
        );

        let bestScore = 0;
        let best: number[] = [];
        for (const candidate of candidates) {
            const score = nameMatchScore(player.name, candidate.name);
            if (score === 0 || score < bestScore) continue;
            if (score > bestScore) {
                bestScore = score;
                best = [];
            }
            best.push(candidate.externalId);
        }
        if (best.length !== 1) continue;

        const claimants = autoClaims.get(best[0]) ?? [];
        claimants.push(player.id);
        autoClaims.set(best[0], claimants);
    }

    for (const [externalId, claimants] of autoClaims) {
        if (claimants.length !== 1) continue;
        result.set(claimants[0], { lzvPlayerExternalId: externalId, source: 'auto' });
    }

    return result;
}

// -----------------------------------------------------------------------------
// Stats
// -----------------------------------------------------------------------------

export interface PlayerMatchGoals {
    goals: number;
    assists: number;
}

export interface PlayerGoalStats {
    link: LzvLink | null;
    lzvName: string | null;
    goals: number;
    assists: number;
    /** Matches played according to LZV (lineup appearances). */
    gamesPlayed: number;
    goalsPerMatch: number;
    /** core match id -> goals/assists in that match (only when on the lineup). */
    byMatch: Map<number, PlayerMatchGoals>;
}

export interface GoalsIndex {
    byPlayer: Map<number, PlayerGoalStats>;
    /** Whether any linked player has assists: hides the column otherwise. */
    hasAssists: boolean;
    /** Whether there's any LZV data at all for our teams. */
    hasData: boolean;
}

function lineupKey(resultId: number, lzvTeamId: number) {
    return `${resultId}:${lzvTeamId}`;
}

export function buildGoalsIndex(players: Player[], matches: Match[], data: GoalsData): GoalsIndex {
    const links = resolveLzvLinks(players, data);
    const lzvById = new Map(data.lzvPlayers.map(p => [p.externalId, p]));
    const lineups = new Map(data.lineups.map(l => [lineupKey(l.resultId, l.lzvTeamId), l]));
    const lzvTeamByCoreTeam = new Map(data.teams.map(t => [t.teamId, t.lzvTeamId]));

    const byPlayer = new Map<number, PlayerGoalStats>();
    let hasAssists = false;

    for (const player of players) {
        const link = links.get(player.id) ?? null;
        const lzv = link ? lzvById.get(link.lzvPlayerExternalId) : undefined;
        const byMatch = new Map<number, PlayerMatchGoals>();

        if (link) {
            for (const match of matches) {
                const result = match.result;
                if (!result?.resultId || result.teamLzvId == null) continue;
                const lineup = lineups.get(lineupKey(result.resultId, result.teamLzvId));
                const entry = lineup?.players.find(p => p.lzvPlayerExternalId === link.lzvPlayerExternalId);
                if (entry) byMatch.set(match.id, { goals: entry.goals, assists: entry.assists });
            }
        }

        // Season totals come from the LZV team page (complete, includes matches
        // without a scraped result page). Only count our own teams the player
        // belongs to; fall back to lineup sums when the team page has no row.
        const ownLzvTeams = new Set(
            player.teamIds.map(id => lzvTeamByCoreTeam.get(id)).filter((id): id is number => id != null)
        );
        const teamRows = lzv?.teams.filter(t => ownLzvTeams.size === 0 || ownLzvTeams.has(t.lzvTeamId)) ?? [];

        let goals: number;
        let assists: number;
        let gamesPlayed: number;
        if (teamRows.length > 0) {
            goals = teamRows.reduce((sum, t) => sum + t.goals, 0);
            assists = teamRows.reduce((sum, t) => sum + t.assists, 0);
            gamesPlayed = teamRows.reduce((sum, t) => sum + t.gamesPlayed, 0);
        } else {
            const perMatch = [...byMatch.values()];
            goals = perMatch.reduce((sum, m) => sum + m.goals, 0);
            assists = perMatch.reduce((sum, m) => sum + m.assists, 0);
            gamesPlayed = perMatch.length;
        }
        if (assists > 0) hasAssists = true;

        byPlayer.set(player.id, {
            link,
            lzvName: lzv?.name ?? null,
            goals,
            assists,
            gamesPlayed,
            goalsPerMatch: gamesPlayed > 0 ? goals / gamesPlayed : 0,
            byMatch,
        });
    }

    return {
        byPlayer,
        hasAssists,
        hasData: data.lzvPlayers.length > 0 || data.lineups.length > 0,
    };
}

/** Linked players sorted by goals, then assists, then goals per match. */
export function rankScorers<T extends { id: number }>(players: T[], index: GoalsIndex) {
    return players
        .map(player => ({ player, goals: index.byPlayer.get(player.id) }))
        .filter((row): row is { player: T; goals: PlayerGoalStats } => Boolean(row.goals?.link))
        .sort((a, b) =>
            b.goals.goals - a.goals.goals
            || b.goals.assists - a.goals.assists
            || b.goals.goalsPerMatch - a.goals.goalsPerMatch
        );
}

export function formatGoalsPerMatch(value: number): string {
    return value.toFixed(2).replace(/\.?0+$/, '') || '0';
}
