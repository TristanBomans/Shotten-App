#!/bin/bash
set -e

echo "📦 Preparing for Cloudflare Pages deployment..."

# Copy worker to assets as _worker.js
cp .open-next/worker.js .open-next/assets/_worker.js

# Copy worker dependencies
cp -r .open-next/cloudflare .open-next/assets/
cp -r .open-next/middleware .open-next/assets/
cp -r .open-next/server-functions .open-next/assets/
cp -r .open-next/.build .open-next/assets/

echo "✅ Cloudflare Pages deployment ready"
