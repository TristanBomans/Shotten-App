// =============================================================================
// SEASON WRAPPED
// Builds the recap card model (team or single player) from the stats the
// stats page already computes. Rendering lives in lib/wrappedCanvas.ts.
// =============================================================================

import type { Match } from './mockData';
import type { PlayerWithStats } from '@/components/StatsView';
import { formatGoalsPerMatch, rankScorers, type GoalsIndex } from './goals';
import { parseDateToTimestamp } from './dateUtils';
import { normalizeTeamName } from './teamNameMatching';

export type WrappedTone = 'ok' | 'warn' | 'no' | 'tbd' | 'accent' | 'neutral';

export interface WrappedStat {
    label: string;
    value: string;
    detail?: string;
    tone?: WrappedTone;
}

export interface WrappedCardModel {
    kind: 'team' | 'player';
    season: string;
    title: string;
    subtitle: string;
    hero: { value: string; label: string; progress?: number };
    stats: WrappedStat[];
}

export type WrappedTarget = { kind: 'team' } | { kind: 'player'; playerId: number };

interface BestWin {
    match: Match;
    teamScore: number;
    opponentScore: number;
}

function teamNamesOf(matches: Match[]): string[] {
    const names = new Set<string>();
    for (const m of matches) {
        if (m.teamName) names.add(m.teamName);
    }
    return [...names];
}

export function opponentOf(match: Match): string {
    const parts = match.name.split(/\s+-\s+/);
    if (parts.length !== 2) return match.name;
    const own = match.teamName ? normalizeTeamName(match.teamName) : null;
    if (own && normalizeTeamName(parts[0]) === own) return parts[1].trim();
    if (own && normalizeTeamName(parts[1]) === own) return parts[0].trim();
    return parts[1].trim();
}

function pastMatches(matches: Match[], now: number) {
    return matches.filter(m => parseDateToTimestamp(m.date) < now);
}

/** Biggest goal difference among wins (ties: more goals scored). */
export function findBestWin(matches: Match[]): BestWin | null {
    let best: BestWin | null = null;
    for (const match of matches) {
        const r = match.result;
        if (!r || match.forfait || r.outcome !== 'W') continue;
        const diff = r.teamScore - r.opponentScore;
        const bestDiff = best ? best.teamScore - best.opponentScore : -Infinity;
        if (diff > bestDiff || (diff === bestDiff && best && r.teamScore > best.teamScore)) {
            best = { match, teamScore: r.teamScore, opponentScore: r.opponentScore };
        }
    }
    return best;
}

function formatBestWin(win: BestWin | null): WrappedStat {
    if (!win) return { label: 'Best win', value: 'Still waiting', detail: 'No wins on record', tone: 'tbd' };
    return {
        label: 'Best win',
        value: `${win.teamScore}–${win.opponentScore}`,
        detail: `vs ${opponentOf(win.match)}`,
        tone: 'ok',
    };
}

export function seasonLabel(matches: Match[], now = Date.now()): string {
    const years = pastMatches(matches, now)
        .map(m => new Date(parseDateToTimestamp(m.date)).getFullYear())
        .filter(y => Number.isFinite(y));
    if (years.length === 0) return String(new Date(now).getFullYear());
    const first = Math.min(...years);
    const last = Math.max(...years);
    return first === last ? String(first) : `${first}–${String(last).slice(-2)}`;
}

function plural(n: number, one: string, many = `${one}s`) {
    return `${n} ${n === 1 ? one : many}`;
}

function firstName(name: string) {
    return name.split(/\s+/)[0] || name;
}

/** Closed man-of-the-match awards per player id (see lib/motmRules.ts). */
export type MotmAwards = Map<number, number>;

