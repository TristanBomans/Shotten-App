# Supabase naar Convex Migratie

Deze map bevat het migratiescript om data van Supabase naar Convex over te zetten.

## ⚠️ BELANGRIJK

- **Supabase data wordt NIET gewijzigd of verwijderd**
- Het script leest alleen uit Supabase en schrijft naar Convex
- Maak altijd een backup voor de zekerheid

## Voorbereiding

1. Zorg dat je Supabase credentials hebt:
   - `SUPABASE_URL` - je Supabase project URL
   - `SUPABASE_ANON_KEY` - je Supabase anon/public key

2. Zorg dat je Convex geconfigureerd is:
   - `NEXT_PUBLIC_CONVEX_URL` - je Convex deployment URL

3. Installeer dependencies (in de project root):
   ```bash
   bun install
   ```

## Migratie uitvoeren

### Optie 1: Met environment variables

```bash
cd /Users/tristan/Documents/Projects/Shotten-App

SUPABASE_URL="https://your-project.supabase.co" \
SUPABASE_ANON_KEY="your-anon-key" \
NEXT_PUBLIC_CONVEX_URL="https://your-deployment.convex.cloud" \
bun run _scripts/migrate-to-convex.ts
```

### Optie 2: Via .env.local

Zorg dat je `.env.local` file deze variables bevat:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

Dan run:

```bash
cd /Users/tristan/Documents/Projects/Shotten-App
bun run _scripts/migrate-to-convex.ts
```

## Wat wordt gemigreerd?

| Supabase Tabel | Convex Tabel | Opmerkingen |
|----------------|--------------|-------------|
| `core_teams` | `coreTeams` | Teams voor attendance tracking |
| `core_players` | `corePlayers` | Spelers met teamIds array |
| `core_matches` | `coreMatches` | Wedstrijden van iCal |
| `attendances` | `attendances` | Aanwezigheidsstatus per speler |
| `lzv_teams` | `lzvTeams` | League teams met stats |
| `lzv_matches` | `lzvMatches` | Wedstrijdresultaten |
| `lzv_players` | `lzvPlayers` | Spelers met externalId |
| `lzv_player_team_stats` | `lzvPlayerTeamStats` | Stats per speler per team |

## ID Mapping

Supabase gebruikt integer IDs, Convex gebruikt string IDs. Het script houdt een mapping bij:

- Supabase `core_teams.id` (1, 2, 3...) → Convex `coreTeams._id` ("k56d7q...")
- Relaties (foreign keys) worden automatisch geconverteerd

## Troubleshooting

### Error: "Failed to fetch from Supabase"
- Controleer je `SUPABASE_URL` en `SUPABASE_ANON_KEY`
- Zorg dat je Supabase project online is

### Error: "Cannot find Convex deployment"
- Controleer je `NEXT_PUBLIC_CONVEX_URL`
- Run `npx convex dev` om te verbinden met je Convex project

### Sommige records worden overgeslagen
- Dit gebeurt als de related records niet bestaan (bijv. attendance voor een verwijderde speler)
- Check de console output voor "⚠ Skipping" berichten

## Na de migratie

1. **Test de app**: Log in en check of alle data correct wordt weergegeven
2. **Controleer de Convex dashboard**: Ga naar https://dashboard.convex.dev om de data te inspecteren
3. **Verwijder de debug logging** als alles werkt

## Rollback

Als je terug wilt naar Supabase:
1. Verander `useConvexData.ts` terug naar de Supabase implementatie
2. Of schakel over naar mock data mode in de app settings
