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
    opponentTeam: string | null;
    ownTeam: string | null;
    open: boolean;
    enabled: boolean;
    knownOpponentId?: number | null;
}

interface UseOpponentTeamDataResult {
    opponentExternalId: number | null;
    opponentData: ScraperTeam | null;
    opponentPlayers: ScraperPlayer[];
    opponentMatches: any[];
    ownTeamData: ScraperTeam | null;
    loading: boolean;
    recentForm: ('W' | 'L' | 'D')[];
    aiAnalysis: string | null;
    aiLoading: boolean;
    aiError: string | null;
    fetchAIAnalysis: (force?: boolean) => Promise<void>;
}

export function useOpponentTeamData({
    opponentTeam,
    ownTeam,
    open,
    enabled,
    knownOpponentId = null,
}: UseOpponentTeamDataProps): UseOpponentTeamDataResult {
    const [opponentExternalId, setOpponentExternalId] = useState<number | null>(null);
    const [lookupDone, setLookupDone] = useState(false);
    const [opponentData, setOpponentData] = useState<ScraperTeam | null>(null);
    const [opponentPlayers, setOpponentPlayers] = useState<ScraperPlayer[]>([]);
    const [opponentMatches, setOpponentMatches] = useState<any[]>([]);
    const [ownTeamData, setOwnTeamData] = useState<ScraperTeam | null>(null);
    const [loading, setLoading] = useState(false);

    // AI Analysis state
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const aiCacheRef = useRef<Map<string, string>>(new Map());
    const detailsLoadedForRef = useRef<number | null>(null);
    const lookedUpTeamRef = useRef<string | null>(null);

    // Reset when opponent changes
    useEffect(() => {
        setOpponentExternalId(null);
        setLookupDone(false);
        setOpponentData(null);
        setOpponentPlayers([]);
        setOpponentMatches([]);
        setOwnTeamData(null);
        setAiAnalysis(null);
        setAiError(null);
        detailsLoadedForRef.current = null;
        lookedUpTeamRef.current = null;
    }, [opponentTeam]);

    // Light lookup: only the LZV id, so the menu link works on the squad tab
    useEffect(() => {
        if (knownOpponentId) {
            setOpponentExternalId(knownOpponentId);
            setLookupDone(true);
            lookedUpTeamRef.current = opponentTeam;
            return;
        }

        if (!open || !opponentTeam) {
            if (!opponentTeam) setLookupDone(true);
            return;
        }

        if (lookedUpTeamRef.current === opponentTeam) {
            setLookupDone(true);
            return;
        }

        let cancelled = false;

        const lookup = async () => {
            try {
                const result = await lookupScraperTeamByName(opponentTeam);
                if (cancelled) return;
                lookedUpTeamRef.current = opponentTeam;
                setOpponentExternalId(result?.externalId ?? null);
            } catch (error) {
                console.warn('Failed to look up opponent team:', error);
                if (!cancelled) {
                    lookedUpTeamRef.current = opponentTeam;
                    setOpponentExternalId(null);
                }
            } finally {
                if (!cancelled) setLookupDone(true);
            }
        };

        void lookup();
        return () => {
            cancelled = true;
        };
    }, [open, opponentTeam, knownOpponentId]);

    // Heavy load: full team, players, matches, own team — only on the opponent tab
    useEffect(() => {
        if (!open || !enabled || !opponentTeam || !lookupDone) {
            if (open && enabled && opponentTeam && !lookupDone) setLoading(true);
            return;
        }

        if (!opponentExternalId) {
            setLoading(false);
            return;
        }

        if (detailsLoadedForRef.current === opponentExternalId) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        const fetchTeamData = async () => {
            try {
                const team = await fetchScraperTeamById(opponentExternalId);
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
                        setOpponentMatches(await matchesRes.json());
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

                if (!cancelled) detailsLoadedForRef.current = opponentExternalId;
            } catch (error) {
                console.warn('Failed to fetch team data:', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void fetchTeamData();
        return () => {
            cancelled = true;
        };
    }, [open, opponentTeam, ownTeam, enabled, opponentExternalId, lookupDone]);

    // Calculate recent form from opponent matches
    const recentForm = useMemo(() => {
        if (!opponentData || opponentMatches.length === 0) return [];

        const playedMatches = opponentMatches
            .filter((m: any) => m.status === 'Played')
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        return playedMatches.map((m: any) => {
            const isHome = isHomeTeamForMatch(opponentData.name, m.homeTeam, m.awayTeam);
            const teamScore = isHome ? m.homeScore : m.awayScore;
            const opponentScore = isHome ? m.awayScore : m.homeScore;

            if (teamScore > opponentScore) return 'W' as const;
            if (teamScore < opponentScore) return 'L' as const;
            return 'D' as const;
        });
    }, [opponentData, opponentMatches]);

    // Fetch AI analysis
    const fetchAIAnalysis = useCallback(async (force: boolean = false) => {
        if (!opponentData || !ownTeamData) return;

        const cacheKey = `${opponentData.externalId}-${ownTeamData.externalId}`;

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
        } catch (error) {
            console.error('AI analysis error:', error);
            setAiError(error instanceof Error ? error.message : 'Failed to generate analysis');
        } finally {
            setAiLoading(false);
        }
    }, [opponentData, ownTeamData, opponentPlayers, recentForm]);

    // Auto-fetch AI analysis when data is ready
    useEffect(() => {
        if (opponentData && ownTeamData && !aiAnalysis && !aiLoading && !aiError) {
            fetchAIAnalysis();
        }
    }, [opponentData, ownTeamData, aiAnalysis, aiLoading, aiError, fetchAIAnalysis]);

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
