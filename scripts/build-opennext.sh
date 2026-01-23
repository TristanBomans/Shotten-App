#!/bin/bash
set -e

# Unshallow git repository if needed (for Cloudflare Pages shallow clones)
echo "Ensuring git history is available..."
git fetch --unshallow 2>/dev/null || echo "ℹ Git unshallow not needed or failed (this is OK)"

# Use npx directly to avoid bun's automatic translation
exec "$(which npx)" @opennextjs/cloudflare build
