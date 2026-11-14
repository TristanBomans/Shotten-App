'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from './config';
import { EMPTY_GOALS_DATA, type GoalsData } from './goals';
import { MOCK_LZV_LINKS, getMockGoalsData } from './mockData';
import { getUseMockData } from './useData';

export async function fetchGoalsData(): Promise<GoalsData> {
    if (getUseMockData()) {
        await new Promise(r => setTimeout(r, 200));
        return getMockGoalsData();
    }
    const res = await fetch(`${API_BASE_URL}/api/lzv/goals`);
    if (!res.ok) throw new Error('Failed to fetch goals');
    return res.json();
}

/** Scraped LZV goals/assists for our teams; empty until loaded or on error. */
export function useGoalsData() {
    const [data, setData] = useState<GoalsData>(EMPTY_GOALS_DATA);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            setData(await fetchGoalsData());
        } catch (e) {
            console.warn('Goals data unavailable:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetchGoalsData()
            .then(next => !cancelled && setData(next))
            .catch(e => console.warn('Goals data unavailable:', e))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, []);

    return { data, loading, refresh };
}

/** Admin: set or clear (null) the explicit LZV player for an app player. */
export async function setPlayerLzvLink(playerId: number, lzvPlayerExternalId: number | null): Promise<void> {
    if (getUseMockData()) {
        await new Promise(r => setTimeout(r, 200));
        for (const [id, ext] of MOCK_LZV_LINKS) {
            if (ext === lzvPlayerExternalId && id !== playerId) MOCK_LZV_LINKS.delete(id);
        }
        if (lzvPlayerExternalId === null) MOCK_LZV_LINKS.delete(playerId);
        else MOCK_LZV_LINKS.set(playerId, lzvPlayerExternalId);
        return;
    }
    const res = await fetch(`${API_BASE_URL}/api/Players/${playerId}/lzv-link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lzvPlayerExternalId }),
    });
    if (res.status === 409) throw new Error('Run SQL migration 009 in Supabase first.');
    if (!res.ok) throw new Error('Failed to save LZV link');
}
