'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from './config';
import { getUseMockData } from './useData';
import type { MotmVote } from './motmRules';

// =============================================================================
// MAN OF THE MATCH: client data access (live API or in-memory mock votes)
// =============================================================================

/** Fired on window after a vote changes, so every MOTM view refetches. */
export const MOTM_VOTES_CHANGED_EVENT = 'motmVotesChanged';

// Mock votes for the past matches in lib/mockData.ts. 201 and 202 are closed;
// 204 (yesterday) is still open and player 1 has not voted yet.
const MOCK_MOTM_VOTES: MotmVote[] = [
    { matchId: 201, voterPlayerId: 1, votedPlayerId: 3 },
    { matchId: 201, voterPlayerId: 2, votedPlayerId: 3 },
    { matchId: 201, voterPlayerId: 3, votedPlayerId: 7 },
    { matchId: 201, voterPlayerId: 4, votedPlayerId: 3 },
    { matchId: 201, voterPlayerId: 6, votedPlayerId: 10 },
    { matchId: 201, voterPlayerId: 7, votedPlayerId: 3 },
    { matchId: 201, voterPlayerId: 8, votedPlayerId: 7 },
    { matchId: 202, voterPlayerId: 1, votedPlayerId: 7 },
    { matchId: 202, voterPlayerId: 3, votedPlayerId: 7 },
    { matchId: 202, voterPlayerId: 6, votedPlayerId: 1 },
    { matchId: 202, voterPlayerId: 8, votedPlayerId: 7 },
    { matchId: 204, voterPlayerId: 2, votedPlayerId: 8 },
    { matchId: 204, voterPlayerId: 3, votedPlayerId: 1 },
    { matchId: 204, voterPlayerId: 8, votedPlayerId: 3 },
    { matchId: 204, voterPlayerId: 10, votedPlayerId: 8 },
];

const mockDelay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function fetchMotmVotes(matchIds: number[]): Promise<MotmVote[]> {
    if (matchIds.length === 0) return [];
    if (getUseMockData()) {
        await mockDelay(150);
        const ids = new Set(matchIds);
        return MOCK_MOTM_VOTES.filter(v => ids.has(v.matchId)).map(v => ({ ...v }));
    }
    const res = await fetch(`${API_BASE_URL}/api/motm?matchIds=${matchIds.join(',')}`);
    if (!res.ok) throw new Error('Failed to fetch man of the match votes');
    return res.json();
}

async function readError(res: Response, fallback: string): Promise<string> {
    try {
        const body = await res.json();
        return typeof body?.error === 'string' ? body.error : fallback;
    } catch {
        return fallback;
    }
}

function notifyChanged() {
    window.dispatchEvent(new Event(MOTM_VOTES_CHANGED_EVENT));
}

export async function castMotmVote(matchId: number, voterPlayerId: number, votedPlayerId: number): Promise<void> {
    if (getUseMockData()) {
        await mockDelay(250);
        const existing = MOCK_MOTM_VOTES.find(v => v.matchId === matchId && v.voterPlayerId === voterPlayerId);
        if (existing) existing.votedPlayerId = votedPlayerId;
        else MOCK_MOTM_VOTES.push({ matchId, voterPlayerId, votedPlayerId });
    } else {
        const res = await fetch(
            `${API_BASE_URL}/api/Matches/${matchId}/players/${voterPlayerId}/motm?votedPlayerId=${votedPlayerId}`,
            { method: 'PUT' }
        );
        if (!res.ok) throw new Error(await readError(res, 'Failed to save your vote'));
    }
    notifyChanged();
}

export async function clearMotmVote(matchId: number, voterPlayerId: number): Promise<void> {
    if (getUseMockData()) {
        await mockDelay(200);
        const idx = MOCK_MOTM_VOTES.findIndex(v => v.matchId === matchId && v.voterPlayerId === voterPlayerId);
        if (idx >= 0) MOCK_MOTM_VOTES.splice(idx, 1);
    } else {
        const res = await fetch(`${API_BASE_URL}/api/Matches/${matchId}/players/${voterPlayerId}/motm`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error(await readError(res, 'Failed to remove your vote'));
    }
    notifyChanged();
}

/**
 * Votes for a set of matches. Pass a stable key (e.g. the joined ids) so the
 * hook only refetches when the set changes or a vote is cast anywhere.
 */
export function useMotmVotes(matchIds: number[], enabled = true) {
    const key = matchIds.join(',');
    const [votes, setVotes] = useState<MotmVote[]>([]);
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        const ids = key ? key.split(',').map(Number) : [];
        const load = () => {
            fetchMotmVotes(ids)
                .then(next => {
                    if (cancelled) return;
                    setVotes(next);
                    setError(null);
                })
                .catch(e => {
                    if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
                })
                .finally(() => {
                    if (!cancelled) setLoadedKey(key);
                });
        };
        load();
        window.addEventListener(MOTM_VOTES_CHANGED_EVENT, load);
        return () => {
            cancelled = true;
            window.removeEventListener(MOTM_VOTES_CHANGED_EVENT, load);
        };
    }, [enabled, key]);

    return { votes, setVotes, loading: enabled && loadedKey !== key, error };
}
