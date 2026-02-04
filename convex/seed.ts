import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Dutch names for realistic mock data
const DUTCH_FIRST_NAMES = [
  "Tristan", "Daan", "Sem", "Lucas", "Finn", "Jesse", "Tim", "Bram", "Thijs",
  "Ruben", "Milan", "Stijn", "Luuk", "Thomas", "Max", "Julian", "Daniel",
  "Dylan", "Ryan", "Kevin", "Mike", "Jordy", "Sander", "Niels", "Bas"
];

const DUTCH_LAST_NAMES = [
  "Bomans", "de Vries", "Bakker", "Jansen", "Visser", "Smit", "Mulder", "Bos",
  "Dekker", "Peters", "Hendriks", "Koning", "van Dijk", "Janssen", "van den Berg",
  "van der Linden", "Verhoeven", "Kok", "Jacobs", "de Boer"
];

const OPPONENT_NAMES = [
  "De Zwaluwen", "FC Eindhoven", "Sportclub West", "Ajax Zaal",
  "PSV Futsal", "Vitesse Indoor", "Feyenoord Futsal", "AZ Alkmaar Zaal",
  "FC Utrecht Zaal", "Willem II Futsal", "Heracles Almelo Indoor", "Sparta Rotterdam Zaal"
];

const LOCATIONS = [
  "Sporthal De Wielewaal, Rotterdam",
  "Indoor Arena Eindhoven",
  "Sporthal Zuid, Amsterdam",
  "Sportcentrum Noord",
  "Johan Cruijff Arena (Zaal)",
  "Sportpark Oost",
  "Sporthal Westpoort",
  "Indoor Sportcomplex Utrecht"
];

const COLORS = ["Rood-Wit", "Blauw-Wit", "Geel-Zwart", "Groen-Wit"];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function generateDutchName(): string {
  return `${randomItem(DUTCH_FIRST_NAMES)} ${randomItem(DUTCH_LAST_NAMES)}`;
}

function generateUniqueNames(count: number): string[] {
  const names: string[] = [];
  const used = new Set<string>();

  while (names.length < count) {
    const name = generateDutchName();
    if (!used.has(name)) {
      used.add(name);
      names.push(name);
    }
  }

  return names;
}

