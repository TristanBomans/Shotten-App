# Shotten Mobile

Expo Router mobiele app scaffold voor Shotten attendance.

## Doel van deze fase

- Speler selecteren
- Upcoming matches tonen
- Ja/Nee attendance updaten tegen `https://shotten.taltiko.com/`

QR flow werkt via Expo. Android release pipeline staat in `.github/workflows/android-apk-release.yml`.

## GitHub Android release pipeline

Workflow: `Android Release`

Triggers:

- stable release op tag push (`mobile-v*.*.*`) met EAS profiel `production`
- preview release handmatig (`workflow_dispatch`) met EAS profiel `preview` (altijd prerelease)

Vereiste repository secret:

- `EXPO_TOKEN` (Expo account/token met rechten om EAS builds te starten)

Stable release via tag:

```bash
# trigger stable release via tag
git tag mobile-v0.1.0
git push origin mobile-v0.1.0
```

Preview release handmatig:

1. Ga naar `Actions` -> `Android Release` -> `Run workflow`.
2. Laat `preview_tag` leeg voor auto-tag, of geef zelf een tag in.
3. Optioneel: vul `release_name` in.

Na een succesvolle run verschijnt het Android artifact als asset onder GitHub Releases.

## Commands

Run vanuit repo root:

```bash
bun run mobile:install
bun run mobile:dev
```

Of direct in `mobile/`:

```bash
bun install
bun run dev
bun run ios
bun run android
bun run test
```

## API configuratie

Standaard gebruikt de app:

- `https://shotten.taltiko.com`

Optioneel overschrijven met:

- `EXPO_PUBLIC_API_BASE_URL`

Voorbeeld:

```bash
EXPO_PUBLIC_API_BASE_URL=https://shotten.taltiko.com bun run dev
```
