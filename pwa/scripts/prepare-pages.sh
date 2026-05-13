#!/bin/bash
set -e

echo "📦 Preparing for Cloudflare Pages deployment..."

if [ ! -f .open-next/worker.js ] || [ ! -d .open-next/assets ]; then
  echo "❌ OpenNext output is missing. Run the OpenNext build first."
  exit 1
fi

rm -rf \
  .open-next/assets/_worker.js \
  .open-next/assets/cloudflare \
  .open-next/assets/middleware \
  .open-next/assets/server-functions \
  .open-next/assets/.build

# Copy worker to assets as _worker.js
cp .open-next/worker.js .open-next/assets/_worker.js

# Copy worker dependencies
cp -R .open-next/cloudflare .open-next/assets/cloudflare
cp -R .open-next/middleware .open-next/assets/middleware
cp -R .open-next/server-functions .open-next/assets/server-functions
cp -R .open-next/.build .open-next/assets/.build

echo "✅ Cloudflare Pages deployment ready"
