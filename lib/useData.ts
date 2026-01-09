'use client';

import { useState, useCallback } from 'react';
import {
    MOCK_PLAYERS,
    MOCK_MATCHES,
    MOCK_TEAMS,
    getMatchesForPlayer,
    type Player,
    type Match,
    type Team,
} from './mockData';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Toggle this to switch between mock and live backend
// Can be controlled via Settings panel
export const getUseMockData = (): boolean => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('useMockData');
    return stored === null ? false : stored === 'true'; // Default to false (Real Data)
};

export const setUseMockData = (value: boolean): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('useMockData', String(value));
    }
};

// Backend URL (when not using mock)
const BASE_URL = 'https://shotten-be.taltiko.com';

// Scraper API URL (LZV Cup data)
const SCRAPER_API = 'https://shottenscraper.trisbom.com';

// =============================================================================
// SCRAPER API TYPES
// =============================================================================

export interface ScraperTeam {
    externalId: number;
    name: string;
    leagueId?: number;
    leagueName?: string;
    rank?: number;
    points?: number;
    matchesPlayed?: number;
    wins?: number;
    draws?: number;
    losses?: number;
    goalsFor?: number;
    goalsAgainst?: number;
    goalDifference?: number;
    pointsPerMatch?: number;
    form?: string[];
    colors?: string;
    manager?: string;
    description?: string;
    imageBase64?: string;
}

export interface ScraperTeamStats {
    teamId: number;
    number?: number;
    gamesPlayed: number;
    goals: number;
    assists: number;
    fairplayRank?: number;
}

export interface ScraperPlayer {
    externalId: number;
    teamId: number;              // Primary team ID (first team or filtered team)
    name: string;
    number?: number;
    gamesPlayed: number;
    goals: number;
    assists: number;
    fairplayRank?: number;
    teamIds?: number[];          // All team IDs this player belongs to
    teamStats?: ScraperTeamStats[]; // Full stats per team (when not filtering)
}

// =============================================================================
// SCRAPER API FUNCTIONS
// =============================================================================

export async function fetchAllScraperTeams(): Promise<ScraperTeam[]> {
    const res = await fetch(`${SCRAPER_API}/api/stats`);
    if (!res.ok) throw new Error('Failed to fetch scraper stats');
    return res.json();
}

export async function fetchScraperTeamById(externalId: number): Promise<ScraperTeam | null> {
    const res = await fetch(`${SCRAPER_API}/api/team/${externalId}`);
    if (!res.ok) return null;
    return res.json();
}

export async function fetchAllScraperPlayers(): Promise<ScraperPlayer[]> {
    const res = await fetch(`${SCRAPER_API}/api/players`);
    if (!res.ok) throw new Error('Failed to fetch scraper players');
    return res.json();
}

export async function fetchScraperPlayers(teamId: number): Promise<ScraperPlayer[]> {
    const res = await fetch(`${SCRAPER_API}/api/players?teamId=${teamId}`);
    if (!res.ok) return [];
    return res.json();
}

// Find team by name (searches through all teams)
export async function findScraperTeamByName(teamName: string): Promise<ScraperTeam | null> {
    const teams = await fetchAllScraperTeams();
    const normalized = teamName.toLowerCase().trim();
    return teams.find(t =>
        t.name.toLowerCase().includes(normalized) ||
        normalized.includes(t.name.toLowerCase())
    ) || null;
}

// =============================================================================
// STANDALONE FETCH FUNCTIONS
// =============================================================================

export async function fetchAllPlayersData(): Promise<Player[]> {
    if (getUseMockData()) {
        await new Promise(r => setTimeout(r, 300));
        return [...MOCK_PLAYERS].sort((a, b) => a.name.localeCompare(b.name));
    }
    const res = await fetch(`${BASE_URL}/api/Players`);
    if (!res.ok) throw new Error('Failed to fetch players');
    const data = await res.json();
    return data.sort((a: Player, b: Player) => a.name.localeCompare(b.name));
}

