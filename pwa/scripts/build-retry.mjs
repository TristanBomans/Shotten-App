#!/usr/bin/env bun
import { execSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

async function runWithRetry(command, maxRetries = MAX_RETRIES) {
  let attempt = 1;
  let lastError = null;

  console.log(`Starting build attempt 1 of ${maxRetries}...`);

  while (attempt <= maxRetries) {
    try {
      console.log(`\n=== Attempt ${attempt}/${maxRetries} ===`);
      execSync(command, { stdio: "inherit" });
      console.log(`\n✅ Success! Build completed on attempt ${attempt}`);
      return true;
    } catch (error) {
      lastError = error;
      console.error(`\n❌ Attempt ${attempt} failed:`);
      console.error(`Error code: ${error.status || 'unknown'}`);
      
      if (attempt < maxRetries) {
        console.log(`\n🔄 Retrying in ${RETRY_DELAY_MS/1000} seconds...`);
        await setTimeout(RETRY_DELAY_MS);
        attempt++;
      }
    }
  }

  console.error(`\n💥 All ${maxRetries} attempts failed.`);
  console.error("Last error:", lastError.message);
  return false;
}

// Main execution
console.log("🚀 Starting persistent build process...");
console.log("Command: bun run build:cf");
console.log(`Max retries: ${MAX_RETRIES}`);
console.log(`Retry delay: ${RETRY_DELAY_MS/1000} seconds`);

const success = await runWithRetry("bun run build:cf");
process.exit(success ? 0 : 1);