#!/bin/bash
set -e

# Unshallow git repository if needed (for Cloudflare Pages shallow clones)
echo "Ensuring git history is available..."
git fetch --unshallow 2>/dev/null || echo "ℹ Git unshallow not needed or failed (this is OK)"

# Use npx directly to avoid bun's automatic translation
# Skip preflight check since this script runs during bun build but uses npx
export SKIP_PREFLIGHT_CHECK=true
exec "$(which npx)" @opennextjs/cloudflare build
