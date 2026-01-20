'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { findScraperTeamByName, fetchScraperPlayers, type ScraperTeam, type ScraperPlayer } from '@/lib/useData';
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

    // Reset AI analysis when opponent changes
    useEffect(() => {
        setAiAnalysis(null);
        setAiError(null);
    }, [opponentTeam]);

    useEffect(() => {
        if (!opponentTeam || !enabled) return;

        setLoading(true);

        const fetchTeamData = async () => {
            try {
                // Fetch opponent team
                const team = await findScraperTeamByName(opponentTeam);
                if (team) {
                    setOpponentData(team);
                    // Fetch players
                    const players = await fetchScraperPlayers(team.externalId);
                    setOpponentPlayers(players.slice(0, 5)); // Top 5 players

                    // Fetch matches for recent form
                    const matchesRes = await fetch(`${API_BASE_URL}/api/lzv/matches?teamId=${team.externalId}`);
                    if (matchesRes.ok) {
                        const matchesData = await matchesRes.json();
                        setOpponentMatches(matchesData);
                    }
                }

                // Fetch own team data for comparison
                if (ownTeam) {
                    const ownTeamResult = await findScraperTeamByName(ownTeam);
                    if (ownTeamResult) {
                        setOwnTeamData(ownTeamResult);
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch team data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTeamData();
    }, [opponentTeam, ownTeam, enabled]);

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
