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

cp .open-next/worker.js .open-next/assets/_worker.js

copy_if_present() {
  local src="$1"
  local dest="$2"
  if [ -e "$src" ]; then
    cp -R "$src" "$dest"
  else
    echo "ℹ Skipping missing OpenNext path: $src"
  fi
}

copy_if_present .open-next/cloudflare .open-next/assets/cloudflare
copy_if_present .open-next/middleware .open-next/assets/middleware
copy_if_present .open-next/server-functions .open-next/assets/server-functions
copy_if_present .open-next/.build .open-next/assets/.build

echo "✅ Cloudflare Pages deployment ready"
