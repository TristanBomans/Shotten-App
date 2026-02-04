import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Create a new team (used by migration)
export const createTeam = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const teamId = await ctx.db.insert("coreTeams", {
      name: args.name,
      createdAt: now,
      updatedAt: now,
    });
    return teamId;
  },
});

// Create a new player
export const createPlayer = mutation({
  args: {
    name: v.string(),
    teamIds: v.optional(v.array(v.id("coreTeams"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const playerId = await ctx.db.insert("corePlayers", {
      name: args.name,
      teamIds: args.teamIds || [],
      createdAt: now,
      updatedAt: now,
    });
    return playerId;
  },
});

// Update a player
export const updatePlayer = mutation({
  args: {
    id: v.id("corePlayers"),
    name: v.string(),
    teamIds: v.array(v.id("coreTeams")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      teamIds: args.teamIds,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

// Delete a player (and their attendances)
export const deletePlayer = mutation({
  args: { id: v.id("corePlayers") },
  handler: async (ctx, args) => {
    // Delete all attendances for this player
    const attendances = await ctx.db
      .query("attendances")
      .withIndex("by_player", (q) => q.eq("playerId", args.id))
      .collect();

    for (const att of attendances) {
      await ctx.db.delete(att._id);
    }

    // Delete the player
    await ctx.db.delete(args.id);
  },
});

// Create a new match (for normal app use - creates match without attendances)
export const createMatch = mutation({
  args: {
    date: v.number(),
    location: v.optional(v.string()),
    name: v.optional(v.string()),
    teamName: v.optional(v.string()),
    teamId: v.optional(v.id("coreTeams")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const matchId = await ctx.db.insert("coreMatches", {
      date: args.date,
      location: args.location,
      name: args.name,
      teamName: args.teamName,
      teamId: args.teamId,
      createdAt: now,
      updatedAt: now,
    });

    // Note: Attendance records are NOT created automatically.
    // They are only created when a player actually responds (via updateAttendance).
    // This allows the "TBD" (Unknown) status to work correctly.

    return matchId;
  },
});

// Create a new match for migration (alias for createMatch, semantically clear for migration)
export const createMatchOnly = mutation({
  args: {
    date: v.number(),
    location: v.optional(v.string()),
    name: v.optional(v.string()),
    teamName: v.optional(v.string()),
    teamId: v.optional(v.id("coreTeams")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const matchId = await ctx.db.insert("coreMatches", {
      date: args.date,
      location: args.location,
      name: args.name,
      teamName: args.teamName,
      teamId: args.teamId,
      createdAt: now,
      updatedAt: now,
    });

    return matchId;
  },
});

// Update a match
export const updateMatch = mutation({
  args: {
    id: v.id("coreMatches"),
    date: v.optional(v.number()),
    location: v.optional(v.string()),
    name: v.optional(v.string()),
    teamName: v.optional(v.string()),
    teamId: v.optional(v.id("coreTeams")),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.date !== undefined) updates.date = args.date;
    if (args.location !== undefined) updates.location = args.location;
    if (args.name !== undefined) updates.name = args.name;
    if (args.teamName !== undefined) updates.teamName = args.teamName;
    if (args.teamId !== undefined) updates.teamId = args.teamId;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Delete a match (and its attendances)
export const deleteMatch = mutation({
  args: { id: v.id("coreMatches") },
  handler: async (ctx, args) => {
    // Delete all attendances for this match
    const attendances = await ctx.db
      .query("attendances")
      .withIndex("by_match", (q) => q.eq("matchId", args.id))
      .collect();

    for (const att of attendances) {
      await ctx.db.delete(att._id);
    }

    // Delete the match
    await ctx.db.delete(args.id);
  },
});

// Update attendance status
export const updateAttendance = mutation({
  args: {
    matchId: v.id("coreMatches"),
    playerId: v.id("corePlayers"),
    status: v.union(v.literal("Present"), v.literal("NotPresent"), v.literal("Maybe")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if attendance record exists
    const existing = await ctx.db
      .query("attendances")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        updatedAt: now,
      });
      return existing._id;
    } else {
      const id = await ctx.db.insert("attendances", {
        matchId: args.matchId,
        playerId: args.playerId,
        status: args.status,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    }
  },
});
