# Mobile Feature Gap vs PWA

This document compares the current `mobile/` app with the existing PWA experience in the root of this project.

## Scope of the current mobile app

Currently present in `mobile/`:

- Select a player
- Fetch upcoming matches
- Set attendance to `Present` or `NotPresent`
- Persist session with `AsyncStorage`

## Missing features (available in the PWA)

### Navigation and information architecture

- Multi-view navigation (`home`, `stats`, `league`, `settings`) with swipe behavior
- Floating bottom navigation
- Top overlay header with contextual controls per view
- URL/state sync for active view + modals

### Match experience

- Hero card for the next match + separate sections for upcoming/past
- `Maybe` attendance flow (mobile currently supports only `Yes/No`)
- Expanded match modal with opponent/squad details
- Squad view (avatars/names/status) per match
- Pull-to-refresh with skeleton loading states
- Match highlight/focus flow from reminders

### Stats / leaderboard

- Full leaderboard view with ranking system and points logic
- Player detail modal with score history chart and recent form
- Rules modal for scoring rules
- Highlight cards (legend/casper/miss maybe)

### League module

- League view with tabs: standings + players
- Fetch and display scraper league data (`/api/lzv/*`)
- League selector + default league preference
- Team detail modal
- Player stats dialog for league players

### Settings and management

- Settings screen with toggles (haptic, full names, theme)
- Theme selection (`original`, `oled`, `white`)
- Mock/live data toggle
- Default league preference in settings
- Respond-as-player sheet
- Player management sheet (CRUD + team assignment)
- Hidden admin unlock + hidden admin dialog

### Notifications and recents

- Notification sheet with reminder priorities
- Recent matches sheet with W/D/L and attendance mapping
- Reminder aggregation (`buildMatchReminders`)

### Versioning and update UX

- PWA version checker / update flow (`/version.json`)
- Version history modal/content
- Service worker registration + cache refresh flow

### Platform-specific / infrastructure differences

- Mobile does not yet use the PWA data hooks (`lib/useData.ts`) and scraper endpoints
- No equivalent of browser events used internally by the PWA for cross-component sync
- No parity yet with admin/worker tooling from the PWA

## Recommended order to build parity

1. `Maybe` attendance + match detail parity
2. Stats view parity
3. League view parity
4. Settings + player management parity
5. Notifications/recent matches parity
6. Hidden admin/version-management parity