export async function fetchPlayerMatchesData(playerId: number): Promise<Match[]> {
    if (getUseMockData()) {
        await new Promise(r => setTimeout(r, 400));
        return getMatchesForPlayer(playerId);
    }
    const res = await fetch(`${BASE_URL}/api/Matches?playerId=${playerId}`);
    if (!res.ok) throw new Error('Failed to fetch matches');
    const data = await res.json();
    data.sort((a: Match, b: Match) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return data;
}

// =============================================================================
// DATA HOOKS
// =============================================================================

/**
 * Hook to fetch all players
 */
export function usePlayers() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPlayers = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (getUseMockData()) {
                // Simulate network delay for realism
                await new Promise(r => setTimeout(r, 300));
                setPlayers([...MOCK_PLAYERS].sort((a, b) => a.name.localeCompare(b.name)));
            } else {
                const res = await fetch(`${BASE_URL}/api/Players`);
                if (!res.ok) throw new Error('Failed to fetch players');
                const data = await res.json();
                setPlayers(data.sort((a: Player, b: Player) => a.name.localeCompare(b.name)));
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    return { players, loading, error, fetchPlayers };
}

/**
 * Hook to fetch matches for a player
 */
export function useMatches(playerId: number | null) {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMatches = useCallback(async () => {
        if (!playerId) {
            setMatches([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (getUseMockData()) {
                await new Promise(r => setTimeout(r, 400));
                setMatches(getMatchesForPlayer(playerId));
            } else {
                const res = await fetch(`${BASE_URL}/api/Matches?playerId=${playerId}`);
                if (!res.ok) throw new Error('Failed to fetch matches');
                const data = await res.json();
                data.sort((a: Match, b: Match) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                );
                setMatches(data);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [playerId]);

    return { matches, loading, error, fetchMatches, setMatches };
}

/**
 * Hook to fetch all players (for roster display)
 */
export function useAllPlayers() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAllPlayers = useCallback(async () => {
        setLoading(true);
        try {
            if (getUseMockData()) {
                await new Promise(r => setTimeout(r, 200));
                setPlayers(MOCK_PLAYERS);
            } else {
                const res = await fetch(`${BASE_URL}/api/Players`);
                if (!res.ok) throw new Error('Failed to fetch players');
                setPlayers(await res.json());
            }
        } catch {
            setPlayers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    return { players, loading, fetchAllPlayers };
}

/**
 * Hook to update attendance
 */
export function useUpdateAttendance() {
    const [updating, setUpdating] = useState<string | null>(null);

    const updateAttendance = useCallback(async (
        matchId: number,
        playerId: number,
        status: 'Present' | 'NotPresent' | 'Maybe',
        onSuccess?: () => void
    ) => {
        setUpdating(status);

        try {
            if (getUseMockData()) {
                // Update mock data in memory
                await new Promise(r => setTimeout(r, 300));
                const match = MOCK_MATCHES.find(m => m.id === matchId);
                if (match) {
                    const existingIdx = match.attendances.findIndex(a => a.playerId === playerId);
                    if (existingIdx >= 0) {
                        match.attendances[existingIdx].status = status;
                    } else {
                        match.attendances.push({ playerId, status });
                    }
                }
            } else {
                const res = await fetch(
                    `${BASE_URL}/api/matches/${matchId}/players/${playerId}/attendance?status=${status}`,
                    { method: 'PUT', headers: { 'Content-Type': 'application/json' } }
                );
                if (!res.ok) throw new Error('Failed to update attendance');
            }

            onSuccess?.();
        } catch (e) {
            console.error('Failed to update attendance:', e);
            throw e;
        } finally {
            setUpdating(null);
        }
    }, []);

    return { updating, updateAttendance };
}

/**
 * Hook to fetch teams
 */
export function useTeams() {
    const [teams, setTeams] = useState<Team[]>([]);

    const fetchTeams = useCallback(async () => {
        try {
            if (getUseMockData()) {
                await new Promise(r => setTimeout(r, 100));
                setTeams(MOCK_TEAMS);
            } else {
                const res = await fetch(`${BASE_URL}/api/Teams`);
                if (!res.ok) throw new Error('Failed to fetch teams');
                setTeams(await res.json());
            }
        } catch {
            setTeams([]);
        }
    }, []);

    return { teams, fetchTeams };
}
