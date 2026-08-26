# Shotten App

An app for our futsal team to track attendance at matches. The app revolves around our two teams: **Fc Degradé** and **Wille Ma ni Kunnen** – everything is centered around these two teams.

Production URL: **https://shotten.taltiko.com**

## What does the app do?

- **Attendance**: Indicate whether you're attending matches
- **Calendar**: Overview of all upcoming matches
- **Statistics**: Check who has attended the most matches
- **League**: Standings, results, and opponent info scraped from the LZV Cup
- **Opponent analysis**: AI-generated scouting notes for upcoming opponents

## Project Structure

The project contains two apps:

### PWA (`pwa/`)
The Next.js progressive web app — the primary client:

- `pwa/app/` for the page, layout, manifest, and API routes
  - `pwa/app/api/` REST API: `Matches`, `Players`, `Teams` (core data), `lzv/` (scraper data), `ai/opponent-analysis`
- `pwa/components/` for the dashboard, feature UI, and page components (`components/Pages/`)
- `pwa/lib/` for Supabase access, data helpers, and shared utilities
- `pwa/scripts/` for build, versioning, and Cloudflare deployment helpers
- `pwa/supabase/` for the SQL schema and migrations
- `pwa/open-next.config.ts` and `pwa/scripts/build-opennext.sh` for the Cloudflare/OpenNext build pipeline

### Native Mobile (`mobile/`)
A React Native app built with Expo, providing a native Android experience alongside the PWA:

- `mobile/src/app/` for screens and navigation (Expo Router, file-based `(tabs)/`)
- `mobile/src/components/` for reusable UI components
- `mobile/src/lib/` for API clients, types, and utilities
- `mobile/src/state/` for session and preferences context
- `mobile/src/theme/` for the Android dark theme

### Data Sync
External data is fetched by a separate backend worker ([`shotten-backend-node`](../shotten-backend-node)) and written to the shared Supabase database. The app reads from that same database.

| Source | Frequency | What |
|--------|-----------|------|
| [LZV Cup](https://www.lzvcup.be/) | Daily at 03:00 | Full calendar, standings, results, player stats |
| Core (iCal) | Every 4 hours | Our own matches Fc Degradé & Wille Ma ni Kunnen |
| Supabase DB backup | Daily at 02:00 | `pg_dump` of the full database |

## Hosting & Deployments

### PWA
The PWA runs on **Cloudflare Pages** via the OpenNext adapter.

- **Trigger**: every push that touches `pwa/**` deploys, using the branch name as the Cloudflare Pages branch
- **Production**: pushes to `main` go to production
- **Preview**: every other branch gets its own preview URL
- **Build**: happens automatically on every push via `.github/workflows/deploy-pages.yml`

### Mobile
The native mobile app is distributed via **GitHub Releases** as an Android APK:

- Push a tag like `mobile-v*.*.*` to trigger a stable release build (EAS profile `production`)
- Manual preview builds via GitHub Actions `workflow_dispatch` (EAS profile `preview`, always prerelease)
- Build mode is local EAS build on the runner — no EAS cloud build workers

## Tech Stack

### PWA
| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/docs) | React framework with App Router and API routes |
| [React 19](https://react.dev) | UI library |
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
| [Wrangler 4](https://developers.cloudflare.com/workers/wrangler/) | Cloudflare CLI |
| `clsx`, `tailwind-merge`, `react-markdown`, `remark-gfm`, `react-tooltip` | Supporting UI and content utilities |

### Mobile
| Technology | Purpose |
|------------|---------|
| [React Native 0.81](https://reactnative.dev/) | Native mobile UI |
| [Expo 54](https://expo.dev/) | Development platform and build tooling |
| [Expo Router 6](https://docs.expo.dev/router/introduction/) | File-based navigation |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/) | Touch and gesture handling |
| [React Native Screens / Safe Area Context](https://reactnavigation.dev/) | Native navigation primitives |
| [React Native SVG](https://github.com/software-mansion/react-native-svg) | Vector graphics |
| [Expo Linear Gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/) | Gradient backgrounds |
| [Async Storage](https://react-native-async-storage.github.io/async-storage/) | Local persistence |
| [Vitest](https://vitest.dev/) | Unit tests |

## Local Development

### Requirements

- [Bun](https://bun.sh/) (package manager & runtime, `bun@1.3.6`)
- Node 22 (see `.nvmrc`)

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

2. **Environment variables** - copy `pwa/.env.example` to `pwa/.env.local` and fill in your values:
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
   - `SUPABASE_SERVICE_KEY` — Supabase service key (server-side writes; falls back to anon if unset)
   - `MISTRAL_API_KEY` — Mistral API key for the opponent-analysis endpoint

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

By default the mobile app targets `https://shotten.taltiko.com`. Override with `EXPO_PUBLIC_API_BASE_URL` if needed.

### Useful commands

```bash
# PWA
cd pwa && bun dev                # Start PWA development server
cd pwa && bun run build          # Next.js build (webpack)
cd pwa && bun run build:cf       # Build PWA for Cloudflare Pages (OpenNext)
cd pwa && bun run preview        # Build + local wrangler preview
cd pwa && bun run deploy         # Build + deploy to Cloudflare Pages
cd pwa && bun run lint           # ESLint check

# Mobile
cd mobile && bun start           # Start Expo development server
cd mobile && bun run android     # Run on Android emulator/device
cd mobile && bun run test        # Run unit tests (Vitest)
cd mobile && bun run typecheck   # TypeScript check
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

_Built for Fc Degradé & Wille Ma ni Kunnen_
