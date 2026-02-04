import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Upsert LZV Team (create or update)
export const upsertTeam = mutation({
  args: {
    externalId: v.number(),
    name: v.string(),
    leagueId: v.optional(v.number()),
    leagueName: v.optional(v.string()),
    rank: v.optional(v.number()),
    points: v.number(),
    matchesPlayed: v.number(),
    wins: v.number(),
    draws: v.number(),
    losses: v.number(),
    goalsFor: v.number(),
    goalsAgainst: v.number(),
    goalDifference: v.number(),
    pointsPerMatch: v.number(),
    form: v.array(v.string()),
    colors: v.optional(v.string()),
    manager: v.optional(v.string()),
    description: v.optional(v.string()),
    imageBase64: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if team exists
    const existing = await ctx.db
      .query("lzvTeams")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        leagueId: args.leagueId,
        leagueName: args.leagueName,
        rank: args.rank,
        points: args.points,
        matchesPlayed: args.matchesPlayed,
        wins: args.wins,
        draws: args.draws,
        losses: args.losses,
        goalsFor: args.goalsFor,
        goalsAgainst: args.goalsAgainst,
        goalDifference: args.goalDifference,
        pointsPerMatch: args.pointsPerMatch,
        form: args.form,
        colors: args.colors,
        manager: args.manager,
        description: args.description,
        imageBase64: args.imageBase64,
        lastUpdated: now,
      });
      return existing._id;
    } else {
      const id = await ctx.db.insert("lzvTeams", {
        externalId: args.externalId,
        name: args.name,
        leagueId: args.leagueId,
        leagueName: args.leagueName,
        rank: args.rank,
        points: args.points,
        matchesPlayed: args.matchesPlayed,
        wins: args.wins,
        draws: args.draws,
        losses: args.losses,
        goalsFor: args.goalsFor,
        goalsAgainst: args.goalsAgainst,
        goalDifference: args.goalDifference,
        pointsPerMatch: args.pointsPerMatch,
        form: args.form,
        colors: args.colors,
        manager: args.manager,
        description: args.description,
        imageBase64: args.imageBase64,
        lastUpdated: now,
        createdAt: now,
      });
      return id;
    }
  },
});

// Upsert LZV Match
export const upsertMatch = mutation({
  args: {
    externalId: v.string(),
    date: v.number(),
    homeTeam: v.string(),
    awayTeam: v.string(),
    homeScore: v.number(),
    awayScore: v.number(),
    location: v.optional(v.string()),
    teamId: v.number(),
    status: v.union(v.literal("Scheduled"), v.literal("Played"), v.literal("Postponed")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if match exists
    const existing = await ctx.db
      .query("lzvMatches")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        date: args.date,
        homeTeam: args.homeTeam,
        awayTeam: args.awayTeam,
        homeScore: args.homeScore,
        awayScore: args.awayScore,
        location: args.location,
        teamId: args.teamId,
        status: args.status,
        updatedAt: now,
      });
      return existing._id;
    } else {
      const id = await ctx.db.insert("lzvMatches", {
        externalId: args.externalId,
        date: args.date,
        homeTeam: args.homeTeam,
        awayTeam: args.awayTeam,
        homeScore: args.homeScore,
        awayScore: args.awayScore,
        location: args.location,
        teamId: args.teamId,
        status: args.status,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    }
  },
});

// Upsert LZV Player
export const upsertPlayer = mutation({
  args: {
    externalId: v.number(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if player exists
    const existing = await ctx.db
      .query("lzvPlayers")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        lastUpdated: now,
      });
      return existing._id;
    } else {
      const id = await ctx.db.insert("lzvPlayers", {
        externalId: args.externalId,
        name: args.name,
        lastUpdated: now,
        createdAt: now,
      });
      return id;
    }
  },
});

