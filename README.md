# Shotten App 🏆

An app for our futsal team to track attendance at matches. The app revolves around our two teams: **Fc Degradé** and **Wille Ma ni Kunnen** – everything is centered around these two teams.

## What does the app do?

- **Attendance**: Indicate whether you're attending matches
- **Calendar**: Overview of all upcoming matches
- **Statistics**: Check who has attended the most matches

## Project Structure

The project contains two apps:

### PWA (`pwa/`)
The original Next.js progressive web app:

- `pwa/app/` for the page, layout, manifest, version screen, and API routes
- `pwa/components/` for the dashboard and feature UI
- `pwa/lib/` for Supabase access, data helpers, and shared utilities
- `pwa/scripts/` for build, versioning, and Cloudflare deployment helpers
- `pwa/open-next.config.ts` and `pwa/scripts/build-opennext.sh` for the Cloudflare/OpenNext build pipeline

### Native Mobile (`mobile/`)
A React Native app built with Expo Go, providing a native Android experience alongside the PWA:

- `mobile/src/app/` for screens and navigation
- `mobile/src/components/` for reusable UI components
- `mobile/src/lib/` for API clients, types, and utilities
- `mobile/src/theme/` for the Android dark theme

### Data Sync
The app automatically fetches data from external sources:

| Source | Frequency | What |
|--------|-----------|------|
| [LZV Cup](https://www.lzvcup.be/) | Every night (~midnight) | Full calendar, standings, results |
| Core (iCal) | Every 3-4 hours | Our own matches Fc Degradé & Wille Ma ni Kunnen |

## Hosting & Deployments

### PWA
The PWA runs on **Cloudflare Pages** via the OpenNext adapter.

- **Production**: `main` branch automatically deploys to production
- **Preview**: Each feature branch gets its own preview URL
- **Build**: Happens automatically on every push

### Mobile
The native mobile app is distributed via **GitHub Releases** as an Android APK:

- Push a tag like `mobile-v*.*.*` to trigger a release build
- Preview builds can be created manually via GitHub Actions

## Tech Stack

### PWA
| Technology | Purpose |
|------------|---------|
| [Next.js 14](https://nextjs.org/docs) | React framework with App Router and API routes |
| [React 18](https://react.dev) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Tailwind CSS 4](https://tailwindcss.com/) | Styling |
| [Framer Motion](https://www.framer.com/motion/) | Animations |
| [Lucide React](https://lucide.dev/) | Icons |
| [Recharts](https://recharts.org/) | Charts and analytics |
| [Supabase](https://supabase.com/) | Database and data access |
| [Mistral AI](https://mistral.ai/) | Opponent analysis endpoint |
| [Bun](https://bun.sh/) | Package manager & runtime |
| [OpenNext](https://opennext.js.org/) | Cloudflare deployment adapter |
| [Cloudflare Pages](https://pages.cloudflare.com/) | Hosting |
| [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | Cloudflare CLI |
| `clsx`, `tailwind-merge`, `react-markdown`, `react-tooltip` | Supporting UI and content utilities |

### Mobile
| Technology | Purpose |
|------------|---------|
| [React Native](https://reactnative.dev/) | Native mobile UI |
| [Expo](https://expo.dev/) | Development platform and build tooling |
| [Expo Router](https://docs.expo.dev/router/introduction/) | File-based navigation |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) | Smooth animations |

## Local Development

### Requirements

Install [Bun](https://bun.sh/) on your system:

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows (via PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

### PWA

1. **Install dependencies**:
   ```bash
   cd pwa
   bun install
   ```

2. **Environment variables** - copy `pwa/.env.example` to `pwa/.env.local` and fill in your Supabase credentials

3. **Start the dev server**:
   ```bash
   bun dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Mobile

1. **Install dependencies**:
   ```bash
   cd mobile
   bun install
   ```

2. **Start Expo**:
   ```bash
   bun start
   ```

3. Scan the QR code with the Expo Go app on your Android device

### Useful commands

```bash
# PWA
cd pwa && bun dev          # Start PWA development server
cd pwa && bun run build    # Build PWA for production
cd pwa && bun run lint     # ESLint check
cd pwa && bun run deploy   # Deploy PWA to Cloudflare (manual)

# Mobile
cd mobile && bun start     # Start Expo development server
cd mobile && bun run android   # Run on Android emulator/device
```

## Contributing

Want to make a change? Great!

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Describe your PR clearly**:
   - What is the problem or feature?
   - What is the benefit/value?
   - Screenshots if applicable

3. **Create a Pull Request** to `main`
   - Automatic preview deployment will be created
   - Review by a team member
   - Merge = automatically goes to production

## Bugs or feature requests?

See something that's not right or missing a feature? [Feel free to create an issue](../../issues)! Describe:

- What you expected vs what happened
- Steps to reproduce (for bugs)
- Why it would be useful (for features)

---

_Built with ❤️ for Fc Degradé & Wille Ma ni Kunnen_
