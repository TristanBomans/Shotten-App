#!/bin/bash
set -euo pipefail

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

# Pages Git compiles a single _worker.js file with wrangler 3.114.17, which
# miscompiles OpenNext. Bundle with the project wrangler (>= 4.33), then emit a
# _worker.js directory so Pages uploads that bundle without re-running esbuild.
STAGE="$(mktemp -d)"
BUNDLE_OUT="$(mktemp -d)"
cleanup() {
  rm -rf "$STAGE" "$BUNDLE_OUT"
}
trap cleanup EXIT

cp .open-next/worker.js "$STAGE/index.js"

copy_if_present() {
  local src="$1"
  local dest="$2"
  if [ -e "$src" ]; then
    cp -R "$src" "$dest"
  else
    echo "ℹ Skipping missing OpenNext path: $src"
  fi
}

copy_if_present .open-next/cloudflare "$STAGE/cloudflare"
copy_if_present .open-next/middleware "$STAGE/middleware"
copy_if_present .open-next/server-functions "$STAGE/server-functions"
copy_if_present .open-next/.build "$STAGE/.build"

WRANGLER="./node_modules/.bin/wrangler"
if [ ! -x "$WRANGLER" ]; then
  echo "❌ wrangler not found. Run bun install first."
  exit 1
fi

cat > "$STAGE/wrangler.json" <<EOF
{
  "name": "shotten-pages-bundle",
  "main": "index.js",
  "compatibility_date": "2026-08-15",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"]
}
EOF

echo "Bundling Pages worker with $($WRANGLER --version)..."
"$WRANGLER" deploy --dry-run --outdir "$BUNDLE_OUT" --config "$STAGE/wrangler.json"

BUNDLED_WORKER=""
for candidate in "$BUNDLE_OUT/index.js" "$BUNDLE_OUT/_worker.js"; do
  if [ -f "$candidate" ]; then
    BUNDLED_WORKER="$candidate"
    break
  fi
done
if [ -z "$BUNDLED_WORKER" ]; then
  echo "❌ Wrangler did not produce a bundled worker script"
  ls -la "$BUNDLE_OUT"
  exit 1
fi

mkdir -p .open-next/assets/_worker.js
cp "$BUNDLED_WORKER" .open-next/assets/_worker.js/index.js

echo "✅ Cloudflare Pages deployment ready"
