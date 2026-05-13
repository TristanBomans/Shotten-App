#!/bin/bash
set -e

# Unshallow git repository if needed (for Cloudflare Pages shallow clones)
echo "Ensuring git history is available..."
git fetch --unshallow 2>/dev/null || echo "ℹ Git unshallow not needed or failed (this is OK)"

# Use npx directly to avoid bun's automatic translation
# Skip preflight check since this script runs during bun build.
export SKIP_PREFLIGHT_CHECK=true

OPENNEXT_CLI="./node_modules/.bin/opennextjs-cloudflare"
if [ ! -x "$OPENNEXT_CLI" ]; then
  echo "❌ OpenNext Cloudflare CLI not found. Run bun install first."
  exit 1
fi

exec "$OPENNEXT_CLI" build
