"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  MOCK_PLAYERS,
  MOCK_MATCHES,
  MOCK_TEAMS,
  getMatchesForPlayer,
  type Player,
  type Match,
  type Team,
} from "./mockData";

// Toggle between mock and Convex data
export const getUseMockData = (): boolean => {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("useMockData");
  return stored === null ? false : stored === "true";
};

export const setUseMockData = (value: boolean): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("useMockData", String(value));
  }
};

// Types for LZV responses
export interface ScraperTeam {
  id?: string;
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

export interface ScraperPlayer {
  externalId: number;
  teamId: number;
  name: string;
  number?: number;
  gamesPlayed: number;
  goals: number;
  assists: number;
  fairplayRank?: number;
  teamIds?: number[];
  teamStats?: {
    teamId: number;
    number?: number;
    gamesPlayed: number;
    goals: number;
    assists: number;
    fairplayRank?: number;
  }[];
}

// Hook to fetch all players
export function usePlayers() {
  const convexPlayers = useQuery(api.queries.core.getPlayers);

  const fetchPlayers = useCallback(async () => {
    // Convex auto-refetches
  }, []);

  const players: Player[] = getUseMockData()
    ? MOCK_PLAYERS
    : convexPlayers?.map((p) => ({
        id: p.id,
        name: p.name,
        teamIds: p.teamIds,
      })) || [];

  return { players, loading: convexPlayers === undefined, error: null, fetchPlayers };
}

// Hook to fetch matches for a player
export function useMatches(playerId: string | null) {
  const convexMatches = useQuery(
    api.queries.core.getMatches,
    playerId && !getUseMockData() ? { playerId: playerId as Id<"corePlayers"> } : "skip"
  );

  const fetchMatches = useCallback(async () => {
    // Convex auto-refetches
  }, [playerId]);

  const matches: Match[] = getUseMockData()
    ? playerId
      ? getMatchesForPlayer(playerId)
      : []
    : convexMatches?.map((m) => ({
        id: m.id,
        name: m.name || "Wedstrijd",
        date: m.date,
        location: m.location,
        teamId: m.teamId || "",
        attendances:
          m.attendances?.map((a) => ({
            playerId: a.playerId,
            status: a.status,
          })) || [],
      })) || [];

  return { matches, loading: !getUseMockData() && convexMatches === undefined, error: null, fetchMatches };
}

// Hook to fetch all players (for roster display)
export function useAllPlayers() {
  const convexPlayers = useQuery(api.queries.core.getPlayers);

  const fetchAllPlayers = useCallback(async () => {
    // Convex auto-refetches
  }, []);

  const players: Player[] = getUseMockData()
    ? MOCK_PLAYERS
    : convexPlayers?.map((p) => ({
        id: p.id,
        name: p.name,
        teamIds: p.teamIds,
      })) || [];

  return { players, loading: convexPlayers === undefined, fetchAllPlayers };
}

// Hook to update attendance
export function useUpdateAttendance() {
  const updateAttendanceMutation = useMutation(api.mutations.core.updateAttendance);
  const [updating, setUpdating] = useState<string | null>(null);

  const updateAttendance = useCallback(
    async (
      matchId: string,
      playerId: string,
      status: "Present" | "NotPresent" | "Maybe",
      onSuccess?: () => void
    ) => {
      setUpdating(status);

      try {
        if (getUseMockData()) {
          // Update mock data in memory
          await new Promise((r) => setTimeout(r, 300));
          const match = MOCK_MATCHES.find((m) => m.id === matchId);
          if (match) {
            const existingIdx = match.attendances.findIndex(
              (a) => a.playerId === playerId
            );
            if (existingIdx >= 0) {
              match.attendances[existingIdx].status = status;
            } else {
              match.attendances.push({ playerId, status });
            }
          }
        } else {
          await updateAttendanceMutation({
            matchId: matchId as Id<"coreMatches">,
            playerId: playerId as Id<"corePlayers">,
            status,
          });
        }

        onSuccess?.();
      } catch (e) {
        console.error("Failed to update attendance:", e);
        throw e;
      } finally {
        setUpdating(null);
      }
    },
    [updateAttendanceMutation]
  );

  return { updating, updateAttendance };
}

// Hook to fetch teams
export function useTeams() {
  const convexTeams = useQuery(api.queries.core.getTeams);

  const fetchTeams = useCallback(async () => {
    // Convex auto-refetches
  }, []);

  const teams: Team[] = getUseMockData()
    ? MOCK_TEAMS
    : convexTeams?.map((t) => ({
        id: t._id,
        name: t.name,
      })) || [];

  return { teams, loading: convexTeams === undefined, fetchTeams };
}

// Hook for player management (CRUD operations)
export function usePlayerManagement() {
  const convexPlayers = useQuery(api.queries.core.getPlayers);
  const convexTeams = useQuery(api.queries.core.getTeams);
  const createPlayerMutation = useMutation(api.mutations.core.createPlayer);
  const updatePlayerMutation = useMutation(api.mutations.core.updatePlayer);
  const deletePlayerMutation = useMutation(api.mutations.core.deletePlayer);

  const [saving, setSaving] = useState(false);

  const players: Player[] = getUseMockData()
    ? MOCK_PLAYERS
    : convexPlayers?.map((p) => ({
        id: p.id,
        name: p.name,
        teamIds: p.teamIds,
      })) || [];

  const teams: Team[] = getUseMockData()
    ? MOCK_TEAMS
    : convexTeams?.map((t) => ({
        id: t._id,
        name: t.name,
      })) || [];

  const refresh = useCallback(async () => {
    // Convex auto-refetches
  }, []);

  const addPlayer = useCallback(
    async (name: string) => {
      setSaving(true);
      try {
        if (getUseMockData()) {
          const newPlayer: Player = {
            id: String(Math.max(...MOCK_PLAYERS.map((p) => parseInt(p.id)), 0) + 1),
            name,
            teamIds: [],
          };
          MOCK_PLAYERS.push(newPlayer);
        } else {
          await createPlayerMutation({ name, teamIds: [] });
        }
      } catch (e) {
        console.error("Failed to add player:", e);
        alert("Error adding player. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [createPlayerMutation]
  );

  const editPlayer = useCallback(
    async (id: string, name: string, teamIds: string[]) => {
      setSaving(true);
      try {
        if (getUseMockData()) {
          const player = MOCK_PLAYERS.find((p) => p.id === id);
          if (player) {
            player.name = name;
            player.teamIds = teamIds;
          }
        } else {
          await updatePlayerMutation({
            id: id as Id<"corePlayers">,
            name,
            teamIds: teamIds as Id<"coreTeams">[],
          });
        }
      } catch (e) {
        console.error("Failed to update player:", e);
        alert("Error updating player. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [updatePlayerMutation]
  );

  const removePlayer = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        if (getUseMockData()) {
          const idx = MOCK_PLAYERS.findIndex((p) => p.id === id);
          if (idx >= 0) {
            MOCK_PLAYERS.splice(idx, 1);
          }
        } else {
          await deletePlayerMutation({ id: id as Id<"corePlayers"> });
        }
      } catch (e) {
        console.error("Failed to delete player:", e);
        alert("Error deleting player. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [deletePlayerMutation]
  );

  const toggleTeam = useCallback(
    async (player: Player, teamId: string) => {
      const newTeamIds = player.teamIds.includes(teamId)
        ? player.teamIds.filter((t) => t !== teamId)
        : [...player.teamIds, teamId];
      await editPlayer(player.id, player.name, newTeamIds);
    },
    [editPlayer]
  );

  return {
    players,
    teams,
    loading: !getUseMockData() && (convexPlayers === undefined || convexTeams === undefined),
    saving,
    refresh,
    addPlayer,
    editPlayer,
    removePlayer,
    toggleTeam,
  };
}

// Hook for LZV teams
export function useScraperTeams() {
  const convexTeams = useQuery(api.queries.lzv.getTeams);

  const fetchScraperTeams = useCallback(async () => {
    // Convex auto-refetches
  }, []);

  const teams: ScraperTeam[] = getUseMockData()
    ? [
        {
          externalId: 1,
          name: "Wille ma ni kunne",
          rank: 1,
          points: 30,
          matchesPlayed: 12,
          wins: 10,
          draws: 0,
          losses: 2,
          goalsFor: 45,
          goalsAgainst: 20,
          goalDifference: 25,
          form: ["W", "W", "L", "W", "W"],
        },
      ]
    : convexTeams?.map((t) => ({
        id: t._id,
        externalId: t.externalId,
        name: t.name,
        leagueId: t.leagueId ?? undefined,
        leagueName: t.leagueName ?? undefined,
        rank: t.rank ?? undefined,
        points: t.points,
        matchesPlayed: t.matchesPlayed,
        wins: t.wins,
        draws: t.draws,
        losses: t.losses,
        goalsFor: t.goalsFor,
        goalsAgainst: t.goalsAgainst,
        goalDifference: t.goalDifference,
        pointsPerMatch: t.pointsPerMatch,
        form: t.form,
        colors: t.colors ?? undefined,
        manager: t.manager ?? undefined,
        description: t.description ?? undefined,
        imageBase64: t.imageBase64 ?? undefined,
      })) || [];

  return { teams, loading: convexTeams === undefined, fetchScraperTeams };
}

// Hook for LZV matches
export function useScraperMatches(teamId?: number) {
  const args = teamId ? { teamId } : {};
  const convexMatches = useQuery(
    api.queries.lzv.getMatches,
    !getUseMockData() ? args : "skip"
  );

  const fetchScraperMatches = useCallback(async () => {
    // Convex auto-refetches
  }, [teamId]);

  return {
    matches: convexMatches || [],
    loading: !getUseMockData() && convexMatches === undefined,
    fetchScraperMatches,
  };
}

// Hook for LZV players
export function useScraperPlayers(teamId?: number) {
  const args = teamId ? { teamId } : {};
  const convexPlayers = useQuery(
    api.queries.lzv.getPlayers,
    !getUseMockData() ? args : "skip"
  );

  const fetchScraperPlayersHook = useCallback(async () => {
    // Convex auto-refetches
  }, [teamId]);

  return {
    players: convexPlayers || [],
    loading: !getUseMockData() && convexPlayers === undefined,
    fetchScraperPlayers: fetchScraperPlayersHook,
  };
}