export function buildTeamWrapped(
    players: PlayerWithStats[],
    matches: Match[],
    goals: GoalsIndex,
    motmAwards: MotmAwards = new Map(),
    now = Date.now(),
): WrappedCardModel {
    const past = pastMatches(matches, now);
    const played = past.filter(m => !m.forfait && m.attendances?.some(a => a.status === 'Present'));
    const withResult = played.filter(m => m.result);
    const wins = withResult.filter(m => m.result!.outcome === 'W').length;
    const draws = withResult.filter(m => m.result!.outcome === 'D').length;
    const losses = withResult.filter(m => m.result!.outcome === 'L').length;
    const goalsFor = withResult.reduce((sum, m) => sum + m.result!.teamScore, 0);
    const goalsAgainst = withResult.reduce((sum, m) => sum + m.result!.opponentScore, 0);

    const active = players.filter(p => p.stats.totalMatches > 0);
    const stats: WrappedStat[] = [];

    const top = rankScorers(active, goals)[0];
    if (top && top.goals.goals > 0) {
        stats.push({
            label: 'Top scorer',
            value: firstName(top.player.name),
            detail: `${plural(top.goals.goals, 'goal')} · ${formatGoalsPerMatch(top.goals.goalsPerMatch)} per match`,
            tone: 'warn',
        });
    } else if (withResult.length > 0) {
        stats.push({ label: 'Goals', value: `${goalsFor}–${goalsAgainst}`, detail: 'scored – conceded', tone: 'accent' });
    }

    const motmKing = [...players]
        .map(p => ({ player: p, awards: motmAwards.get(p.id) ?? 0 }))
        .sort((a, b) => b.awards - a.awards)[0];
    if (motmKing && motmKing.awards > 0) {
        stats.push({
            label: 'Man of the match',
            value: firstName(motmKing.player.name),
            detail: `${plural(motmKing.awards, 'award')}`,
            tone: 'warn',
        });
    }

    const streaker = [...active].sort((a, b) => b.stats.bestStreak - a.stats.bestStreak)[0];
    if (streaker && streaker.stats.bestStreak > 0) {
        stats.push({
            label: 'Best streak',
            value: firstName(streaker.name),
            detail: `${streaker.stats.bestStreak} in a row present`,
            tone: 'ok',
        });
    }

    const loyal = [...active].sort((a, b) => b.stats.attendancePct - a.stats.attendancePct || b.stats.presentCount - a.stats.presentCount)[0];
    if (loyal) {
        stats.push({
            label: 'Most loyal',
            value: firstName(loyal.name),
            detail: `${loyal.stats.attendancePct}% · ${loyal.stats.rank.name}`,
            tone: 'accent',
        });
    }

    // Ghosts: never answered. If nobody ghosted, crown the most-absent instead.
    const ghost = [...active].sort((a, b) =>
        b.stats.ghostCount - a.stats.ghostCount
        || (b.stats.absentCount + b.stats.ghostCount) - (a.stats.absentCount + a.stats.ghostCount)
        || a.stats.attendancePct - b.stats.attendancePct
    )[0];
    if (ghost) {
        const detail = ghost.stats.ghostCount > 0
            ? `ghosted ${plural(ghost.stats.ghostCount, 'match', 'matches')}`
            : `${ghost.stats.attendancePct}% · missed ${plural(ghost.stats.absentCount, 'match', 'matches')}`;
        stats.push({ label: 'Biggest ghost', value: firstName(ghost.name), detail, tone: 'tbd' });
    }

    stats.push(formatBestWin(findBestWin(played)));

    if (top && top.goals.goals > 0 && withResult.length > 0) {
        stats.push({ label: 'Goals', value: `${goalsFor}–${goalsAgainst}`, detail: 'scored – conceded', tone: 'accent' });
    }

    const teamNames = teamNamesOf(matches);
    return {
        kind: 'team',
        season: seasonLabel(matches, now),
        title: teamNames.join(' & ') || 'Our team',
        subtitle: withResult.length > 0
            ? `${plural(wins, 'win')} · ${plural(draws, 'draw')} · ${plural(losses, 'loss', 'losses')}`
            : plural(active.length, 'player'),
        hero: { value: String(played.length), label: played.length === 1 ? 'match played' : 'matches played' },
        stats: stats.slice(0, 6),
    };
}

export function buildPlayerWrapped(
    player: PlayerWithStats,
    leaderboardRank: number,
    playerCount: number,
    matches: Match[],
    goals: GoalsIndex,
    motmAwards: MotmAwards = new Map(),
    now = Date.now(),
): WrappedCardModel {
    const s = player.stats;
    const stats: WrappedStat[] = [];

    stats.push({
        label: 'Matches played',
        value: String(s.presentCount),
        detail: `of ${plural(s.totalMatches, 'match', 'matches')}`,
        tone: 'neutral',
    });

    const g = goals.byPlayer.get(player.id);
    if (g?.link) {
        stats.push({
            label: 'Goals',
            value: String(g.goals),
            detail: goals.hasAssists
                ? `${plural(g.assists, 'assist')} · ${formatGoalsPerMatch(g.goalsPerMatch)}/match`
                : `${formatGoalsPerMatch(g.goalsPerMatch)} per match`,
            tone: g.goals > 0 ? 'warn' : 'neutral',
        });
    }

    stats.push({
        label: 'Best streak',
        value: String(s.bestStreak),
        detail: s.bestStreak === 1 ? 'match in a row' : 'matches in a row',
        tone: 'ok',
    });

    stats.push({
        label: 'Ghosted',
        value: s.ghostCount === 0 ? 'Never' : String(s.ghostCount),
        detail: s.ghostCount === 0 ? 'always answered' : s.ghostCount === 1 ? 'time, no answer' : 'times, no answer',
        tone: s.ghostCount === 0 ? 'ok' : 'tbd',
    });

    const attendedIds = new Set(s.matchResults.filter(r => r.status === 'present').map(r => r.matchId));
    const attended = pastMatches(matches, now).filter(m => attendedIds.has(m.id));
    const bestWin = findBestWin(attended);
    const win = formatBestWin(bestWin);
    const winGoals = bestWin ? g?.byMatch.get(bestWin.match.id)?.goals ?? 0 : 0;
    if (winGoals > 0) win.detail = `${win.detail} · ${plural(winGoals, 'goal')}`;
    stats.push(win);

    const awards = motmAwards.get(player.id) ?? 0;
    if (awards > 0) {
        stats.push({
            label: 'Man of the match',
            value: `${awards}×`,
            detail: 'voted best on the pitch',
            tone: 'warn',
        });
    }

    stats.push({
        label: 'Leaderboard',
        value: `#${leaderboardRank}`,
        detail: `of ${plural(playerCount, 'player')}`,
        tone: leaderboardRank <= 3 ? 'warn' : 'neutral',
    });

    const teamNames = teamNamesOf(matches.filter(m => player.teamIds.includes(m.teamId)));
    return {
        kind: 'player',
        season: seasonLabel(matches, now),
        title: player.name,
        subtitle: [s.rank.name, teamNames.join(' & ')].filter(Boolean).join(' · '),
        hero: { value: `${s.attendancePct}%`, label: 'attendance', progress: s.attendancePct / 100 },
        stats: stats.slice(0, 6),
    };
}
