// =============================================================================
// ACHIEVEMENT BADGES
// Auto-awarded, computed client-side from data the app already has:
// attendances (the same counted matches as the stats page), LZV lineups
// (goals/assists per match) and closed man of the match votes.
// Pure module: no React, no storage. Icons live in components/Badges.
// =============================================================================

import type { GoalsData } from './goals';

export type BadgeId =
    | 'off-the-mark'
    | 'double-trouble'
    | 'hat-trick-hero'
    | 'assist-king'
    | 'creature-of-habit'
    | 'iron-man'
    | 'perfect-month'
    | 'back-from-the-dead'
    | 'lucky-charm'
    | 'part-of-the-furniture'
    | 'man-of-the-match'
    | 'fan-favourite';

export type BadgeTier = 'easy' | 'medium' | 'rare';

/** Which data a badge needs; badges for data the team doesn't have are hidden. */
type BadgeSource = 'attendance' | 'goals' | 'assists' | 'motm';

export interface BadgeDefinition {
    id: BadgeId;
    name: string;
    /** One-line rule, shown on locked tiles and in the detail sheet. */
    rule: string;
    tier: BadgeTier;
    source: BadgeSource;
    /** Earned more than once shows a ×N count. */
    repeatable: boolean;
}

// Thresholds, exported so the UI and the rules stay in step.
export const STREAK_REGULAR = 5;
export const STREAK_IRON_MAN = 10;
export const COMEBACK_MISSED = 4;
export const PERFECT_MONTH_MIN_MATCHES = 3;
export const LUCKY_CHARM_WINS = 5;
export const FURNITURE_PRESENT = 25;
export const ASSIST_KING_MIN = 2;
export const FAN_FAVOURITE_AWARDS = 2;

/** Display order: attendance first (everyone can earn those), then goals, then MOTM. */
export const BADGES: BadgeDefinition[] = [
    { id: 'creature-of-habit', name: 'Creature of Habit', rule: `Present ${STREAK_REGULAR} matches in a row`, tier: 'easy', source: 'attendance', repeatable: true },
    { id: 'back-from-the-dead', name: 'Back From the Dead', rule: `Show up again after missing ${COMEBACK_MISSED}+ matches in a row`, tier: 'easy', source: 'attendance', repeatable: true },
    { id: 'perfect-month', name: 'Perfect Month', rule: `Present at every match of a month (${PERFECT_MONTH_MIN_MATCHES}+ matches)`, tier: 'medium', source: 'attendance', repeatable: true },
    { id: 'lucky-charm', name: 'Lucky Charm', rule: `Present for ${LUCKY_CHARM_WINS} wins`, tier: 'medium', source: 'attendance', repeatable: false },
    { id: 'iron-man', name: 'Iron Man', rule: `Present ${STREAK_IRON_MAN} matches in a row`, tier: 'rare', source: 'attendance', repeatable: true },
    { id: 'part-of-the-furniture', name: 'Part of the Furniture', rule: `Present at ${FURNITURE_PRESENT} matches`, tier: 'rare', source: 'attendance', repeatable: false },
    { id: 'off-the-mark', name: 'Off the Mark', rule: 'Score your first goal', tier: 'easy', source: 'goals', repeatable: false },
    { id: 'double-trouble', name: 'Double Trouble', rule: 'Score 2+ goals in one match', tier: 'medium', source: 'goals', repeatable: true },
    { id: 'hat-trick-hero', name: 'Hat-trick Hero', rule: 'Score 3+ goals in one match', tier: 'rare', source: 'goals', repeatable: true },
    { id: 'assist-king', name: 'Assist King', rule: `Most assists in a match (at least ${ASSIST_KING_MIN})`, tier: 'medium', source: 'assists', repeatable: true },
    { id: 'man-of-the-match', name: 'Man of the Match', rule: 'Win a man of the match vote', tier: 'medium', source: 'motm', repeatable: true },
    { id: 'fan-favourite', name: 'Fan Favourite', rule: `Man of the match ${FAN_FAVOURITE_AWARDS} times`, tier: 'rare', source: 'motm', repeatable: false },
];

export const BADGE_BY_ID = new Map(BADGES.map(b => [b.id, b]));

// -----------------------------------------------------------------------------
// Input
// -----------------------------------------------------------------------------

export type BadgeAttendanceStatus = 'present' | 'maybe' | 'notPresent' | 'ghost';

/** One counted match for the player (same set as calculatePlayerStats). */
export interface BadgeMatch {
    matchId: number;
    matchName: string;
    date: Date;
    status: BadgeAttendanceStatus;
    /** Our team's LZV result, when known. */
    outcome?: 'W' | 'L' | 'D' | null;
}

