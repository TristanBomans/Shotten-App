'use client';

import { useMemo } from 'react';
import type { Match } from '@/lib/mockData';
import type { GoalsData, GoalsIndex } from '@/lib/goals';
import { useMotmVotes } from '@/lib/motm';
import { getMotmVotingState, summarizeMotm } from '@/lib/motmRules';
import { buildMaxAssistsByMatch, computeBadges, type PlayerBadge } from '@/lib/badges';
import type { PlayerWithStats } from '../StatsView';

export interface BadgeIndex {
    byPlayer: Map<number, PlayerBadge[]>;
    /** Goals and MOTM votes have loaded: safe to decide what's "new". */
    ready: boolean;
}

/** Badges for every player, from the stats page's counted matches. */
export function useBadgeIndex(
    playerStats: PlayerWithStats[],
    matches: Match[],
    goalsIndex: GoalsIndex,
    goalsData: GoalsData,
    goalsLoading: boolean,
    now: number
): BadgeIndex {
    // Votes for every match that had (or has) a vote; summarizeMotm only hands
    // out awards for closed ones.
    const motmMatches = useMemo(() => matches.filter(m => getMotmVotingState(m, now) !== 'none'), [matches, now]);
    const motmKey = motmMatches.map(m => m.id);
    const { votes, loading: motmLoading, error: motmError } = useMotmVotes(motmKey, motmMatches.length > 0);

    const byPlayer = useMemo(() => {
        const motm = summarizeMotm(votes, motmMatches, now);
        const maxAssists = buildMaxAssistsByMatch(matches, goalsData);
        const outcomes = new Map(matches.map(m => [m.id, m.result?.outcome ?? null]));
        const result = new Map<number, PlayerBadge[]>();
        for (const p of playerStats) {
            const goals = goalsIndex.byPlayer.get(p.id);
            result.set(p.id, computeBadges({
                matches: p.stats.matchResults.map(r => ({ ...r, outcome: outcomes.get(r.matchId) })),
                goalsByMatch: goals?.byMatch,
                maxAssistsByMatch: maxAssists,
                hasGoals: Boolean(goals?.link),
                hasAssists: goalsIndex.hasAssists,
                // Hide MOTM badges if the votes couldn't be loaded, rather than show them locked.
                motmWonMatchIds: motmError ? undefined : motm.get(p.id)?.wonMatchIds ?? [],
                now,
            }));
        }
        return result;
    }, [playerStats, matches, goalsIndex, goalsData, votes, motmMatches, motmError, now]);

    return { byPlayer, ready: !goalsLoading && !motmLoading && playerStats.some(p => p.stats.totalMatches > 0) };
}
