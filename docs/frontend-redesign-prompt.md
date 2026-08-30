# Prompt: radically redesign the Shotten frontend

You are redesigning the Shotten frontend from the ground up.

The goal is a **radically different frontend approach with exactly the same functionality**. Replace the current visual language, page composition, information hierarchy, and component composition with a new system. Do not deliver a light reskin of the existing UI. Build a genuinely different set of reusable components and a different layout model, while keeping the product behavior and data contract intact.

The main visual reference is the **T3 Code mobile and desktop/web experience**. Carry over its design philosophy and level of restraint across Shotten's responsive breakpoints, then reinterpret that philosophy for team attendance. This is a visual and interaction-direction brief, not a request to reproduce T3 Code's product UI.

## Product and source of truth

Shotten is a mobile-first PWA for a sports team. The active product is in `pwa/`. The deprecated `mobile/` implementation is not the implementation target.

Use these local files as the functional source of truth before changing anything:

- `docs/non-admin-user-flow.md` — the documented non-admin frontend flow and current screen inventory;
- `docs/screenshots/` — reference captures of the current behavior at 360 × 780 CSS pixels;
- `pwa/components/` — the current feature entry points and interaction contracts;
- `pwa/lib/` — existing data, persistence, notification, haptic, and utility behavior;
- `pwa/app/api/` — existing frontend-facing API routes.

Do not infer that a feature is disposable because its current UI is awkward. Preserve the complete existing product surface, including conditional admin/developer paths, even when the primary design target is the ordinary non-admin player.

## Design research and primary visual reference

Study the official T3 Code project as the primary visual reference for both mobile and desktop. Use its visual principles as a foundation, not as a template or a clone:

