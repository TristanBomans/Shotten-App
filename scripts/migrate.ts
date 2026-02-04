#!/usr/bin/env bun
/**
 * SUPABASE TO CONVEX MIGRATION SCRIPT
 *
 * This script safely migrates data from Supabase to Convex.
 * It reads all data from Supabase, converts it to Convex format,
 * and seeds the Convex database.
 *
 * IMPORTANT: This script ONLY READS from Supabase and WRITES to Convex.
 * It does NOT modify or delete any Supabase data.
 */

import { createClient } from "@supabase/supabase-js";
import { ConvexClient } from "convex/browser";

// =============================================================================
// LOAD ENVIRONMENT VARIABLES
// =============================================================================
function loadEnvFile(): void {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(process.cwd(), '.env.local');

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            // Remove quotes if present
            const cleanValue = value.replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = cleanValue;
            }
          }
        }
      }
    }
  } catch {
    // Ignore errors, fall back to process.env
  }
}

// Load .env.local
loadEnvFile();

// =============================================================================
// CONFIGURATION - Loaded from .env.local or environment
// =============================================================================
// Create a .env.local file with:
//   SUPABASE_URL=https://your-project.supabase.co
//   SUPABASE_ANON_KEY=your-anon-key
//   NEXT_PUBLIC_CONVEX_URL=https://your-convex-app.convex.cloud
//
// Or pass env vars directly:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... bun run migrate
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL?.trim() || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim() || "";
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL?.trim() || "";

// =============================================================================
// TYPES (matching Supabase schema)
// =============================================================================

interface SupabaseCoreTeam {
  id: number;
  name: string;
  created_at: string;
}

interface SupabaseCorePlayer {
  id: number;
  name: string;
  team_ids: number[];
  created_at: string;
}

interface SupabaseCoreMatch {
  id: number;
  date: string;
  location: string | null;
  name: string | null;
  team_name: string | null;
  team_id: number | null;
  created_at: string;
}

interface SupabaseAttendance {
  id: number;
  match_id: number;
  player_id: number;
  status: "Present" | "NotPresent" | "Maybe";
  created_at: string;
}

interface SupabaseLzvTeam {
  id: number;
  external_id: number;
  name: string;
  league_id: number | null;
  league_name: string | null;
  rank: number | null;
  points: number;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points_per_match: number;
  form: string[];
  colors: string | null;
  manager: string | null;
  description: string | null;
  image_base64: string | null;
}

interface SupabaseLzvMatch {
  id: number;
  external_id: string;
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  location: string | null;
  team_id: number;
  status: "Scheduled" | "Played" | "Postponed";
}

interface SupabaseLzvPlayer {
  id: number;
  external_id: number;
  name: string;
}

interface SupabaseLzvPlayerTeamStats {
  id: number;
  player_id: number;
  team_id: number;
  jersey_number: number | null;
  games_played: number;
  goals: number;
  assists: number;
  fairplay_rank: number | null;
}

// =============================================================================
// MIGRATION SCRIPT
// =============================================================================

