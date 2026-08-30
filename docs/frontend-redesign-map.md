# Frontend redesign — feature-to-component map

The PWA visual system is a T3-Code-inspired control surface: near-black chrome, hairline separators, DM Sans, grouped list sections, docked mobile tab bar, and a persistent desktop rail. Product behavior, APIs, storage keys, haptics, notifications, and deep links are unchanged.

## Shell and primitives

| Responsibility | New component / token |
| --- | --- |
| Visual tokens (color, type, space, radius, motion, themes) | `pwa/app/globals.css` (`--bg-*`, `--text-*`, `--ok/--warn/--no/--tbd`, `--fs-*`, `--sp-*`) |
| App chrome + safe areas | `.app-frame`, `.screen`, `.screen-header`, `.tabbar`, `.siderail` |
| Mobile tab bar + desktop rail | `pwa/components/ui/AppNav.tsx` |
| Compact screen header | `pwa/components/ui/ScreenHeader.tsx` |
| Full-screen flows | `pwa/components/ui/FlowPage.tsx` |
| Bottom sheet (mobile) / centered panel (desktop) | `pwa/components/ui/Sheet.tsx` |
| Grouped rows | `ListSection`, `Row`, `MetricRow` in `pwa/components/ui/ListSection.tsx` |
| Switch, segmented control, chips, response, empty, avatar | `pwa/components/ui/controls.tsx` |

## Feature map

| Feature | Old composition | New composition |
| --- | --- | --- |
| Profile selection | Glass card list | Wordmark + search field + grouped `list-section` rows (`PlayerSelect`) |
| Home / upcoming matches | Hero glass `MatchCard` + compact cards, floating nav | One dense `MatchSummary` board for every upcoming match (`MatchBoard/*`) under a docked tab bar |
| Availability on Home | Names/counts inside expandable glass card | Always-visible `AvailabilityCounts` (In/Maybe/Out/TBD) + `AvailabilityRoster`; `ResponseControl` is one tap |
| Recent matches | Overlay sheet | `Sheet` + `RecentMatchesSheet` |
| Match reminders | Overlay sheet | `Sheet` + `NotificationSheet`; tap still scrolls/highlights the match |
| Match detail | Glass modal, Squad/Opponent swipe | `flow-page` (`MatchPage`) with `SegmentedControl`, `SquadView`, `OpponentView`, `.menu` for More |
| Stats / leaderboard | Overlay header + glass rows | `StatsView` list rows in `.screen`; rules via `FlowPage` |
| Player detail | Full-screen glass | `FlowPage` + `PlayerDetailPage` |
| How it works | Overlay | `FlowPage` + `RulesPage` |
| League table | Glass table | Compact `list-section` rows (`LeagueView`); selector via `Sheet` |
| Team detail | Full-screen glass | `FlowPage` + Overview / Matches / Squad |
| Settings | One oversized glass dashboard | Grouped `ListSection`s (`Preferences`, `Management`, `Developer`, `Account`) |
| Appearance | Modal | `Sheet` with OLED Black / White |
| Respond as Player | Multi-step overlay | `FlowPage` two-step (`RespondAsPlayerPage`) |
| Manage Players / Forfait / Version History | Full-screen overlays | `FlowPage` pages |
| Hidden Admin | Unchanged worker dashboard | Still the existing admin surface, rendered with the new token aliases |
| Navigation | Floating pill + top overlay | Docked tab bar (mobile) / side rail (desktop); horizontal swipe between the four views is preserved |

## Compatibility adapters and visual trade-offs

- Legacy CSS aliases (`--color-*`, `.glass-panel`, `.container`, `.btn-ghost`, …) remain in `globals.css` so `HiddenAdminPage` and any leftover inline token names still resolve. Hidden Admin was not rewritten into the new primitives; it is admin-only and sits on those aliases.
- `Show Full Names` still collapses the Home roster to counts-only. Counts and the player's response stay visible on every match without extra taps.
- Response buttons stay visually compact so several matches fit on a 360 × 780 screen; an expanded hit area (`::after`) keeps the tap target practical.
- Horizontal swipe between Home / Stats / League / Settings is unchanged. Deep-link query params (`view`, `modal`, `modalId`) are unchanged; `forfait` is included in the known modal set so refresh/back restore that flow.
## Screenshot inventory

New 360 × 780 captures of the redesigned UI live in `docs/screenshots/`:

- `01-player-select.png`, `02-home.png`, `03-recent-matches.png`, `04-match-detail-squad.png`
- `06-notifications.png`, `06-match-more-menu.png`, `07-stats.png`, `08-player-detail.png`
- `10-league.png`, `11-team-detail.png`, `11-team-matches.png`, `12-settings.png`, `13-appearance-selector.png`

`05-match-detail-opponent.png`, `09-rules.png`, and the Settings secondary flows (`14`–`18`) still show the previous glass captures. Those screens were recomposed onto `FlowPage` / `Sheet` / `ListSection` in this redesign; recapture them from the live app if you need matching docs images.

The Settings capture includes Hidden Admin because that unlock was already present in the local browser profile. Non-admin players do not see that row until the five-bell unlock.
