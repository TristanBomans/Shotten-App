# Shotten Mobile

Expo Router mobiele app scaffold voor Shotten attendance.

## Doel van deze fase

- Speler selecteren
- Upcoming matches tonen
- Ja/Nee attendance updaten tegen `https://shotten.taltiko.com/`

QR flow werkt via Expo. APK release pipeline staat nu in `.github/workflows/android-apk-release.yml`.

## GitHub APK release pipeline

Workflow: `Android APK Release`

Triggers:

- handmatig (`workflow_dispatch`)
- automatisch op tags die matchen met `mobile-v*`

Vereiste repository secret:

- `EXPO_TOKEN` (Expo account/token met rechten om EAS builds te starten)

Snelle flow:

```bash
# trigger via tag
git tag mobile-v0.1.0
git push origin mobile-v0.1.0
```

Na een succesvolle run verschijnt de APK als asset onder GitHub Releases.

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
