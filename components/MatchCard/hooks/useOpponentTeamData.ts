'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useScraperTeams, useScraperPlayers, useScraperMatches, type ScraperTeam, type ScraperPlayer } from '@/lib/useConvexData';
import { API_BASE_URL } from '@/lib/config';

interface UseOpponentTeamDataProps {
    opponentTeam: string | null;
    ownTeam: string | null;
    enabled: boolean;
}

interface UseOpponentTeamDataResult {
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
    enabled,
}: UseOpponentTeamDataProps): UseOpponentTeamDataResult {
    // Use Convex hooks for data
    const { teams, loading: teamsLoading } = useScraperTeams();
    const [opponentTeamId, setOpponentTeamId] = useState<number | undefined>(undefined);
    const { players: opponentPlayersRaw, loading: playersLoading } = useScraperPlayers(opponentTeamId);
    const { matches: opponentMatchesRaw, loading: matchesLoading } = useScraperMatches(opponentTeamId);

    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const aiCacheRef = useRef<Map<string, string>>(new Map());

    // Find opponent and own team from teams list
    const opponentData = useMemo(() => {
        if (!opponentTeam || teams.length === 0) return null;
        const normalizedOpponent = opponentTeam.toLowerCase().replace(/\s+/g, ' ').trim();
        return teams.find(t => {
            const normalizedTeam = t.name.toLowerCase().replace(/\s+/g, ' ').trim();
            return normalizedOpponent.includes(normalizedTeam.slice(0, 8)) ||
                   normalizedTeam.includes(normalizedOpponent.slice(0, 8));
        }) || null;
    }, [opponentTeam, teams]);

    const ownTeamData = useMemo(() => {
        if (!ownTeam || teams.length === 0) return null;
        const normalizedOwn = ownTeam.toLowerCase().replace(/\s+/g, ' ').trim();
        return teams.find(t => {
            const normalizedTeam = t.name.toLowerCase().replace(/\s+/g, ' ').trim();
            return normalizedOwn.includes(normalizedTeam.slice(0, 8)) ||
                   normalizedTeam.includes(normalizedOwn.slice(0, 8));
        }) || null;
    }, [ownTeam, teams]);

    // Update opponentTeamId when opponentData changes
    useEffect(() => {
        if (opponentData?.externalId) {
            setOpponentTeamId(opponentData.externalId);
        }
    }, [opponentData]);

    // Reset AI analysis when opponent changes
    useEffect(() => {
        setAiAnalysis(null);
        setAiError(null);
    }, [opponentTeam]);

    // Memoize processed data
    const opponentPlayers = useMemo(() => {
        return opponentPlayersRaw.slice(0, 5); // Top 5 players
    }, [opponentPlayersRaw]);

    const opponentMatches = useMemo(() => {
        return opponentMatchesRaw.map(m => ({
            externalId: m.externalId,
            date: m.date,
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            location: m.location,
            teamId: m.teamId,
            status: m.status,
        }));
    }, [opponentMatchesRaw]);

    // Calculate recent form from opponent matches
    const recentForm = useMemo(() => {
        if (!opponentData || opponentMatches.length === 0) return [];

        const playedMatches = opponentMatches
            .filter((m: any) => m.status === 'Played')
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        return playedMatches.map((m: any) => {
            const isHome = m.homeTeam.toLowerCase().includes(opponentData.name.toLowerCase().slice(0, 5)) ||
                opponentData.name.toLowerCase().includes(m.homeTeam.toLowerCase().slice(0, 5));
            const teamScore = isHome ? m.homeScore : m.awayScore;
            const opponentScore = isHome ? m.awayScore : m.homeScore;

            if (teamScore > opponentScore) return 'W' as const;
            if (teamScore < opponentScore) return 'L' as const;
            return 'D' as const;
        });
    }, [opponentData, opponentMatches]);

    // Loading state
    const loading = teamsLoading || (opponentTeamId !== undefined && (playersLoading || matchesLoading));

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
