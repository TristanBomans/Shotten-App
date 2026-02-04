import { query } from "../_generated/server";
import { v } from "convex/values";

// Get all LZV teams ordered by rank
export const getTeams = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("lzvTeams")
      .withIndex("by_rank")
      .collect();
  },
});

// Get LZV team by external ID
export const getTeamByExternalId = query({
  args: { externalId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lzvTeams")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();
  },
});

// Get LZV matches with optional team filter
export const getMatches = query({
  args: {
    teamId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let matches;

    if (args.teamId !== undefined) {
      matches = await ctx.db
        .query("lzvMatches")
        .withIndex("by_team", (q) => q.eq("teamId", args.teamId!))
        .collect();
    } else {
      matches = await ctx.db.query("lzvMatches").collect();
    }

    // Sort by date
    matches.sort((a, b) => a.date - b.date);

    return matches.map(m => ({
      externalId: m.externalId,
      date: new Date(m.date).toISOString(),
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      location: m.location,
      teamId: m.teamId,
      status: m.status,
    }));
  },
});

// Get LZV players with optional team filter
export const getPlayers = query({
  args: {
    teamId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get all players
    const players = await ctx.db.query("lzvPlayers").collect();

    // Get all team stats
    const allStats = await ctx.db.query("lzvPlayerTeamStats").collect();

    // Group stats by player
    const statsByPlayer = new Map();
    for (const stat of allStats) {
      if (!statsByPlayer.has(stat.playerId)) {
        statsByPlayer.set(stat.playerId, []);
      }
      statsByPlayer.get(stat.playerId).push(stat);
    }

    // Build response
    const result = [];

    for (const player of players) {
      const stats = statsByPlayer.get(player._id) || [];

      if (args.teamId) {
        // Filter: only include players with stats for this team
        const teamStats = stats.find((s: any) => s.teamId === args.teamId);
        if (teamStats) {
          result.push({
            externalId: player.externalId,
            name: player.name,
            teamId: teamStats.teamId,
            number: teamStats.jerseyNumber,
            gamesPlayed: teamStats.gamesPlayed,
            goals: teamStats.goals,
            assists: teamStats.assists,
            fairplayRank: teamStats.fairplayRank,
            teamIds: stats.map((s: any) => s.teamId),
          });
        }
      } else {
        // No filter: aggregate stats
        const totalGoals = stats.reduce((sum: number, s: any) => sum + s.goals, 0);
        const totalAssists = stats.reduce((sum: number, s: any) => sum + s.assists, 0);
        const totalGames = stats.reduce((sum: number, s: any) => sum + s.gamesPlayed, 0);

        result.push({
          externalId: player.externalId,
          name: player.name,
          teamId: stats[0]?.teamId || 0,
          number: stats[0]?.jerseyNumber,
          gamesPlayed: totalGames,
          goals: totalGoals,
          assists: totalAssists,
          teamIds: stats.map((s: any) => s.teamId),
          teamStats: stats.map((s: any) => ({
            teamId: s.teamId,
            number: s.jerseyNumber,
            gamesPlayed: s.gamesPlayed,
            goals: s.goals,
            assists: s.assists,
            fairplayRank: s.fairplayRank,
          })),
        });
      }
    }

    // Sort by goals descending
    result.sort((a, b) => b.goals - a.goals);

    return result;
  },
});
