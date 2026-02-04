import { mutation } from "../_generated/server";

// Delete all attendances
export const deleteAllAttendances = mutation({
  args: {},
  handler: async (ctx) => {
    const attendances = await ctx.db.query("attendances").collect();
    for (const att of attendances) {
      await ctx.db.delete(att._id);
    }
    return attendances.length;
  },
});

// Delete all core matches
export const deleteAllMatches = mutation({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db.query("coreMatches").collect();
    for (const match of matches) {
      await ctx.db.delete(match._id);
    }
    return matches.length;
  },
});

// Delete all core players
export const deleteAllPlayers = mutation({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("corePlayers").collect();
    for (const player of players) {
      await ctx.db.delete(player._id);
    }
    return players.length;
  },
});

// Delete all core teams
export const deleteAllTeams = mutation({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("coreTeams").collect();
    for (const team of teams) {
      await ctx.db.delete(team._id);
    }
    return teams.length;
  },
});

// Delete all LZV matches
export const deleteAllLzvMatches = mutation({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db.query("lzvMatches").collect();
    for (const match of matches) {
      await ctx.db.delete(match._id);
    }
    return matches.length;
  },
});

// Delete all LZV player stats
export const deleteAllLzvPlayerStats = mutation({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db.query("lzvPlayerTeamStats").collect();
    for (const stat of stats) {
      await ctx.db.delete(stat._id);
    }
    return stats.length;
  },
});

// Delete all LZV players
export const deleteAllLzvPlayers = mutation({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("lzvPlayers").collect();
    for (const player of players) {
      await ctx.db.delete(player._id);
    }
    return players.length;
  },
});

// Delete all LZV teams
export const deleteAllLzvTeams = mutation({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("lzvTeams").collect();
    for (const team of teams) {
      await ctx.db.delete(team._id);
    }
    return teams.length;
  },
});
