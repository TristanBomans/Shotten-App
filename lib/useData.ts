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
import { API_BASE_URL } from './config';
import { parseDateToTimestamp } from './dateUtils';
import { isSameTeamName, normalizeTeamName } from './teamNameMatching';

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
    const res = await fetch(`${API_BASE_URL}/api/lzv/stats`);
    if (!res.ok) throw new Error('Failed to fetch scraper stats');
    return res.json();
}

export async function fetchScraperTeamById(externalId: number): Promise<ScraperTeam | null> {
    const res = await fetch(`${API_BASE_URL}/api/lzv/team/${externalId}`);
    if (!res.ok) return null;
    return res.json();
}

export async function fetchAllScraperPlayers(): Promise<ScraperPlayer[]> {
    const res = await fetch(`${API_BASE_URL}/api/lzv/players`);
    if (!res.ok) throw new Error('Failed to fetch scraper players');
    return res.json();
}

export async function fetchScraperPlayers(teamId: number): Promise<ScraperPlayer[]> {
    const res = await fetch(`${API_BASE_URL}/api/lzv/players?teamId=${teamId}`);
    if (!res.ok) return [];
    return res.json();
}

// Find team by name (searches through all teams)
export async function findScraperTeamByName(teamName: string): Promise<ScraperTeam | null> {
    const teams = await fetchAllScraperTeams();
    const normalized = normalizeTeamName(teamName);

    const exactOrNear = teams.find(t => isSameTeamName(t.name, teamName));
    if (exactOrNear) return exactOrNear;

    return teams.find(t => {
        const normalizedTeamName = normalizeTeamName(t.name);
        return normalizedTeamName.includes(normalized) || normalized.includes(normalizedTeamName);
    }) || null;
}

// =============================================================================
// STANDALONE FETCH FUNCTIONS
// =============================================================================

export async function fetchAllPlayersData(): Promise<Player[]> {
    if (getUseMockData()) {
        await new Promise(r => setTimeout(r, 300));
        return [...MOCK_PLAYERS].sort((a, b) => a.name.localeCompare(b.name));
    }
    const res = await fetch(`${API_BASE_URL}/api/Players`);
    if (!res.ok) throw new Error('Failed to fetch players');
    const data = await res.json();
    return data.sort((a: Player, b: Player) => a.name.localeCompare(b.name));
}

export async function fetchPlayerMatchesData(playerId: number): Promise<Match[]> {
    if (getUseMockData()) {
        await new Promise(r => setTimeout(r, 400));
        return getMatchesForPlayer(playerId);
    }
    const res = await fetch(`${API_BASE_URL}/api/Matches?playerId=${playerId}`);
    if (!res.ok) throw new Error('Failed to fetch matches');
    const data = await res.json();
    data.sort((a: Match, b: Match) =>
        parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date)
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
                const res = await fetch(`${API_BASE_URL}/api/Players`);
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
                const res = await fetch(`${API_BASE_URL}/api/Matches?playerId=${playerId}`);
                if (!res.ok) throw new Error('Failed to fetch matches');
                const data = await res.json();
                data.sort((a: Match, b: Match) =>
                    parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date)
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
                const res = await fetch(`${API_BASE_URL}/api/Players`);
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
                    `${API_BASE_URL}/api/Matches/${matchId}/players/${playerId}/attendance?status=${status}`,
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
                const res = await fetch(`${API_BASE_URL}/api/Teams`);
                if (!res.ok) throw new Error('Failed to fetch teams');
                setTeams(await res.json());
            }
        } catch {
            setTeams([]);
        }
    }, []);

    return { teams, fetchTeams };
}

// =============================================================================
// PLAYER MANAGEMENT FUNCTIONS (CRUD)
// =============================================================================

/**
 * Create a new player
 */