export const seedDatabase = mutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    // Check if already seeded
    const existingStatus = await ctx.db.query("seedingStatus").first();
    if (existingStatus?.hasSeeded && !args.force) {
      return { alreadySeeded: true };
    }

    const now = Date.now();
    const today = new Date();

    // Clear existing data if force is true
    if (args.force) {
      const tables = [
        "attendances", "coreMatches", "corePlayers", "coreTeams",
        "lzvPlayerTeamStats", "lzvPlayers", "lzvMatches", "lzvTeams"
      ] as const;

      for (const table of tables) {
        const records = await ctx.db.query(table).collect();
        for (const record of records) {
          await ctx.db.delete(record._id);
        }
      }
    }

    // 1. Create Core Teams
    const teamIds: Id<"coreTeams">[] = [];
    const teamNames = ["Wille ma ni kunne", "FC Degradé"];

    for (const teamName of teamNames) {
      const id = await ctx.db.insert("coreTeams", {
        name: teamName,
        createdAt: now,
        updatedAt: now,
      });
      teamIds.push(id);
    }

    // 2. Create Core Players (12 players with unique names)
    const playerIds: Id<"corePlayers">[] = [];
    const playerNames = generateUniqueNames(12);

    for (const name of playerNames) {
      // Assign to 1-2 random teams
      const numTeams = randomInt(1, 2);
      const playerTeamIds: Id<"coreTeams">[] = [];
      const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);
      for (let j = 0; j < numTeams; j++) {
        playerTeamIds.push(shuffledTeams[j]);
      }

      const id = await ctx.db.insert("corePlayers", {
        name,
        teamIds: playerTeamIds,
        createdAt: now,
        updatedAt: now,
      });
      playerIds.push(id);
    }

    // 3. Create Core Matches (mix of past and future)
    const matchIds: Id<"coreMatches">[] = [];

    // 3 upcoming matches
    for (let i = 0; i < 3; i++) {
      const daysFromNow = (i + 1) * 7 + randomInt(-2, 2);
      const date = new Date(today);
      date.setDate(date.getDate() + daysFromNow);
      date.setHours(20, randomInt(0, 59), 0, 0);

      const teamId = randomItem(teamIds);
      const teamName = teamNames[teamIds.indexOf(teamId)];
      const opponent = randomItem(OPPONENT_NAMES);
      const isHome = Math.random() > 0.5;

      const id = await ctx.db.insert("coreMatches", {
        date: date.getTime(),
        location: randomItem(LOCATIONS),
        name: isHome ? `${teamName} - ${opponent}` : `${opponent} - ${teamName}`,
        teamName: isHome ? teamName : opponent,
        teamId,
        createdAt: now,
        updatedAt: now,
      });
      matchIds.push(id);
    }

    // 3 past matches
    for (let i = 0; i < 3; i++) {
      const daysAgo = (i + 1) * 7 + randomInt(-2, 2);
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(20, randomInt(0, 59), 0, 0);

      const teamId = randomItem(teamIds);
      const teamName = teamNames[teamIds.indexOf(teamId)];
      const opponent = randomItem(OPPONENT_NAMES);
      const isHome = Math.random() > 0.5;

      const id = await ctx.db.insert("coreMatches", {
        date: date.getTime(),
        location: randomItem(LOCATIONS),
        name: isHome ? `${teamName} - ${opponent}` : `${opponent} - ${teamName}`,
        teamName: isHome ? teamName : opponent,
        teamId,
        createdAt: now,
        updatedAt: now,
      });
      matchIds.push(id);
    }

    // 4. Create Attendances for all matches
    for (const matchId of matchIds) {
      for (const playerId of playerIds) {
        const rand = Math.random();
        let status: "Present" | "NotPresent" | "Maybe";
        if (rand < 0.6) status = "Present";
        else if (rand < 0.85) status = "NotPresent";
        else status = "Maybe";

        await ctx.db.insert("attendances", {
          matchId,
          playerId,
          status,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 5. Create LZV Teams (league standings) - 12 teams
    const lzvTeamExternalIds: number[] = [];

    for (let i = 0; i < 12; i++) {
      const externalId = i + 1;
      lzvTeamExternalIds.push(externalId);

      const wins = randomInt(2, 10);
      const draws = randomInt(0, 5);
      const losses = randomInt(1, 8);
      const matchesPlayed = wins + draws + losses;
      const goalsFor = randomInt(30, 80);
      const goalsAgainst = randomInt(20, 60);

      // Generate form (last 5 matches)
      const form: string[] = [];
      for (let j = 0; j < 5; j++) {
        form.push(randomItem(["W", "W", "D", "L", "L"]));
      }

      const teamName = i < 2 ? teamNames[i] : randomItem(OPPONENT_NAMES);
      const hasColors = Math.random() > 0.3;
      const hasManager = Math.random() > 0.5;

      await ctx.db.insert("lzvTeams", {
        externalId,
        name: teamName,
        leagueId: 1,
        leagueName: "Eredivisie Zaalvoetbal",
        rank: i + 1,
        points: wins * 3 + draws,
        matchesPlayed,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        pointsPerMatch: parseFloat(((wins * 3 + draws) / matchesPlayed).toFixed(2)),
        form,
        colors: hasColors ? randomItem(COLORS) : undefined,
        manager: hasManager ? generateDutchName() : undefined,
        description: undefined,
        imageBase64: undefined,
        lastUpdated: now,
        createdAt: now,
      });
    }

    // 6. Create LZV Matches
    for (let i = 0; i < 24; i++) {
      const homeTeamId = randomItem(lzvTeamExternalIds);
      let awayTeamId = randomItem(lzvTeamExternalIds);
      while (awayTeamId === homeTeamId) {
        awayTeamId = randomItem(lzvTeamExternalIds);
      }

      const isPlayed = Math.random() > 0.3;
      const daysOffset = randomInt(-45, 45);
      const date = new Date(today);
      date.setDate(date.getDate() + daysOffset);
      date.setHours(randomItem([19, 20, 21]), randomInt(0, 59), 0, 0);

      // Get team names
      const homeTeam = await ctx.db
        .query("lzvTeams")
        .withIndex("by_external_id", (q) => q.eq("externalId", homeTeamId))
        .unique();
      const awayTeam = await ctx.db
        .query("lzvTeams")
        .withIndex("by_external_id", (q) => q.eq("externalId", awayTeamId))
        .unique();

      await ctx.db.insert("lzvMatches", {
        externalId: `match-${i}`,
        date: date.getTime(),
        homeTeam: homeTeam?.name || `Team ${homeTeamId}`,
        awayTeam: awayTeam?.name || `Team ${awayTeamId}`,
        homeScore: isPlayed ? randomInt(0, 10) : 0,
        awayScore: isPlayed ? randomInt(0, 10) : 0,
        location: randomItem(LOCATIONS),
        teamId: homeTeamId,
        status: isPlayed ? "Played" : "Scheduled",
        createdAt: now,
        updatedAt: now,
      });
    }

    // 7. Create LZV Players and Stats
    const lzvPlayerNames = generateUniqueNames(40);

    for (let i = 0; i < 40; i++) {
      const playerId = await ctx.db.insert("lzvPlayers", {
        externalId: i + 1,
        name: lzvPlayerNames[i],
        lastUpdated: now,
        createdAt: now,
      });

      // Assign to 1-2 teams with stats
      const numTeams = randomInt(1, 2);
      const shuffledTeamIds = [...lzvTeamExternalIds].sort(() => Math.random() - 0.5);

      for (let j = 0; j < numTeams; j++) {
        await ctx.db.insert("lzvPlayerTeamStats", {
          playerId,
          teamId: shuffledTeamIds[j],
          jerseyNumber: randomInt(1, 99),
          gamesPlayed: randomInt(5, 20),
          goals: randomInt(0, 25),
          assists: randomInt(0, 15),
          fairplayRank: randomInt(1, 5),
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Mark as seeded
    if (existingStatus) {
      await ctx.db.patch(existingStatus._id, {
        hasSeeded: true,
        seededAt: now,
      });
    } else {
      await ctx.db.insert("seedingStatus", {
        hasSeeded: true,
        seededAt: now,
      });
    }

    return {
      seeded: true,
      counts: {
        teams: teamIds.length,
        players: playerIds.length,
        matches: matchIds.length,
        lzvTeams: lzvTeamExternalIds.length,
      }
    };
  },
});