async function migrate() {
  console.log("🚀 Starting Supabase to Convex migration...\n");

  // Validate configuration
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("❌ Missing Supabase credentials.");
    console.error("");
    console.error("Make sure your .env.local file contains:");
    console.error("  SUPABASE_URL=https://your-project.supabase.co");
    console.error("  SUPABASE_ANON_KEY=your-anon-key");
    console.error("");
    console.error("Current values:");
    console.error(`  SUPABASE_URL: ${SUPABASE_URL ? '✓ set' : '✗ missing'}`);
    console.error(`  SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? '✓ set' : '✗ missing'}`);
    console.error(`  NEXT_PUBLIC_CONVEX_URL: ${CONVEX_URL ? '✓ set' : '✗ missing'}`);
    process.exit(1);
  }

  if (!CONVEX_URL) {
    console.error("❌ Missing Convex URL. Set NEXT_PUBLIC_CONVEX_URL env var.");
    process.exit(1);
  }

  // Initialize clients
  console.log("📡 Connecting to Supabase...");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log("📡 Connecting to Convex...");
  const convex = new ConvexClient(CONVEX_URL);

  // ID mapping stores (Supabase ID -> Convex ID)
  const teamIdMap = new Map<number, string>();
  const playerIdMap = new Map<number, string>();
  const matchIdMap = new Map<number, string>();
  const lzvTeamIdMap = new Map<number, string>();
  const lzvPlayerIdMap = new Map<number, string>();

  try {
    // =========================================================================
    // STEP 1: Migrate Core Teams
    // =========================================================================
    console.log("\n📦 Migrating Core Teams...");
    const { data: coreTeams, error: coreTeamsError } = await supabase
      .from("core_teams")
      .select("*");

    if (coreTeamsError) throw coreTeamsError;
    console.log(`   Found ${coreTeams?.length || 0} core teams`);

    for (const team of coreTeams || []) {
      const convexId = await convex.mutation("mutations/core:createTeam", {
        name: team.name,
      });
      teamIdMap.set(team.id, convexId);
      console.log(`   ✓ Team "${team.name}" -> ${convexId}`);
    }

    // =========================================================================
    // STEP 2: Migrate Core Players
    // =========================================================================
    console.log("\n📦 Migrating Core Players...");
    const { data: corePlayers, error: corePlayersError } = await supabase
      .from("core_players")
      .select("*");

    if (corePlayersError) throw corePlayersError;
    console.log(`   Found ${corePlayers?.length || 0} core players`);

    for (const player of corePlayers || []) {
      // Convert Supabase team_ids (integers) to Convex team IDs (strings)
      const convexTeamIds = player.team_ids
        .map((tid) => teamIdMap.get(tid))
        .filter((tid): tid is string => tid !== undefined);

      const convexId = await convex.mutation("mutations/core:createPlayer", {
        name: player.name,
        teamIds: convexTeamIds,
      });
      playerIdMap.set(player.id, convexId);
      console.log(`   ✓ Player "${player.name}" -> ${convexId}`);
    }

    // =========================================================================
    // STEP 3: Migrate Core Matches
    // =========================================================================
    console.log("\n📦 Migrating Core Matches...");
    const { data: coreMatches, error: coreMatchesError } = await supabase
      .from("core_matches")
      .select("*");

    if (coreMatchesError) throw coreMatchesError;
    console.log(`   Found ${coreMatches?.length || 0} core matches`);

    for (const match of coreMatches || []) {
      const convexTeamId = match.team_id ? teamIdMap.get(match.team_id) : undefined;

      // Use createMatch (which no longer creates automatic attendances)
      const convexId = await convex.mutation("mutations/core:createMatch", {
        date: new Date(match.date).getTime(),
        location: match.location || undefined,
        name: match.name || undefined,
        teamName: match.team_name || undefined,
        teamId: convexTeamId,
      });
      matchIdMap.set(match.id, convexId);
      console.log(`   ✓ Match "${match.name}" -> ${convexId}`);
    }

    // =========================================================================
    // STEP 4: Migrate Attendances
    // =========================================================================
    console.log("\n📦 Migrating Attendances...");
    const { data: attendances, error: attendancesError } = await supabase
      .from("attendances")
      .select("*");

    if (attendancesError) throw attendancesError;
    console.log(`   Found ${attendances?.length || 0} attendances`);

    let attendanceCount = 0;
    for (const att of attendances || []) {
      const convexMatchId = matchIdMap.get(att.match_id);
      const convexPlayerId = playerIdMap.get(att.player_id);

      if (!convexMatchId || !convexPlayerId) {
        console.warn(`   ⚠ Skipping attendance ${att.id}: missing match or player mapping`);
        continue;
      }

      await convex.mutation("mutations/core:updateAttendance", {
        matchId: convexMatchId,
        playerId: convexPlayerId,
        status: att.status,
      });
      console.log(`   ✓ Attendance ${att.id}: ${att.status} (match ${att.match_id} -> player ${att.player_id})`);
      attendanceCount++;
    }
    console.log(`   ✓ Migrated ${attendanceCount} attendances`);

    // =========================================================================
    // STEP 5: Migrate LZV Teams
    // =========================================================================
    console.log("\n📦 Migrating LZV Teams...");
    const { data: lzvTeams, error: lzvTeamsError } = await supabase
      .from("lzv_teams")
      .select("*");

    if (lzvTeamsError) throw lzvTeamsError;
    console.log(`   Found ${lzvTeams?.length || 0} LZV teams`);

    for (const team of lzvTeams || []) {
      const convexId = await convex.mutation("mutations/lzv:createTeam", {
        externalId: team.external_id,
        name: team.name,
        leagueId: team.league_id ?? undefined,
        leagueName: team.league_name ?? undefined,
        rank: team.rank ?? undefined,
        points: team.points,
        matchesPlayed: team.matches_played,
        wins: team.wins,
        draws: team.draws,
        losses: team.losses,
        goalsFor: team.goals_for,
        goalsAgainst: team.goals_against,
        goalDifference: team.goal_difference,
        pointsPerMatch: team.points_per_match,
        form: team.form,
        colors: team.colors ?? undefined,
        manager: team.manager ?? undefined,
        description: team.description ?? undefined,
        imageBase64: team.image_base64 ?? undefined,
      });
      lzvTeamIdMap.set(team.id, convexId);
      console.log(`   ✓ LZV Team "${team.name}" -> ${convexId}`);
    }

    // =========================================================================
    // STEP 6: Migrate LZV Matches
    // =========================================================================
    console.log("\n📦 Migrating LZV Matches...");
    const { data: lzvMatches, error: lzvMatchesError } = await supabase
      .from("lzv_matches")
      .select("*");

    if (lzvMatchesError) throw lzvMatchesError;
    console.log(`   Found ${lzvMatches?.length || 0} LZV matches`);

    for (const match of lzvMatches || []) {
      // Find the corresponding LZV team
      let convexTeamId: string | undefined;
      for (const [supabaseTeamId, convexId] of lzvTeamIdMap.entries()) {
        if (supabaseTeamId === match.team_id) {
          convexTeamId = convexId;
          break;
        }
      }

      await convex.mutation("mutations/lzv:createMatch", {
        externalId: match.external_id,
        date: new Date(match.date).getTime(),
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        homeScore: match.home_score,
        awayScore: match.away_score,
        location: match.location ?? undefined,
        teamId: match.team_id,
        status: match.status,
      });
      console.log(`   ✓ LZV Match ${match.home_team} vs ${match.away_team}`);
    }

    // =========================================================================
    // STEP 7: Migrate LZV Players
    // =========================================================================
    console.log("\n📦 Migrating LZV Players...");
    const { data: lzvPlayers, error: lzvPlayersError } = await supabase
      .from("lzv_players")
      .select("*");

    if (lzvPlayersError) throw lzvPlayersError;
    console.log(`   Found ${lzvPlayers?.length || 0} LZV players`);

    for (const player of lzvPlayers || []) {
      const convexId = await convex.mutation("mutations/lzv:createPlayer", {
        externalId: player.external_id,
        name: player.name,
      });
      lzvPlayerIdMap.set(player.id, convexId);
      console.log(`   ✓ LZV Player "${player.name}" -> ${convexId}`);
    }

    // =========================================================================
    // STEP 8: Migrate LZV Player Team Stats
    // =========================================================================
    console.log("\n📦 Migrating LZV Player Team Stats...");
    const { data: lzvStats, error: lzvStatsError } = await supabase
      .from("lzv_player_team_stats")
      .select("*");

    if (lzvStatsError) throw lzvStatsError;
    console.log(`   Found ${lzvStats?.length || 0} player team stats`);

    for (const stats of lzvStats || []) {
      const convexPlayerId = lzvPlayerIdMap.get(stats.player_id);

      if (!convexPlayerId) {
        console.warn(`   ⚠ Skipping stats ${stats.id}: missing player mapping`);
        continue;
      }

      await convex.mutation("mutations/lzv:createPlayerTeamStats", {
        playerId: convexPlayerId,
        teamId: stats.team_id,
        jerseyNumber: stats.jersey_number ?? undefined,
        gamesPlayed: stats.games_played,
        goals: stats.goals,
        assists: stats.assists,
        fairplayRank: stats.fairplay_rank ?? undefined,
      });
      console.log(`   ✓ Stats for player ${stats.player_id} on team ${stats.team_id}`);
    }

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log("\n" + "=".repeat(60));
    console.log("✅ MIGRATION COMPLETE!");
    console.log("=".repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   Core Teams: ${teamIdMap.size}`);
    console.log(`   Core Players: ${playerIdMap.size}`);
    console.log(`   Core Matches: ${matchIdMap.size}`);
    console.log(`   Attendances: ${attendanceCount}`);
    console.log(`   LZV Teams: ${lzvTeamIdMap.size}`);
    console.log(`   LZV Players: ${lzvPlayerIdMap.size}`);
    console.log(`\n📝 Note: Supabase data is untouched and preserved.`);

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    convex.close();
  }
}

// Run the migration
migrate();