export interface BadgeInput {
    /** Counted past matches, any order. */
    matches: BadgeMatch[];
    /** core match id -> goals/assists, only when the player is on the LZV lineup. */
    goalsByMatch?: Map<number, { goals: number; assists: number }>;
    /** core match id -> highest assist count on our lineup (see buildMaxAssistsByMatch). */
    maxAssistsByMatch?: Map<number, number>;
    /** Player is linked to an LZV profile: goal badges are shown. */
    hasGoals: boolean;
    /** The team's LZV data includes assists: the assist badge is shown. */
    hasAssists: boolean;
    /** Closed man of the match votes the player won; undefined hides MOTM badges. */
    motmWonMatchIds?: number[];
    now?: number;
}

// -----------------------------------------------------------------------------
// Output
// -----------------------------------------------------------------------------

export interface BadgeMatchRef {
    matchId: number;
    matchName: string;
    date: Date;
}

export interface BadgeProgress {
    current: number;
    target: number;
    /** e.g. "8/10 in a row". */
    label: string;
}

export interface PlayerBadge {
    def: BadgeDefinition;
    earned: boolean;
    /** Times earned (1 for single badges once earned). */
    count: number;
    /** The match that first earned it. */
    firstEarned: BadgeMatchRef | null;
    /** The match that most recently earned it (same as first when count is 1). */
    lastEarned: BadgeMatchRef | null;
    /** Only for locked badges where "how close am I" makes sense. */
    progress: BadgeProgress | null;
}

function ref(m: BadgeMatch): BadgeMatchRef {
    return { matchId: m.matchId, matchName: m.matchName, date: m.date };
}

interface Hits {
    hits: BadgeMatch[];
    progress?: BadgeProgress | null;
}

function progress(current: number, target: number, suffix: string): BadgeProgress {
    return { current: Math.min(current, target), target, label: `${Math.min(current, target)}/${target} ${suffix}` };
}

/** Matches where a present run first reaches `target`, and the trailing run. */
function streakHits(chrono: BadgeMatch[], target: number): Hits {
    const hits: BadgeMatch[] = [];
    let run = 0;
    for (const m of chrono) {
        if (m.status === 'present') {
            run++;
            if (run === target) hits.push(m);
        } else {
            run = 0;
        }
    }
    return { hits, progress: progress(run, target, 'in a row') };
}

function comebackHits(chrono: BadgeMatch[]): Hits {
    const hits: BadgeMatch[] = [];
    let missed = 0;
    let everPresent = false;
    for (const m of chrono) {
        if (m.status === 'present') {
            // Only a comeback if they'd been around before the gap.
            if (everPresent && missed >= COMEBACK_MISSED) hits.push(m);
            everPresent = true;
            missed = 0;
        } else {
            missed++;
        }
    }
    return { hits };
}

function monthKey(d: Date) {
    return d.getFullYear() * 12 + d.getMonth();
}

/** Months that are over, had enough matches, and the player made every one. */
function perfectMonthHits(chrono: BadgeMatch[], now: number): Hits {
    const currentMonth = monthKey(new Date(now));
    const byMonth = new Map<number, BadgeMatch[]>();
    for (const m of chrono) {
        const key = monthKey(m.date);
        if (key >= currentMonth) continue; // the month can still go wrong
        const list = byMonth.get(key);
        if (list) list.push(m);
        else byMonth.set(key, [m]);
    }
    const hits: BadgeMatch[] = [];
    for (const list of byMonth.values()) {
        if (list.length >= PERFECT_MONTH_MIN_MATCHES && list.every(m => m.status === 'present')) {
            hits.push(list[list.length - 1]);
        }
    }
    hits.sort((a, b) => a.date.getTime() - b.date.getTime());
    return { hits };
}

/** The match where a running count first reaches `target`. */
function nthHit(matching: BadgeMatch[], target: number, suffix: string): Hits {
    return {
        hits: matching.length >= target ? [matching[target - 1]] : [],
        progress: progress(matching.length, target, suffix),
    };
}

