import { query } from "../_generated/server";
import { v } from "convex/values";

// Get all core teams
export const getTeams = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("coreTeams").collect();
  },
});

// Get all players
export const getPlayers = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("corePlayers").collect();

    // Fetch team names for each player
    const playersWithTeams = await Promise.all(
      players.map(async (p) => {
        const teams = await Promise.all(
          p.teamIds.map((teamId) => ctx.db.get(teamId))
        );
        return {
          id: p._id,
          name: p.name,
          teamIds: p.teamIds,
          teams: teams
            .filter((t): t is NonNullable<typeof t> => t !== null)
            .map((t) => ({ id: t._id, name: t.name })),
        };
      })
    );

    return playersWithTeams;
  },
});

// Get player by ID
export const getPlayer = query({
  args: { id: v.id("corePlayers") },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.id);
    if (!player) return null;

    const teams = await Promise.all(
      player.teamIds.map((teamId) => ctx.db.get(teamId))
    );

    return {
      id: player._id,
      name: player.name,
      teamIds: player.teamIds,
      teams: teams
        .filter((t): t is NonNullable<typeof t> => t !== null)
        .map((t) => ({ id: t._id, name: t.name })),
    };
  },
});

// Get matches with optional player filter
export const getMatches = query({
  args: {
    playerId: v.optional(v.id("corePlayers")),
  },
  handler: async (ctx, args) => {
    let matches;

    if (args.playerId) {
      // Get player by Convex ID
      const player = await ctx.db.get(args.playerId);
      if (!player || player.teamIds.length === 0) {
        return [];
      }

      // Get matches for any of the player's teams
      matches = [];
      for (const teamId of player.teamIds) {
        const teamMatches = await ctx.db
          .query("coreMatches")
          .withIndex("by_team", (q) => q.eq("teamId", teamId))
          .collect();
        matches.push(...teamMatches);
      }

      // Remove duplicates and sort
      const seen = new Set();
      matches = matches.filter((m) => {
        if (seen.has(m._id)) return false;
        seen.add(m._id);
        return true;
      });
    } else {
      matches = await ctx.db.query("coreMatches").collect();
    }

    // Sort by date
    matches.sort((a, b) => a.date - b.date);

    // Get attendances for all matches
    const matchesWithAttendances = await Promise.all(
      matches.map(async (match) => {
        const attendances = await ctx.db
          .query("attendances")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .collect();

        // Get player details for each attendance
        const attendancesWithPlayers = await Promise.all(
          attendances.map(async (att) => {
            const player = await ctx.db.get(att.playerId);
            return {
              matchId: match._id,
              playerId: att.playerId,
              player: player
                ? {
                    id: player._id,
                    name: player.name,
                    teamIds: player.teamIds,
                  }
                : null,
              status: att.status,
            };
          })
        );

        // Get team name if teamId exists
        const team = match.teamId ? await ctx.db.get(match.teamId) : null;

        return {
          id: match._id,
          date: new Date(match.date).toISOString(),
          location: match.location,
          name: match.name,
          teamName: match.teamName,
          teamId: match.teamId,
          team: team ? { id: team._id, name: team.name } : null,
          attendances: attendancesWithPlayers,
        };
      })
    );

    return matchesWithAttendances;
  },
});

// Get single match with attendances
export const getMatch = query({
  args: { id: v.id("coreMatches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.id);
    if (!match) return null;

    const attendances = await ctx.db
      .query("attendances")
      .withIndex("by_match", (q) => q.eq("matchId", args.id))
      .collect();

    const players = await ctx.db.query("corePlayers").collect();
    const playerMap = new Map(players.map((p) => [p._id, p]));

    const team = match.teamId ? await ctx.db.get(match.teamId) : null;

    return {
      id: match._id,
      date: new Date(match.date).toISOString(),
      location: match.location,
      name: match.name,
      teamName: match.teamName,
      teamId: match.teamId,
      team: team ? { id: team._id, name: team.name } : null,
      attendances: attendances.map((a) => {
        const player = playerMap.get(a.playerId);
        return {
          matchId: a.matchId,
          playerId: a.playerId,
          player: player
            ? {
                id: player._id,
                name: player.name,
                teamIds: player.teamIds,
              }
            : null,
          status: a.status,
        };
      }),
    };
  },
});
