# Shotten Mobile

Expo Router mobile app scaffold for Shotten attendance.

## Goal of this phase

- Select a player
- Show upcoming matches
- Update Yes/No attendance against `https://shotten.taltiko.com/`

The QR flow works via Expo. The Android release pipeline is in `.github/workflows/android-apk-release.yml`.

## GitHub Android release pipeline

Workflow: `Android Release`

Build mode:

- Local EAS build on the GitHub Actions runner (`eas build --local`)
- No EAS cloud build workers are used for this workflow

Triggers:

- Stable release on tag push (`mobile-v*.*.*`) using EAS profile `production`
- Manual preview release (`workflow_dispatch`) using EAS profile `preview` (always prerelease)

Required repository secret:

- `EXPO_TOKEN` (Expo account/token used by EAS CLI for authentication/credentials)

Stable release via tag:

```bash
# trigger stable release via tag
git tag mobile-v0.1.0
git push origin mobile-v0.1.0
```

Manual preview release:

1. Go to `Actions` -> `Android Release` -> `Run workflow`.
2. Leave `preview_tag` empty for an auto-generated tag, or provide your own.
3. Optionally set `release_name`.

After a successful run, the Android artifact appears as an asset under GitHub Releases.

## Commands

Run from the repo root:

```bash
bun run mobile:install
bun run mobile:dev
```

Or directly in `mobile/`:

```bash
bun install
bun run dev
bun run ios
bun run android
bun run test
```

## API configuration

By default the app uses:

- `https://shotten.taltiko.com`

Optionally override with:

- `EXPO_PUBLIC_API_BASE_URL`

Example:

```bash
EXPO_PUBLIC_API_BASE_URL=https://shotten.taltiko.com bun run dev
```