- [T3 Code repository](https://github.com/pingdotgg/t3code) — the main app's restrained, panel-based control-surface approach;
- [T3 Code installation and desktop overview](https://github.com/pingdotgg/t3code/blob/main/docs/user/install.md) — the web/desktop product context;
- [T3 Code desktop/web sidebar](https://github.com/pingdotgg/t3code/blob/main/apps/web/src/components/Sidebar.tsx) — dense but calm navigation, grouped items, compact status cues, search/filter affordances, and contextual actions;
- [T3 Code mobile README](https://github.com/pingdotgg/t3code/blob/main/apps/mobile/README.md) — the mobile implementation context;
- [Mobile theme tokens](https://raw.githubusercontent.com/pingdotgg/t3code/main/apps/mobile/global.css) — near-black surfaces, restrained alpha borders, semantic colors, DM Sans typography, and light/dark theme structure;
- [Mobile navigation and sheets](https://raw.githubusercontent.com/pingdotgg/t3code/main/apps/mobile/src/app/_layout.tsx) — native-feeling form sheets, detents, grabbers, and gesture-aware presentation;
- [Mobile Android header](https://raw.githubusercontent.com/pingdotgg/t3code/main/apps/mobile/src/components/AndroidScreenHeader.tsx) — compact safe-area-aware headers, circular icon actions, and strong title hierarchy;
- [Mobile settings screen](https://raw.githubusercontent.com/pingdotgg/t3code/main/apps/mobile/src/features/settings/SettingsRouteScreen.tsx) and [appearance screen](https://raw.githubusercontent.com/pingdotgg/t3code/main/apps/mobile/src/features/settings/SettingsAppearanceRouteScreen.tsx) — grouped settings sections, quiet rows, and clear control states.

Translate those principles into a sports attendance product. T3 Code is the main source of truth for the visual philosophy on both mobile and desktop; the existing Shotten code and documentation remain the source of truth for functionality. Do not copy T3 Code branding, logos, copy, source code, exact screens, or IDE/chat metaphors. Shotten must remain recognizable as Shotten, not as a T3 Code imitation.

The intended visual direction is:

- dark-first, calm, and high-contrast, with near-black screen chrome and subtly raised surfaces rather than large glossy glass cards;
- a restrained palette of near-black, dark gray, off-white, and low-alpha separators, with color reserved for attendance status, alerts, confirmation, and meaningful emphasis;
- DM Sans or the closest already-supported equivalent, with a deliberate type scale and clear distinction between title, metadata, label, and value;
- a shared visual language across breakpoints: on mobile, compact safe-area-aware headers, sheets, and gesture-friendly surfaces; on desktop, a stable app shell with a persistent navigation rail/sidebar, dense content panels, clear panel boundaries, and contextual actions;
- composable surfaces that can become a full-width mobile section, a sheet, a desktop panel, or a side-by-side detail view without changing the underlying feature behavior;
- the same hierarchy at every size: navigation and scope first, primary content second, contextual detail third, with no decorative chrome competing with the task;
- native-feeling bottom sheets and contextual surfaces for notifications, recent matches, rules, menus, and lightweight selectors on mobile, with equivalent popovers, menus, and detail panels on desktop;
- grouped rows and sections for settings and management screens instead of one oversized dashboard card per feature;
- clear loading, empty, error, selected, disabled, optimistic, and success states;
- concise status chips, segmented controls, and dense-but-readable match summaries that let a player scan quickly.

Use the T3 Code mobile and desktop research as the primary source of interaction and visual principles. It is not a requirement to reproduce its exact colors, dimensions, or component names. Preserve Shotten's existing light theme as well as its dark theme, but bring both under the new design system. The result should feel like a sports-specific app built with the same kind of deliberate control-surface thinking as T3 Code.

## Non-negotiable functional parity

Do not change the backend, database schema, API routes, authentication assumptions, business rules, or persistence model. Reuse the existing hooks, data fetching, events, local storage keys, notification logic, haptic behavior, and URL/deep-link behavior unless a compatibility-preserving adapter is required.

Every existing user action must remain available and work end-to-end:

1. **Profile selection**
   - Load the player list, show loading and empty states, and filter it immediately through search.
   - Select a player, persist that selection locally, and enter the dashboard.
   - Sign out must clear the existing local selection and return to profile selection.

2. **Home / Matches**
   - Show the next match and all other upcoming matches, with date, time, countdown, teams, location, and relevant match status.
   - Let the current player answer Present, Maybe, or Not Present directly from the match summary.
   - Keep optimistic updates, error recovery, refresh/pull-to-refresh, notifications, and match-detail navigation.
   - Keep recent matches and match-reminder entry points.

3. **Match detail**
   - Preserve the Squad and Opponent views.
   - Preserve attendance grouping, the current-player highlight, opponent information, league context, statistics, recent form, team information, and AI scouting/loading/error states when data is available.
   - Preserve the More actions: Directions, Add to Calendar, and View Opponent on LZV Cup.

4. **Stats**
   - Preserve the attendance leaderboard, sorting/rank presentation, current-player emphasis, player detail, activity breakdown, match history, and rank labels.
   - Preserve the How It Works/rules surface and its percentage/rank explanation.

5. **League**
   - Preserve the league table, own-team emphasis, league selector when multiple leagues exist, and team detail.
   - Preserve team Overview, Matches, and Squad tabs plus all available team statistics and context.

6. **Settings and secondary flows**
   - Preserve Notifications, Haptic Feedback, Show Full Names, and Appearance/theme selection.
   - Preserve Respond as Player, including player selection and per-match attendance responses.
   - Preserve Manage Players, Forfait Matches, Version History, sign out, and any existing developer-only information/controls.
   - Keep admin-only and hidden/unlock functionality conditionally protected and available; do not expose it accidentally to non-admin players.

7. **Navigation and overlays**
   - Preserve all back actions, close actions, swipe/gesture behavior where it exists, deep links, modal state, focus restoration, and return-to-previous-position behavior.
   - A redesign may change how these interactions are presented, but it may not remove or silently alter them.

## Critical Home requirement

Home is the most important screen. It must be an understandable, one-page overview of **all upcoming matches**.

Without extra taps, opening a detail page, horizontal paging, hidden gestures, or “tap to reveal” interactions, a player must be able to see for every upcoming match:

- who can play / Present;
- who cannot play / Not Present;
- who Maybe can play;
- who has not answered / TBD;
- the total count in each category.

The overview must remain scannable when several matches are upcoming. Design a compact information structure that fits the key availability summary for every upcoming match into one viewport or one continuously visible Home overview on a Galaxy S25-sized screen. You may use dense rows, stacked summaries, an attendance matrix, initials, avatars, category counts, or another clearly legible pattern, but do not hide the essential answer behind interaction. If the complete dataset cannot physically fit without scrolling, keep the category counts and the current player's action visible for every match and make the remaining roster information continuously scannable in the same Home surface; do not require detail navigation to understand availability.

The current player's primary action must be obvious and require one tap: Present, Maybe, or Not Present. The current player's selected state must be unmistakable, and the match summary must update optimistically after the tap.

Do not let a decorative hero, oversized branding, large empty regions, carousel, floating overlay, or excessive card padding consume the space needed for this overview.

## Radical component and layout direction

Treat the current frontend's component tree as a behavior map, not as the design to preserve. Create a new composition system with new primitives and new page structure. At minimum, investigate and use equivalents of the following concepts where they improve the result:

- `MobileAppShell` with safe-area handling and a clear primary navigation model;
- `ScreenHeader` with a compact title, contextual subtitle, back action, and icon actions;
- `SectionLabel` and grouped `ListSection` for quiet information hierarchy;
- `MatchSummary` / `MatchAvailability` for high-density upcoming-match scanning;
- `AvailabilityCount`, `AvailabilityRoster`, and `ResponseControl` for status and response actions;
- `StatusChip`, `MetricRow`, `SegmentedControl`, and `InlineNotice`;
- `BottomSheet` / `ContextMenu` for lightweight secondary actions;
- `LeaderboardRow`, `TeamTableRow`, `TeamSummary`, and `HistoryRow`;
- `SettingsRow`, `SettingsSection`, and accessible switch/select controls;
- `FullScreenFlow` for multi-step flows such as Respond as Player and management pages.

These are design responsibilities, not an instruction to blindly create these exact names. Choose a coherent component architecture that is visibly and structurally different from the current top-overlay, large-glass-card, and floating-navigation composition. On desktop, the new architecture should support a persistent T3-Code-like navigation/sidebar shell and a focused content/detail workspace; on mobile, it should collapse that same hierarchy into an ergonomic single-column shell with sheets and full-screen flows. Do not create two unrelated products or two unrelated design systems.

The redesign should feel like a focused mobile control surface: information-dense, calm, direct, and easy to operate with one hand. Use motion only to explain state or navigation. Avoid decorative motion that delays a response action.

## Responsive and accessibility requirements

- Treat 360 × 780 CSS pixels as the primary design and QA viewport for a Samsung Galaxy S25-style mobile capture.
- Also support larger phones, narrow widths, landscape where the existing app supports it, and desktop widths without breaking the information hierarchy.
- Respect safe-area insets, keyboard behavior, bottom navigation clearance, sheet boundaries, and scroll restoration.
- Keep interactive targets at least 44 × 44 CSS pixels where practical, with visible focus/pressed/selected states.
- Maintain semantic HTML, keyboard access, screen-reader labels, sufficient contrast, reduced-motion behavior, and non-color-only status communication.
- Ensure long names, missing logos, missing locations, empty data, slow network, failed requests, and partial API responses have deliberate layouts.

## Visual constraints

Do:

- establish a small, explicit token system for color, typography, spacing, radius, elevation, borders, and motion;
- use surfaces and separators to clarify hierarchy instead of gradients and shadows everywhere;
- keep attendance colors semantic and consistent across Home, Match detail, Respond as Player, and any management surface;
- make selected, pending, optimistic, and failed response states visually distinct;
- make the app feel premium through spacing, hierarchy, and interaction quality rather than decoration.

Do not:

- merely rename or recolor the existing components;
- introduce a generic SaaS dashboard, a generic sports template, or a T3 Code clone;
- implement mobile and desktop as unrelated visual systems; they must share the same T3-Code-inspired design language and component contracts;
- use neon gradients, purple AI decoration, oversized hero art, or low-contrast gray-on-gray text;
- bury availability counts behind a modal, tooltip, carousel, or match-detail page;
- remove a feature because it is not represented in the non-admin screenshot set;
- add fake data or change API behavior to make the new design easier to render;
- add a dependency unless it is genuinely needed and compatible with the current Next.js/React/Tailwind stack.

## Implementation workflow

Before editing, audit the current screens, interactions, state transitions, and data dependencies. Produce a short feature-to-new-component map so it is clear how every old capability is represented in the new system.

Then:

1. Define the new visual tokens and responsive layout rules.
2. Build the new shell, navigation, headers, surfaces, sheets, controls, and status primitives.
3. Recompose every existing screen using those primitives; do not preserve the current page layout by default.
4. Implement the Home availability overview first and verify the one-page scanning requirement with multiple upcoming matches.
5. Reconnect all existing data, optimistic updates, persistence, notifications, haptics, deep links, and error handling.
6. Exercise every screen and every important state at 360 × 780, including loading, empty, error, selected, response-updated, and overlay states.
7. Run the existing lint/build checks and fix regressions rather than weakening checks.
8. Capture a new screenshot of every distinct screen/state needed to prove the redesign and update documentation if the screen inventory changes.

## Acceptance criteria

The work is complete only when all of the following are true:

- The frontend is unmistakably a new visual and component system, not a reskin.
- All existing Shotten functionality remains available and works with the existing data/API contracts.
- A non-admin player can complete the documented flow from profile selection through Home, Match detail, Stats, League, Settings, and every secondary screen.
- Home shows all upcoming matches in one clear overview and exposes Present, Maybe, Not Present, TBD, and category counts per match without requiring detail navigation.
- The new interface is usable and legible at 360 × 780 CSS pixels and remains responsive at larger sizes.
- T3 Code inspiration is visible in restraint, panel hierarchy, typography, sheets, grouped settings, and mobile interaction quality, while Shotten keeps its own product identity.
- Loading, empty, error, disabled, optimistic, and success states are designed rather than left to browser defaults.
- Accessibility, safe-area handling, back/close behavior, and scroll/focus restoration are preserved.
- The project passes its existing lint and build commands.
- The final handoff includes the feature-to-component map, the screenshot set, and a concise note of any compatibility adapters or intentional visual trade-offs.

Do not stop after producing a concept or a new shell. Implement and verify the complete frontend redesign with functional parity.