// Upsert LZV Player Team Stats
export const upsertPlayerTeamStats = mutation({
  args: {
    playerExternalId: v.number(),
    teamId: v.number(),
    jerseyNumber: v.optional(v.number()),
    gamesPlayed: v.number(),
    goals: v.number(),
    assists: v.number(),
    fairplayRank: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // First find the player
    const player = await ctx.db
      .query("lzvPlayers")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.playerExternalId))
      .unique();

    if (!player) {
      throw new Error(`Player with externalId ${args.playerExternalId} not found`);
    }

    // Check if stats exist for this player-team combination
    const existing = await ctx.db
      .query("lzvPlayerTeamStats")
      .withIndex("by_player_team", (q) =>
        q.eq("playerId", player._id).eq("teamId", args.teamId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        jerseyNumber: args.jerseyNumber,
        gamesPlayed: args.gamesPlayed,
        goals: args.goals,
        assists: args.assists,
        fairplayRank: args.fairplayRank,
        updatedAt: now,
      });
      return existing._id;
    } else {
      const id = await ctx.db.insert("lzvPlayerTeamStats", {
        playerId: player._id,
        teamId: args.teamId,
        jerseyNumber: args.jerseyNumber,
        gamesPlayed: args.gamesPlayed,
        goals: args.goals,
        assists: args.assists,
        fairplayRank: args.fairplayRank,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    }
  },
});

// ============================================================================
// CREATE MUTATIONS (for migration - return Convex ID)
// ============================================================================

// Create LZV Team (returns Convex ID)
export const createTeam = mutation({
  args: {
    externalId: v.number(),
    name: v.string(),
    leagueId: v.optional(v.number()),
    leagueName: v.optional(v.string()),
    rank: v.optional(v.number()),
    points: v.number(),
    matchesPlayed: v.number(),
    wins: v.number(),
    draws: v.number(),
    losses: v.number(),
    goalsFor: v.number(),
    goalsAgainst: v.number(),
    goalDifference: v.number(),
    pointsPerMatch: v.number(),
    form: v.array(v.string()),
    colors: v.optional(v.string()),
    manager: v.optional(v.string()),
    description: v.optional(v.string()),
    imageBase64: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("lzvTeams", {
      externalId: args.externalId,
      name: args.name,
      leagueId: args.leagueId,
      leagueName: args.leagueName,
      rank: args.rank,
      points: args.points,
      matchesPlayed: args.matchesPlayed,
      wins: args.wins,
      draws: args.draws,
      losses: args.losses,
      goalsFor: args.goalsFor,
      goalsAgainst: args.goalsAgainst,
      goalDifference: args.goalDifference,
      pointsPerMatch: args.pointsPerMatch,
      form: args.form,
      colors: args.colors,
      manager: args.manager,
      description: args.description,
      imageBase64: args.imageBase64,
      lastUpdated: now,
      createdAt: now,
    });
    return id;
  },
});

// Create LZV Match
export const createMatch = mutation({
  args: {
    externalId: v.string(),
    date: v.number(),
    homeTeam: v.string(),
    awayTeam: v.string(),
    homeScore: v.number(),
    awayScore: v.number(),
    location: v.optional(v.string()),
    teamId: v.number(),
    status: v.union(v.literal("Scheduled"), v.literal("Played"), v.literal("Postponed")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("lzvMatches", {
      externalId: args.externalId,
      date: args.date,
      homeTeam: args.homeTeam,
      awayTeam: args.awayTeam,
      homeScore: args.homeScore,
      awayScore: args.awayScore,
      location: args.location,
      teamId: args.teamId,
      status: args.status,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// Create LZV Player
export const createPlayer = mutation({
  args: {
    externalId: v.number(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("lzvPlayers", {
      externalId: args.externalId,
      name: args.name,
      lastUpdated: now,
      createdAt: now,
    });
    return id;
  },
});

// Create LZV Player Team Stats
export const createPlayerTeamStats = mutation({
  args: {
    playerId: v.id("lzvPlayers"),
    teamId: v.number(),
    jerseyNumber: v.optional(v.number()),
    gamesPlayed: v.number(),
    goals: v.number(),
    assists: v.number(),
    fairplayRank: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("lzvPlayerTeamStats", {
      playerId: args.playerId,
      teamId: args.teamId,
      jerseyNumber: args.jerseyNumber,
      gamesPlayed: args.gamesPlayed,
      goals: args.goals,
      assists: args.assists,
      fairplayRank: args.fairplayRank,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});
