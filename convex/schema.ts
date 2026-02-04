import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Core Teams (Wille ma ni kunne, FC Degradé)
  coreTeams: defineTable({
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"]),

  // Core Players (team members)
  corePlayers: defineTable({
    name: v.string(),
    teamIds: v.array(v.id("coreTeams")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_team", ["teamIds"]),

  // Core Matches (from iCal sync)
  coreMatches: defineTable({
    date: v.number(),
    location: v.optional(v.string()),
    name: v.optional(v.string()),
    teamName: v.optional(v.string()),
    teamId: v.optional(v.id("coreTeams")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_team", ["teamId"])
    .index("by_team_date", ["teamId", "date"]),

  // Attendance (player attendance per match)
  attendances: defineTable({
    matchId: v.id("coreMatches"),
    playerId: v.id("corePlayers"),
    status: v.union(v.literal("Present"), v.literal("NotPresent"), v.literal("Maybe")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_match", ["matchId"])
    .index("by_player", ["playerId"])
    .index("by_match_player", ["matchId", "playerId"])
    .index("by_player_match", ["playerId", "matchId"]),

  // LZV Teams (league data from lzvcup.be)
  lzvTeams: defineTable({
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
    lastUpdated: v.number(),
    createdAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_rank", ["rank"])
    .index("by_name", ["name"]),

  // LZV Matches (scraped match results)
  lzvMatches: defineTable({
    externalId: v.string(),
    date: v.number(),
    homeTeam: v.string(),
    awayTeam: v.string(),
    homeScore: v.number(),
    awayScore: v.number(),
    location: v.optional(v.string()),
    teamId: v.number(),
    status: v.union(v.literal("Scheduled"), v.literal("Played"), v.literal("Postponed")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_team", ["teamId"])
    .index("by_date", ["date"])
    .index("by_team_date", ["teamId", "date"]),

  // LZV Players (scraped player stats)
  lzvPlayers: defineTable({
    externalId: v.number(),
    name: v.string(),
    lastUpdated: v.number(),
    createdAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_name", ["name"]),

  // LZV Player Team Stats (stats per player per team)
  lzvPlayerTeamStats: defineTable({
    playerId: v.id("lzvPlayers"),
    teamId: v.number(),
    jerseyNumber: v.optional(v.number()),
    gamesPlayed: v.number(),
    goals: v.number(),
    assists: v.number(),
    fairplayRank: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_player", ["playerId"])
    .index("by_team", ["teamId"])
    .index("by_player_team", ["playerId", "teamId"]),

  // Seeding control
  seedingStatus: defineTable({
    hasSeeded: v.boolean(),
    seededAt: v.number(),
  }),
});
