# Shotten App 🏆

An app for our futsal team to track attendance at matches. The app revolves around our two teams: **Fc Degradé** and **Wille Ma ni Kunnen** – everything is centered around these two teams.

## What does the app do?

- **Attendance**: Indicate whether you're attending matches
- **Calendar**: Overview of all upcoming matches
- **Statistics**: Check who has attended the most matches

## Project Structure

The codebase is organized around a single Next.js App Router app:

- `app/` for the page, layout, manifest, version screen, and API routes
- `components/` for the dashboard and feature UI
- `lib/` for Supabase access, data helpers, and shared utilities
- `scripts/` for build, versioning, and Cloudflare deployment helpers
- `open-next.config.ts` and `scripts/build-opennext.sh` for the Cloudflare/OpenNext build pipeline

### Data Sync
The app automatically fetches data from external sources:

| Source | Frequency | What |
|--------|-----------|------|
| [LZV Cup](https://www.lzvcup.be/) | Every night (~midnight) | Full calendar, standings, results |
| Core (iCal) | Every 3-4 hours | Our own matches Fc Degradé & Wille Ma ni Kunnen |

## Hosting & Deployments

The app runs on **Cloudflare Pages** via the OpenNext adapter.

- **Production**: `main` branch automatically deploys to production
- **Preview**: Each feature branch gets its own preview URL
- **Build**: Happens automatically on every push

## Tech Stack

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

## Local Development

### Requirements

Install [Bun](https://bun.sh/) on your system:

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows (via PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

### Setup

1. **Clone the repo** and install dependencies:
   ```bash
   bun install
   ```

2. **Environment variables** - copy `.env.example` to `.env.local` and fill in your Supabase credentials

3. **Start the dev server**:
   ```bash
   bun dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Useful commands

```bash
bun dev          # Start development server
bun run build    # Build for production
bun run lint     # ESLint check
bun run deploy   # Deploy to Cloudflare (manual)
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
