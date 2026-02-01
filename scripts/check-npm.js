#!/usr/bin/env node
// Blocks npm but allows bun
const userAgent = process.env.npm_config_user_agent || '';

if (userAgent.includes('npm') && !userAgent.includes('bun')) {
  console.error('Error: Use "bun run dev" instead of "npm run dev"');
  process.exit(1);
}

// bun passes through
process.exit(0);
