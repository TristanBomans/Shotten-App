#!/usr/bin/env bun
/**
 * CONVEX DATABASE RESET SCRIPT
 *
 * This script deletes ALL data from Convex tables.
 * Use this before re-running the migration to avoid duplicates.
 *
 * WARNING: This permanently deletes all data in Convex!
 */

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
            const cleanValue = value.replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = cleanValue;
            }
          }
        }
      }
    }
  } catch {
    // Ignore errors
  }
}

loadEnvFile();

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL?.trim() || "";

async function resetDatabase() {
  console.log("🗑️  Resetting Convex database...\n");

  if (!CONVEX_URL) {
    console.error("❌ Missing Convex URL.");
    console.error("");
    console.error("Make sure your .env.local file contains:");
    console.error("  NEXT_PUBLIC_CONVEX_URL=https://your-app.convex.cloud");
    console.error("");
    console.error("Current value:");
    console.error(`  NEXT_PUBLIC_CONVEX_URL: ${CONVEX_URL ? '✓ set' : '✗ missing'}`);
    process.exit(1);
  }

  console.log("📡 Connecting to Convex...");
  const convex = new ConvexClient(CONVEX_URL);

  try {
    console.log("⚠️  Deleting all data from tables...\n");

    // Delete all data from core tables
    await convex.mutation("mutations/reset:deleteAllAttendances");
    console.log("   ✓ Deleted all attendances");

    await convex.mutation("mutations/reset:deleteAllMatches");
    console.log("   ✓ Deleted all core matches");

    await convex.mutation("mutations/reset:deleteAllPlayers");
    console.log("   ✓ Deleted all core players");

    await convex.mutation("mutations/reset:deleteAllTeams");
    console.log("   ✓ Deleted all core teams");

    await convex.mutation("mutations/reset:deleteAllLzvMatches");
    console.log("   ✓ Deleted all LZV matches");

    await convex.mutation("mutations/reset:deleteAllLzvPlayerStats");
    console.log("   ✓ Deleted all LZV player stats");

    await convex.mutation("mutations/reset:deleteAllLzvPlayers");
    console.log("   ✓ Deleted all LZV players");

    await convex.mutation("mutations/reset:deleteAllLzvTeams");
    console.log("   ✓ Deleted all LZV teams");

    console.log("\n" + "=".repeat(60));
    console.log("✅ DATABASE RESET COMPLETE!");
    console.log("=".repeat(60));
    console.log("\nYou can now run: bun run migrate");

  } catch (error) {
    console.error("\n❌ Reset failed:", error);
    process.exit(1);
  } finally {
    convex.close();
  }
}

// Confirm before deleting
console.log("⚠️  WARNING: This will delete ALL data from Convex!");
console.log("Tables to clear: coreTeams, corePlayers, coreMatches, attendances");
console.log("                 lzvTeams, lzvMatches, lzvPlayers, lzvPlayerTeamStats\n");

// Check for --force flag to skip confirmation
if (process.argv.includes("--force")) {
  resetDatabase();
} else {
  console.log("Run with --force to confirm:");
  console.log("  bun run reset:db -- --force\n");
  process.exit(0);
}
