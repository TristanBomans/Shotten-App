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

## Project Structure

### PWA (`pwa/`)

The Next.js progressive web app — this is what we build and deploy:

- `pwa/app/` for the page, layout, manifest, and API routes
  - `pwa/app/api/` REST API: `Matches`, `Players`, `Teams` (core data), `lzv/` (scraper data), `ai/opponent-analysis`
- `pwa/components/` for the dashboard, feature UI, and page components (`components/Pages/`)
- `pwa/lib/` for Supabase access, data helpers, and shared utilities
- `pwa/scripts/` for build, versioning, and Cloudflare deployment helpers
- `pwa/supabase/` for the SQL schema and migrations
- `pwa/open-next.config.ts` and `pwa/scripts/build-opennext.sh` for the Cloudflare/OpenNext build pipeline

### Data Sync

External data is fetched by a separate backend worker ([`shotten-backend-node`](../shotten-backend-node)) and written to the shared Supabase database. The app reads from that same database.

| Source | Frequency | What |
|--------|-----------|------|
| [LZV Cup](https://www.lzvcup.be/) | Daily at 03:00 | Full calendar, standings, results, player stats |
| Core (iCal) | Every 4 hours | Our own matches Fc Degradé & Wille Ma ni Kunnen |
| Supabase DB backup | Daily at 02:00 | `pg_dump` of the full database |

## Hosting & Deployments

The PWA runs on **Cloudflare Pages** via the OpenNext adapter.

- **Trigger**: every push that touches `pwa/**` deploys, using the branch name as the Cloudflare Pages branch
- **Production**: pushes to `main` go to production
- **Preview**: every other branch gets its own preview URL
- **Build**: happens automatically on every push via `.github/workflows/deploy-pages.yml`

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
   - `SUPABASE_SERVICE_KEY` — Supabase service key (server-side writes; falls back to anon if unset)
   - `OPENROUTER_API_KEY` — OpenRouter key for opponent analysis and release-note generation

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
