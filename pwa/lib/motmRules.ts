// ============================================================================
// MAN OF THE MATCH RULES
// Pure helpers shared by the API routes and the UI, so both agree on when
// voting is open and who wins.
// ============================================================================

import { MATCH_FINISHED_AFTER_MS, parseDateToTimestamp } from './dateUtils';

/** Voting closes this long after kick-off. */
export const MOTM_VOTING_CLOSES_AFTER_MS = 72 * 60 * 60 * 1000;

export interface MotmVote {
    matchId: number;
    voterPlayerId: number;
    votedPlayerId: number;
}

/**
 * - `none`: no vote for this match (no result yet, forfait, or not played).
 * - `open`: played, result known, inside the voting window.
 * - `closed`: the window has passed; the tally is final.
 */
export type MotmVotingState = 'none' | 'open' | 'closed';

interface MotmMatchLike {
    date: string | Date;
    forfait?: boolean | null;
    result?: unknown;
}

export function getMotmVotingState(match: MotmMatchLike, now = Date.now()): MotmVotingState {
    if (match.forfait === true || !match.result) return 'none';
    const kickoff = parseDateToTimestamp(match.date);
    if (kickoff <= 0 || now < kickoff + MATCH_FINISHED_AFTER_MS) return 'none';
    return now < kickoff + MOTM_VOTING_CLOSES_AFTER_MS ? 'open' : 'closed';
}

export function getMotmClosesAt(date: string | Date): number {
    return parseDateToTimestamp(date) + MOTM_VOTING_CLOSES_AFTER_MS;
}

export interface MotmTallyEntry {
    playerId: number;
    votes: number;
}

/** Vote counts for one match, most votes first. */
export function tallyMotmVotes(votes: MotmVote[]): MotmTallyEntry[] {
    const counts = new Map<number, number>();
    for (const vote of votes) {
        counts.set(vote.votedPlayerId, (counts.get(vote.votedPlayerId) ?? 0) + 1);
    }
    return [...counts.entries()]
        .map(([playerId, count]) => ({ playerId, votes: count }))
        .sort((a, b) => b.votes - a.votes || a.playerId - b.playerId);
}

/** Everyone tied on the most votes; a shared award counts for each of them. */
export function getMotmWinners(votes: MotmVote[]): number[] {
    const tally = tallyMotmVotes(votes);
    if (tally.length === 0) return [];
    const top = tally[0].votes;
    return tally.filter(t => t.votes === top).map(t => t.playerId);
}

export function groupVotesByMatch(votes: MotmVote[]): Map<number, MotmVote[]> {
    const byMatch = new Map<number, MotmVote[]>();
    for (const vote of votes) {
        const list = byMatch.get(vote.matchId);
        if (list) list.push(vote);
        else byMatch.set(vote.matchId, [vote]);
    }
    return byMatch;
}

export interface MotmPlayerSummary {
    playerId: number;
    /** Closed votes this player won (ties count for everyone tied). */
    awards: number;
    /** Votes received across every match, open ones included. */
    votes: number;
    wonMatchIds: number[];
}

/**
 * Season totals per player. Only closed votes hand out awards; votes still
 * open count towards "votes received" so the table moves as people vote.
 */
export function summarizeMotm(
    votes: MotmVote[],
    matches: { id: number; date: string | Date }[],
    now = Date.now()
): Map<number, MotmPlayerSummary> {
    const summary = new Map<number, MotmPlayerSummary>();
    const get = (playerId: number) => {
        let entry = summary.get(playerId);
        if (!entry) {
            entry = { playerId, awards: 0, votes: 0, wonMatchIds: [] };
            summary.set(playerId, entry);
        }
        return entry;
    };

    const byMatch = groupVotesByMatch(votes);
    for (const match of matches) {
        const matchVotes = byMatch.get(match.id);
        if (!matchVotes) continue;
        for (const t of tallyMotmVotes(matchVotes)) get(t.playerId).votes += t.votes;
        if (now >= getMotmClosesAt(match.date)) {
            for (const winner of getMotmWinners(matchVotes)) {
                const entry = get(winner);
                entry.awards += 1;
                entry.wonMatchIds.push(match.id);
            }
        }
    }
    return summary;
}
