# Shotten App

An app for our futsal team to track attendance at matches. The app revolves around our two teams: **Fc Degradé** and **Wille Ma ni Kunnen**.

The product is the **PWA** in `pwa/`.

Production URL: **https://shotten.taltiko.com**

## What does the app do?

- **Attendance**: Indicate whether you're attending matches
- **Calendar**: Overview of all upcoming matches
- **Statistics**: Check who has attended the most matches
- **League**: Standings, results, and opponent info scraped from the LZV Cup
- **Opponent analysis**: AI-generated scouting notes for upcoming opponents
- **Match reminders**: Web Push notifications to answer attendance and before kickoff

## Project Structure

### PWA (`pwa/`)

The Next.js progressive web app — this is what we build and deploy:

- `pwa/app/` for the page, layout, manifest, and API routes
  - `pwa/app/api/` REST API: `Matches`, `Players`, `Teams` (core data), `lzv/` (scraper data), `ai/opponent-analysis`, `push/` (Web Push subscriptions)
- `pwa/components/` for the dashboard, feature UI, and page components (`components/Pages/`)
- `pwa/lib/` for Supabase access, data helpers, and shared utilities
- `pwa/scripts/` for build, versioning, and Cloudflare deployment helpers
- `pwa/supabase/` for the SQL schema and migrations
- `pwa/open-next.config.ts` and `pwa/scripts/build-opennext.sh` for the Cloudflare/OpenNext build pipeline

### Backend worker

Everything that runs on a schedule lives in a separate repo, [`shotten-backend-node`](https://github.com/TristanBomans/shotten-backend-node), which writes to the same Supabase database the app reads from.

| Job | Frequency | What |
|-----|-----------|------|
| [LZV Cup](https://www.lzvcup.be/) scrape | Daily at 03:00 | Full calendar, standings, results, player stats, lineups |
| Core (iCal) sync | Every 4 hours | Our own matches Fc Degradé & Wille Ma ni Kunnen |
| Match reminders | Every minute | Sends due Web Push notifications |
| Supabase DB backup | Daily at 02:00 | `pg_dump` of the full database |

### Database access

The browser never talks to Supabase directly. Row Level Security allows public **reads** only; every write goes through the PWA's API routes or the backend worker using the service key, which bypasses RLS.

### Push notifications

The app subscribes a device through `/api/push/subscribe`, which stores the subscription in Supabase (`push_subscriptions`, not readable with the anon key). The backend worker decides which reminders are due and sends them with the VAPID private key. The public half is `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; if the key pair ever changes, devices re-subscribe automatically the next time the app opens.

## Hosting & Deployments

The PWA runs on **Cloudflare Pages** via the OpenNext adapter.

- **Trigger**: every push that touches `pwa/**` deploys, using the branch name as the Cloudflare Pages branch
- **Production**: pushes to `main` go to production
- **Preview**: every other branch gets its own preview URL
- **Build**: happens automatically on every push via `.github/workflows/deploy-pages.yml`

The workflow needs these **GitHub Actions secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `OPENROUTER_API_KEY` (it syncs the last one to Pages itself).

`SUPABASE_SERVICE_KEY` is a **Cloudflare Pages secret**, set for both the production and preview environments:

```bash
cd pwa && bunx wrangler pages secret put SUPABASE_SERVICE_KEY --project-name shotten-app --env production
```

Pages snapshots secrets per deployment, so redeploy after changing one.

## Setting it up for your own team

1. **Fork** this repo and [`shotten-backend-node`](https://github.com/TristanBomans/shotten-backend-node).
2. **Supabase**: create a project. Open the app once; the setup wizard shows the SQL to run in the Supabase SQL Editor and then creates your first team from its LZV team ID. Players are added in the app afterwards.
3. **Web Push keys**: run `npx web-push generate-vapid-keys` once. The public key goes into the PWA, the private key into the backend.
4. **Replace our values** before your first deploy:
   - `pwa/wrangler.json` → Supabase URL, anon key, VAPID public key
   - `.github/workflows/deploy-pages.yml` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the Pages `--project-name`
   - `pwa/components/Pages/HiddenAdminPage.tsx` and `pwa/components/Dashboard.tsx` → the backend address (`192.168.129.250:8094`), or leave it; only the hidden admin tools and the backend health check use it
5. **Cloudflare Pages**: create the project, add the secrets from [Hosting & Deployments](#hosting--deployments) and push to `main`.
6. **Backend**: follow the [backend README](https://github.com/TristanBomans/shotten-backend-node#running-it-for-your-own-team).

## Tech Stack

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
| [OpenRouter](https://openrouter.ai/) | OpenAI-powered opponent analysis and release notes |
| [Bun](https://bun.sh/) | Package manager & runtime |
| [OpenNext](https://opennext.js.org/) | Cloudflare deployment adapter |
| [Cloudflare Pages](https://pages.cloudflare.com/) | Hosting |
| [Wrangler 4](https://developers.cloudflare.com/workers/wrangler/) | Cloudflare CLI |
| `clsx`, `tailwind-merge`, `react-markdown`, `remark-gfm`, `react-tooltip` | Supporting UI and content utilities |

## Local Development

Install [Bun](https://bun.sh/) on your system (`bun@1.3.6`). Node 22 is in `.nvmrc`.

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows (via PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

1. **Install dependencies**:
   ```bash
   cd pwa
   bun install
   ```

2. **Environment variables** - copy `pwa/.env.example` to `pwa/.env.local` and fill in your values:
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
   - `NEXT_PUBLIC_APP_ICON_URL` — optional custom app icon URL
   - `NEXT_PUBLIC_APP_MASKABLE_ICON_URL` — optional Android-safe maskable icon URL
   - `SUPABASE_SERVICE_KEY` — Supabase service key, required for every write (the database only allows public reads)
   - `OPENROUTER_API_KEY` — OpenRouter key for opponent analysis and release-note generation
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — Web Push public key (must match the backend's `VAPID_PUBLIC_KEY`)

   New databases get everything from the setup wizard. Existing databases apply the files in
   `pwa/supabase/migrations/` they don't have yet, in order, in the Supabase SQL Editor.

3. **Start the dev server**:
   ```bash
   bun dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

```bash
cd pwa && bun dev                # Start development server
cd pwa && bun run build          # Next.js build (webpack)
cd pwa && bun run build:cf       # Build for Cloudflare Pages (OpenNext)
cd pwa && bun run preview        # Build + local wrangler preview
cd pwa && bun run deploy         # Build + deploy to Cloudflare Pages
cd pwa && bun run lint           # ESLint check
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

<details>
<summary>Deprecated native app (do not use)</summary>

`mobile/` is a frozen Expo/React Native Android app. It is **not** under active development. Do not add features, fix bugs, or open PRs against it unless explicitly asked. Notes live in `mobile/README.md`.
</details>
