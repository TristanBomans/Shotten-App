'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    lookupScraperTeamByName,
    fetchScraperTeamById,
    fetchScraperPlayers,
    type ScraperTeam,
    type ScraperPlayer,
} from '@/lib/useData';
import { API_BASE_URL } from '@/lib/config';
import { isHomeTeamForMatch } from '@/lib/teamNameMatching';

interface UseOpponentTeamDataProps {
    matchId: number;
    opponentTeam: string | null;
    ownTeam: string | null;
    open: boolean;
    enabled: boolean;
    knownOpponentId?: number | null;
}

interface OpponentMatch {
    externalId: number;
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
    location: string | null;
    teamId: number;
    status: string;
}

interface UseOpponentTeamDataResult {
    opponentExternalId: number | null;
    opponentData: ScraperTeam | null;
    opponentPlayers: ScraperPlayer[];
    opponentMatches: OpponentMatch[];
    ownTeamData: ScraperTeam | null;
    loading: boolean;
    recentForm: ('W' | 'L' | 'D')[];
    aiAnalysis: string | null;
    aiLoading: boolean;
    aiError: string | null;
    fetchAIAnalysis: (force?: boolean) => Promise<void>;
}

export function useOpponentTeamData({
    matchId,
    opponentTeam,
    ownTeam,
    open,
    enabled,
    knownOpponentId = null,
}: UseOpponentTeamDataProps): UseOpponentTeamDataResult {
    const [opponentData, setOpponentData] = useState<ScraperTeam | null>(null);
    const [opponentPlayers, setOpponentPlayers] = useState<ScraperPlayer[]>([]);
    const [opponentMatches, setOpponentMatches] = useState<OpponentMatch[]>([]);
    const [ownTeamData, setOwnTeamData] = useState<ScraperTeam | null>(null);

    // AI Analysis state
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const aiCacheRef = useRef<Map<string, string>>(new Map());
    const detailsLoadedForRef = useRef<number | null>(null);

    // Known id stays in effect for the current opponent once seen, as before.
    const [stickyKnownId, setStickyKnownId] = useState<number | null>(knownOpponentId || null);
    // Result of the name lookup, tagged with the team it was for.
    const [lookup, setLookup] = useState<{ team: string; id: number | null } | null>(null);
    // External id the heavy load last succeeded for / request it last failed for.
    const [loadedId, setLoadedId] = useState<number | null>(null);
    const [failedKey, setFailedKey] = useState<string | null>(null);

    // Reset when opponent changes (adjusted during render)
    const [trackedTeam, setTrackedTeam] = useState(opponentTeam);
    if (opponentTeam !== trackedTeam) {
        setTrackedTeam(opponentTeam);
        setStickyKnownId(knownOpponentId || null);
        setLookup(null);
        setLoadedId(null);
        setFailedKey(null);
        setOpponentData(null);
        setOpponentPlayers([]);
        setOpponentMatches([]);
        setOwnTeamData(null);
        setAiAnalysis(null);
        setAiError(null);
    } else if (knownOpponentId && knownOpponentId !== stickyKnownId) {
        setStickyKnownId(knownOpponentId);
    }

    const resolvedKnownId = knownOpponentId || stickyKnownId;
    const lookupForTeam = lookup && lookup.team === opponentTeam ? lookup : null;
    const opponentExternalId = resolvedKnownId ?? lookupForTeam?.id ?? null;
    const lookupDone = !!resolvedKnownId || !opponentTeam || lookupForTeam !== null;

    // A failed heavy load is retried the next time the opponent tab is shown.
    const heavyActive = open && enabled && !!opponentTeam;
    if (!heavyActive && failedKey !== null) {
        setFailedKey(null);
    }
    const requestKey = `${opponentExternalId}|${ownTeam ?? ''}`;
    const loading = heavyActive && (
        !lookupDone ||
        (!!opponentExternalId && loadedId !== opponentExternalId && failedKey !== requestKey)
    );

    // Matching ref reset when opponent changes
    useEffect(() => {
        detailsLoadedForRef.current = null;
    }, [opponentTeam]);

    // Light lookup: only the LZV id, so the menu link works on the squad tab
    useEffect(() => {
        if (resolvedKnownId || !open || !opponentTeam || lookupDone) return;

        let cancelled = false;
        lookupScraperTeamByName(opponentTeam)
            .then((result) => {
                if (!cancelled) setLookup({ team: opponentTeam, id: result?.externalId ?? null });
            })
            .catch((error) => {
                console.warn('Failed to look up opponent team:', error);
                if (!cancelled) setLookup({ team: opponentTeam, id: null });
            });

        return () => {
            cancelled = true;
        };
    }, [open, opponentTeam, resolvedKnownId, lookupDone]);

    // Heavy load: full team, players, matches, own team — only on the opponent tab
    useEffect(() => {
        if (!open || !enabled || !opponentTeam || !lookupDone) return;
        if (!opponentExternalId) return;
        if (detailsLoadedForRef.current === opponentExternalId) return;

        let cancelled = false;
        const externalId = opponentExternalId;
        const key = `${externalId}|${ownTeam ?? ''}`;

        const fetchTeamData = async () => {
            const team = await fetchScraperTeamById(externalId);
            if (cancelled) return;
            if (team) {
                setOpponentData(team);

                const [players, matchesRes] = await Promise.all([
                    fetchScraperPlayers(team.externalId),
                    fetch(`${API_BASE_URL}/api/lzv/matches?teamId=${team.externalId}`),
                ]);
                if (cancelled) return;

                setOpponentPlayers(players.slice(0, 5));
                if (matchesRes.ok) {
                    const matches = await matchesRes.json();
                    if (cancelled) return;
                    setOpponentMatches(matches);
                }
            }

            if (ownTeam) {
                const ownLookup = await lookupScraperTeamByName(ownTeam);
                if (cancelled) return;
                if (ownLookup) {
                    const ownTeamResult = await fetchScraperTeamById(ownLookup.externalId);
                    if (!cancelled && ownTeamResult) {
                        setOwnTeamData(ownTeamResult);
                    }
                }
            }
        };

        fetchTeamData()
            .then(() => {
                if (cancelled) return;
                detailsLoadedForRef.current = externalId;
                setLoadedId(externalId);
            })
            .catch((error) => {
                console.warn('Failed to fetch team data:', error);
                if (!cancelled) setFailedKey(key);
            });

        return () => {
            cancelled = true;
        };
    }, [open, opponentTeam, ownTeam, enabled, opponentExternalId, lookupDone]);

    // Calculate recent form from opponent matches
    const recentForm = useMemo(() => {
        if (!opponentData || opponentMatches.length === 0) return [];

        const playedMatches = opponentMatches
            .filter((m) => m.status === 'Played')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        return playedMatches.map((m) => {
            const isHome = isHomeTeamForMatch(opponentData.name, m.homeTeam, m.awayTeam);
            const teamScore = (isHome ? m.homeScore : m.awayScore) ?? 0;
            const opponentScore = (isHome ? m.awayScore : m.homeScore) ?? 0;

            if (teamScore > opponentScore) return 'W' as const;
            if (teamScore < opponentScore) return 'L' as const;
            return 'D' as const;
        });
    }, [opponentData, opponentMatches]);

    // Fetch AI analysis
    const fetchAIAnalysis = useCallback(async (force: boolean = false) => {
        if (!opponentData || !ownTeamData) return;

        const cacheKey = `${matchId}-${opponentData.externalId}-${ownTeamData.externalId}`;

        // Check cache first (unless forced)
        if (!force) {
            const cached = aiCacheRef.current.get(cacheKey);
            if (cached) {
                setAiAnalysis(cached);
                return;
            }
        }

        setAiLoading(true);
        setAiError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/ai/opponent-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matchId,
                    force,
                    ownTeam: {
                        name: ownTeamData.name,
                        rank: ownTeamData.rank,
                        points: ownTeamData.points,
                        wins: ownTeamData.wins,
                        draws: ownTeamData.draws,
                        losses: ownTeamData.losses,
                        goalDifference: ownTeamData.goalDifference,
                    },
                    opponent: {
                        name: opponentData.name,
                        rank: opponentData.rank,
                        points: opponentData.points,
                        wins: opponentData.wins,
                        draws: opponentData.draws,
                        losses: opponentData.losses,
                        goalDifference: opponentData.goalDifference,
                    },
                    opponentPlayers: opponentPlayers.map(p => ({
                        name: p.name,
                        goals: p.goals,
                        assists: p.assists,
                    })),
                    recentForm,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to generate analysis');
            }

            const data = await response.json();
            setAiAnalysis(data.analysis);
            aiCacheRef.current.set(cacheKey, data.analysis);
            if (force && data.refreshFailed) {
                setAiError('Could not regenerate the report');
            }
        } catch (error) {
            console.error('AI analysis error:', error);
            setAiError(error instanceof Error ? error.message : 'Failed to generate analysis');
        } finally {
            setAiLoading(false);
        }
    }, [matchId, opponentData, ownTeamData, opponentPlayers, recentForm]);

    // Auto-fetch AI analysis when data is ready
    useEffect(() => {
        if (opponentData && ownTeamData && !loading && !aiAnalysis && !aiLoading && !aiError) {
            fetchAIAnalysis();
        }
    }, [opponentData, ownTeamData, loading, aiAnalysis, aiLoading, aiError, fetchAIAnalysis]);

    return {
        opponentExternalId,
        opponentData,
        opponentPlayers,
        opponentMatches,
        ownTeamData,
        loading,
        recentForm,
        aiAnalysis,
        aiLoading,
        aiError,
        fetchAIAnalysis,
    };
}
