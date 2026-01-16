'use client';

import { useState, useEffect, useMemo } from 'react';
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

    return {
        opponentData,
        opponentPlayers,
        opponentMatches,
        ownTeamData,
        loading,
        recentForm,
    };
}