export function computeBadges(input: BadgeInput): PlayerBadge[] {
    const now = input.now ?? Date.now();
    const chrono = [...input.matches].sort((a, b) => a.date.getTime() - b.date.getTime() || a.matchId - b.matchId);
    const goalsOf = (m: BadgeMatch) => input.goalsByMatch?.get(m.matchId);
    const present = chrono.filter(m => m.status === 'present');
    const motmWon = input.motmWonMatchIds ? new Set(input.motmWonMatchIds) : null;
    const motmMatches = motmWon ? chrono.filter(m => motmWon.has(m.matchId)) : [];

    const rules: Record<BadgeId, () => Hits> = {
        'creature-of-habit': () => streakHits(chrono, STREAK_REGULAR),
        'iron-man': () => streakHits(chrono, STREAK_IRON_MAN),
        'back-from-the-dead': () => comebackHits(chrono),
        'perfect-month': () => perfectMonthHits(chrono, now),
        'lucky-charm': () => nthHit(present.filter(m => m.outcome === 'W'), LUCKY_CHARM_WINS, 'wins'),
        'part-of-the-furniture': () => nthHit(present, FURNITURE_PRESENT, 'matches'),
        'off-the-mark': () => ({ hits: chrono.filter(m => (goalsOf(m)?.goals ?? 0) > 0).slice(0, 1) }),
        'double-trouble': () => ({ hits: chrono.filter(m => (goalsOf(m)?.goals ?? 0) >= 2) }),
        'hat-trick-hero': () => ({ hits: chrono.filter(m => (goalsOf(m)?.goals ?? 0) >= 3) }),
        'assist-king': () => ({
            hits: chrono.filter(m => {
                const assists = goalsOf(m)?.assists ?? 0;
                return assists >= ASSIST_KING_MIN && assists >= (input.maxAssistsByMatch?.get(m.matchId) ?? 0);
            }),
        }),
        'man-of-the-match': () => ({ hits: motmMatches }),
        'fan-favourite': () => nthHit(motmMatches, FAN_FAVOURITE_AWARDS, 'awards'),
    };

    const shown = (def: BadgeDefinition) => {
        switch (def.source) {
            case 'goals': return input.hasGoals;
            case 'assists': return input.hasGoals && input.hasAssists;
            case 'motm': return motmWon != null;
            default: return true;
        }
    };

    return BADGES.filter(shown).map(def => {
        const { hits, progress: prog } = rules[def.id]();
        const earned = hits.length > 0;
        return {
            def,
            earned,
            count: def.repeatable ? hits.length : Math.min(hits.length, 1),
            firstEarned: earned ? ref(hits[0]) : null,
            lastEarned: earned ? ref(hits[hits.length - 1]) : null,
            progress: earned ? null : prog ?? null,
        };
    });
}

/** Earned first (rarest, then most recent), locked after (closest to done first). */
export function sortBadges(badges: PlayerBadge[]): PlayerBadge[] {
    const tierRank: Record<BadgeTier, number> = { rare: 0, medium: 1, easy: 2 };
    const order = new Map(BADGES.map((b, i) => [b.id, i]));
    return [...badges].sort((a, b) => {
        if (a.earned !== b.earned) return a.earned ? -1 : 1;
        if (a.earned) {
            return tierRank[a.def.tier] - tierRank[b.def.tier]
                || (b.lastEarned!.date.getTime() - a.lastEarned!.date.getTime());
        }
        const pa = a.progress ? a.progress.current / a.progress.target : -1;
        const pb = b.progress ? b.progress.current / b.progress.target : -1;
        return pb - pa || order.get(a.def.id)! - order.get(b.def.id)!;
    });
}

// -----------------------------------------------------------------------------
// Helpers for building the input
// -----------------------------------------------------------------------------

interface MatchWithResult {
    id: number;
    result?: { resultId?: number | null; teamLzvId?: number } | null;
}

/**
 * Highest assist count on our own lineup per core match, over everyone on the
 * lineup (unlinked LZV players included, so "most assists" is honest).
 */
export function buildMaxAssistsByMatch(matches: MatchWithResult[], data: GoalsData): Map<number, number> {
    const lineups = new Map(data.lineups.map(l => [`${l.resultId}:${l.lzvTeamId}`, l]));
    const result = new Map<number, number>();
    for (const match of matches) {
        const r = match.result;
        if (!r?.resultId || r.teamLzvId == null) continue;
        const lineup = lineups.get(`${r.resultId}:${r.teamLzvId}`);
        if (!lineup) continue;
        result.set(match.id, lineup.players.reduce((max, p) => Math.max(max, p.assists), 0));
    }
    return result;
}

// -----------------------------------------------------------------------------
// "New badge" bookkeeping (pure: the caller does the storage)
// -----------------------------------------------------------------------------

/** badge id -> times earned, as last acknowledged by the player. */
export type SeenBadges = Partial<Record<BadgeId, number>>;

export function snapshotBadges(badges: PlayerBadge[]): SeenBadges {
    const seen: SeenBadges = {};
    for (const b of badges) if (b.earned) seen[b.def.id] = b.count;
    return seen;
}

/** On first run, only badges earned this recently count as new. */
export const NEW_BADGE_FIRST_RUN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Badges earned (or earned again) since `seen`, newest first. With no
 * snapshot yet (first run), only badges earned in the last week are new, so
 * long-time players aren't greeted with a pile of old badges.
 */
export function findNewBadges(badges: PlayerBadge[], seen: SeenBadges | null, now = Date.now()): PlayerBadge[] {
    return badges
        .filter(b => {
            if (!b.earned || !b.lastEarned) return false;
            if (seen) return b.count > (seen[b.def.id] ?? 0);
            return now - b.lastEarned.date.getTime() <= NEW_BADGE_FIRST_RUN_WINDOW_MS;
        })
        .sort((a, b) => b.lastEarned!.date.getTime() - a.lastEarned!.date.getTime());
}