export async function createPlayer(name: string, teamIds: number[] = []): Promise<Player> {
    if (getUseMockData()) {
        await new Promise(r => setTimeout(r, 300));
        const newPlayer: Player = {
            id: Math.max(...MOCK_PLAYERS.map(p => p.id), 0) + 1,
            name,
            teamIds,
        };
        MOCK_PLAYERS.push(newPlayer);
        return newPlayer;
    }

    const res = await fetch(`${API_BASE_URL}/api/Players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, teamIds }),
    });

    if (!res.ok) throw new Error('Failed to create player');
    return res.json();
}

/**
 * Update an existing player
 */
export async function updatePlayer(id: number, data: { name: string; teamIds: number[] }): Promise<Player> {
    if (getUseMockData()) {
        await new Promise(r => setTimeout(r, 300));
        const player = MOCK_PLAYERS.find(p => p.id === id);
        if (!player) throw new Error('Player not found');
        player.name = data.name;
        player.teamIds = data.teamIds;
        return player;
    }

    const res = await fetch(`${API_BASE_URL}/api/Players/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Failed to update player');
    return res.json();
}

/**
 * Delete a player
 */
export async function deletePlayer(id: number): Promise<void> {
    if (getUseMockData()) {
        await new Promise(r => setTimeout(r, 300));
        const idx = MOCK_PLAYERS.findIndex(p => p.id === id);
        if (idx >= 0) {
            MOCK_PLAYERS.splice(idx, 1);
        }
        return;
    }

    const res = await fetch(`${API_BASE_URL}/api/Players/${id}`, {
        method: 'DELETE',
    });

    if (!res.ok) throw new Error('Failed to delete player');
}

/**
 * Hook for player management (CRUD operations)
 */
export function usePlayerManagement() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [playersRes, teamsRes] = await Promise.all([
                getUseMockData()
                    ? Promise.resolve(MOCK_PLAYERS)
                    : fetch(`${API_BASE_URL}/api/Players`).then(r => r.json()),
                getUseMockData()
                    ? Promise.resolve(MOCK_TEAMS)
                    : fetch(`${API_BASE_URL}/api/Teams`).then(r => r.json()),
            ]);
            setPlayers(playersRes.sort((a: Player, b: Player) => a.name.localeCompare(b.name)));
            setTeams(teamsRes);
        } catch (e) {
            console.error('Failed to load player management data:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const addPlayer = useCallback(async (name: string) => {
        setSaving(true);
        try {
            const newPlayer = await createPlayer(name, []);
            // Optimistic update: add player immediately
            setPlayers(prev => [...prev, newPlayer].sort((a, b) => a.name.localeCompare(b.name)));
        } catch (e) {
            console.error('Failed to add player:', e);
            alert('Error adding player. Please try again.');
        } finally {
            setSaving(false);
        }
    }, []);

    const editPlayer = useCallback(async (id: number, name: string, teamIds: number[]) => {
        setSaving(true);
        // Store previous state for rollback
        const previousPlayers = players;

        try {
            // Optimistic update: update player immediately
            setPlayers(prev => prev.map(p =>
                p.id === id ? { ...p, name, teamIds } : p
            ).sort((a, b) => a.name.localeCompare(b.name)));

            await updatePlayer(id, { name, teamIds });
        } catch (e) {
            console.error('Failed to update player:', e);
            // Rollback on error
            setPlayers(previousPlayers);
            alert('Error updating player. Please try again.');
        } finally {
            setSaving(false);
        }
    }, [players]);

    const removePlayer = useCallback(async (id: number) => {
        setSaving(true);
        // Store previous state for rollback
        const previousPlayers = players;

        try {
            // Optimistic update: remove player immediately
            setPlayers(prev => prev.filter(p => p.id !== id));

            await deletePlayer(id);
        } catch (e) {
            console.error('Failed to delete player:', e);
            // Rollback on error
            setPlayers(previousPlayers);
            alert('Error deleting player. Please try again.');
        } finally {
            setSaving(false);
        }
    }, [players]);

    const toggleTeam = useCallback(async (player: Player, teamId: number) => {
        const newTeamIds = player.teamIds.includes(teamId)
            ? player.teamIds.filter(t => t !== teamId)
            : [...player.teamIds, teamId];
        await editPlayer(player.id, player.name, newTeamIds);
    }, [editPlayer]);

    return {
        players,
        teams,
        loading,
        saving,
        refresh,
        addPlayer,
        editPlayer,
        removePlayer,
        toggleTeam,
    };
}
