# Shotten Mobile

Expo Router mobiele app scaffold voor Shotten attendance.

## Doel van deze fase

- Speler selecteren
- Upcoming matches tonen
- Ja/Nee attendance updaten tegen `https://shotten.taltiko.com/`

QR flow werkt via Expo. APK release pipeline staat nu in `.github/workflows/android-apk-release.yml`.

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
