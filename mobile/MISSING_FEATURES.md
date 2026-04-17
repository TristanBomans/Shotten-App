# Mobile Feature Gap vs PWA

Dit document vergelijkt de huidige `mobile/` app met de bestaande PWA-ervaring in de root van dit project.

## Scope van huidige mobile app

Aanwezig in `mobile/` vandaag:

- Speler selecteren
- Upcoming matches ophalen
- Attendance zetten op `Present` of `NotPresent`
- Session bewaren met `AsyncStorage`

## Ontbrekende features (PWA heeft dit wel)

### Navigatie en informatie-architectuur

- Multi-view navigatie (`home`, `stats`, `league`, `settings`) met swipe-gedrag
- Floating bottom navigation
- Top overlay header met contextuele controls per view
- URL/state-sync voor actieve view + modals

### Match ervaring

- Hero card voor eerstvolgende match + aparte secties voor upcoming/past
- `Maybe` attendance flow (mobile ondersteunt nu alleen `Ja/Nee`)
- Uitgebreide match modal met opponent/squad detail
- Squad weergave (avatars/namen/status) per match
- Pull-to-refresh met skeleton loading states
- Match highlight/focus flow vanuit reminders

### Stats / leaderboard

- Volledige leaderboard view met ranking systeem en puntenlogica
- Player detail modal met score history chart en recente form
- Rules modal voor score-regels
- Highlight cards (legend/casper/miss maybe)

### League module

- League view met tabs: standings + players
- Ophalen en tonen van scraper league data (`/api/lzv/*`)
- League selector + default league voorkeur
- Team detail modal
- Player stats dialog voor league spelers

### Settings en beheer

- Settings scherm met toggles (haptic, full names, theme)
- Thema-keuze (`original`, `oled`, `white`)
- Mock/live data toggle
- Default league voorkeur in settings
- Respond-as-player sheet
- Player management sheet (CRUD + team assignment)
- Hidden admin unlock + hidden admin dialog

### Notificaties en recents

- Notification sheet met reminder-prioriteiten
- Recent matches sheet met W/D/L en attendance koppeling
- Reminder aggregatie (`buildMatchReminders`)

### Versiebeheer en update UX

- PWA version checker / update flow (`/version.json`)
- Version history modal/content
- Service worker registratie + cache refresh flow

### Platformspecifieke / infra verschillen

- Mobile gebruikt nog niet de PWA data-hooks (`lib/useData.ts`) en scraper endpoints
- Geen equivalent van browser events die PWA intern gebruikt voor cross-component sync
- Geen parity met admin/worker tooling uit PWA

## Aanbevolen volgorde om parity te bouwen

1. `Maybe` attendance + match detail parity
2. Stats view parity
3. League view parity
4. Settings + player management parity
5. Notifications/recent matches parity
6. Hidden admin/version-management parity
