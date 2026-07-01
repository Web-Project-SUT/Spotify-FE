# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Frontend-only (Phase 1) mock of a Spotify-style music streaming service, built for a Sharif University web
programming course project (see `doc.tex` for the full assignment spec — not committed to git, but present
locally). Full spec summary is in "Project requirements" below. Phase 2 (a Django backend + real integration)
is a future phase and is explicitly **out of scope right now** — there is no backend, no real auth, and no
network layer. All persistence is `localStorage`, mocked via `utils/localStorage.ts`.

The assignment is graded partly on maintainability and on how little refactoring Phase 2 will require, so
prefer the existing abstraction points (`utils/auth.ts`, the `Collection` shape in `localStorage.ts`, the
`Role`/`Tier` split in `utils/types.ts`) over ad hoc access to `localStorage` or duplicated role/tier checks.

## Commands

```bash
npm install        # install deps (node_modules is not checked in)
npm run dev        # start dev server at http://localhost:3000
npm run build      # production build (requires internet to fetch the Geist Google Font)
npm start          # run the production build
npm run lint       # eslint (flat config, eslint-config-next core-web-vitals + typescript)
npm test           # vitest run — all tests, once
npx vitest         # vitest watch mode
npx vitest run components/Player.test.tsx   # run a single test file
npx vitest run -t "test name"               # run tests matching a name
npx tsc --noEmit   # typecheck without emitting
```

There is no separate "view the project" step beyond `npm run dev` — this is a pure Next.js frontend with no
companion backend to start.

Formatting follows `.prettierrc` (single quotes, semicolons, trailing commas, 100-char width) — run through
your editor's Prettier integration or `npx prettier --write .`; there's no dedicated `format` script.

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS v4. Tests use Vitest +
`@testing-library/react` + `happy-dom`. Per `AGENTS.md`, this Next.js version has breaking changes vs. training
data — check `node_modules/next/dist/docs/` before relying on remembered API/convention knowledge.

**No backend, no fetch calls.** Every "data layer" operation goes through `utils/localStorage.ts`
(`getItem`/`setItem`/`addRecord`/`updateRecord`/`deleteRecord` against named collections: `users`, `songs`,
`albums`, `playlists`, `notifications`, `payouts`, `revenueData`, `subscriptionPrices`, `tickets`,
`listeningHistory`, `currentUser`, `currentTrack`, `queue`, `groupSession`). `initializeMockDatabase()` seeds
all of these on first load (called from `AuthContext`'s mount effect) — check the seed data there for demo
accounts and mock content shape. This localStorage layer is the intended seam for swapping in real HTTP calls
in Phase 2, so keep components reading/writing through it rather than hardcoding data inline.

**Auth is a client-side mock**, not real security: `AuthContext` (`context/AuthContext.tsx`) holds the current
`User` in React state, backed by the `currentUser` localStorage key. `login()` just matches email
(+ optional password) against the seeded `users` collection — anyone can "authenticate" as any seeded account.
`utils/auth.ts` centralizes role/tier derived checks (`isGoldUser`, `isSilverOrAbove`, `getPlaylistLimit`, the
`PLAYLIST_LIMITS` table) — use these helpers instead of re-deriving `user.role`/`user.tier` comparisons in
components, so the tier rules stay in one place.

**Role vs. Tier is a deliberate two-axis model:** `Role` (`listener | artist | support | admin`) gates which
pages/nav items a user sees; `Tier` (`basic | silver | gold`) is a listener-only subscription level that gates
feature limits (playlist count, gold-only stats, early access). Don't conflate the two — e.g. an `artist` has
no `tier`.

**Route protection:** pages that require auth wrap their content in `<AppShell allow={[...roles]}>`
(`components/AppShell.tsx`), which renders the `Sidebar` + a `<ProtectedRoute>` boundary. `ProtectedRoute`
redirects unauthenticated users to `/login` and redirects users whose role isn't in `allow` back to `/home`.
The role → landing route map lives once in `utils/auth.ts` as `ROLE_HOME` / `getRoleHome(user)`
(`listener → /home`, `artist → /artist-panel`, `support → /support`, `admin → /dashboard`); both the root
`app/page.tsx` and `app/login/page.tsx` call `getRoleHome` to redirect a logged-in user to their role-specific
landing page — reuse this helper rather than re-declaring a role map. `/login` validates email format and
required fields (per-field errors via the `Input` primitive's `error` prop), redirects already-authenticated
users to their role home, and links to `/forgot-password`. That recovery route mirrors the same auth-page
patterns: it shares `EMAIL_RE` from `utils/auth.ts` for email validation, redirects already-authenticated
users to their role home via `getRoleHome`, and on a valid submit shows a mocked async "sending" state (the
`<Spinner>` primitive) before a success screen that just confirms an email was "sent" — no real email/network
in Phase 1.

**`/register`** hosts both listener and artist sign-up (tabbed). The listener form collects display name,
email, password + confirm, DOB, gender, and privacy-policy acceptance (modal), validates per-field like
`/login` (shared `EMAIL_RE` from `utils/auth.ts`, duplicate-email guard against the `users` collection), and
redirects to `/home` on success; it also redirects already-authenticated users to their role home. The artist
tab is unchanged (email, password, stage name, portfolio → "Pending Approval"). `registerListener` in
`AuthContext` persists `displayName` plus a **system-assigned `username`** (slugified + uniquified, distinct
from display name) and `birthDate`/`gender` — see the `Gender` type and the new `User` fields in
`utils/types.ts`. Listener display name no longer overloads the artist-only `stageName` field; components that
render a user's name (`Sidebar`, `/home`, `/profile`) prefer `displayName`, falling back to `stageName`/`email`.

**Player is global, not page-scoped:** `<Player>` and `<ServiceWorkerRegister>` are mounted once in
`app/layout.tsx` (outside any route), so the player bar persists across navigation. It reads/writes
`currentTrack` and `queue` in localStorage and re-syncs on the browser `storage` event — this is also the
mechanism `GroupSession` uses to fake real-time sync across tabs (see below), so changes to the
localStorage key names used by the player must stay consistent across `Player.tsx`, `GroupSession.tsx`, and
any page that starts playback (e.g. `AlbumsBrowse`, album/artist pages).

**"Real-time" features are simulated via the `storage` event, not sockets.** `components/GroupSession.tsx`
persists `GroupSessionData` under the `groupSession` key and listens for cross-tab `storage` events to fake
synced playback state; this only works across tabs in one browser, not across devices/users, and is expected
to be replaced by WebSockets in Phase 2 — don't over-invest in making the mock version device-cross-compatible.

**Dynamic pricing:** subscription prices are never hardcoded — `PriceControl` (admin-only) reads/writes the
`subscriptionPrices` collection (`{ silver, gold }`), and anything displaying a price must read from there.

**PWA:** `public/manifest.json` + `public/sw.js` (cache-and-fallback-to-`/offline` on navigation) +
`components/ServiceWorkerRegister.tsx` registered in the root layout. `app/offline/page.tsx` is the offline
fallback route the service worker serves.

**UI primitives** live in `components/ui/` (`Avatar`, `Badge`, `Button`, `Card`, `EmptyState`, `Input`,
`Spinner`, barrel-exported from `components/ui/index.ts`) — prefer these over one-off markup for
buttons/badges/empty/loading states so styling stays consistent (e.g. use `<Spinner>` for loading
states rather than inline "Loading…" text).

**Design tokens & typography** are the single source of truth in `app/globals.css`: the semantic color
palette is defined as CSS variables and bound to Tailwind classes via the v4 `@theme inline` block
(`bg-surface-2`, `text-muted`, `bg-accent`, `border-border`, `bg-danger`, …), and base heading styles
(`h1`–`h4`) live in an `@layer base` block. There is **no `tailwind.config.js`** — Tailwind v4 is
CSS-first. Reference these tokens/classes and the UI primitives instead of hardcoding hex values or
one-off styles, so a Phase 2 restyle stays centralized.

**Testing convention:** test files sit next to the component they cover (`Component.test.tsx`), using Vitest +
Testing Library + `happy-dom`. Follow this colocated naming when adding tests rather than a separate `__tests__`
tree.

## Project requirements (from `doc.tex`)

This is Phase 1 (frontend-as-mock) of a two-phase project; Phase 2 (Django backend + payment gateway +
Docker + real-time features) is separate and not part of this repo's current work. Key Phase 1 requirements
to keep in mind when touching related code:

- **Four roles**: listener, artist, supporter, admin (single admin). Listener subscription tiers — basic
  (free), silver, gold — gate: daily stream limit (60 vs. unlimited), playlist limit (6 / 100 / unlimited),
  profile picture upload (silver+), song downloads (silver+), early access to new releases (gold only), and
  song/listener statistics visibility (gold only).
- **Login/Register**: one shared login for all four roles; "Forgot password" flow; listener registration
  collects display name, email, password + confirmation, DOB, gender, and a privacy-policy acceptance
  checkbox (clicking "privacy" opens the policy text); artist registration is a separate form (email,
  password, artistic name, sample works) that lands in "Pending Approval" status until a supporter/admin
  approves or rejects it.
- **Home**: shows the user's display name + avatar, recently listened playlists, latest albums, most-played
  tracks, and — gold users only — an "Early Access" section.
- **User profile**: personal info, system-assigned username, avatar, tier, follower/following counts, daily
  stream stats, follow/unfollow, and editable fields (profile picture upload is gated to silver+ in Phase 2).
- **Artist profile**: bio, full discography (albums + singles), a "Verified Artist" badge for approved
  artists, follow/unfollow, and gold-only listener/stream stats.
- **Settings**: notification preferences, sound, language, account deletion, and a read-only view of current
  tier (upgrade flow itself is a Phase 2/payment concern).
- **Notifications**: unread vs. read visually distinguished, "Mark as read" + "Hide" per card, "Read all" at
  top, empty state when none exist. Content differs by role — listeners get subscription-expiry and
  followed-artist-release notices; artists get approval/rejection (with reason) and monthly payout notices;
  supporters/admins get new-ticket and new-artist-verification alerts.
- **Playlists**: create/delete/rename, tier-based count limits (enforced via `PLAYLIST_LIMITS`), add songs by
  navigating to the albums/tracks browser, empty state with a "create first playlist" CTA.
- **Albums & Tracks browser**: combined search by track/artist name, sort by listener count or publish date,
  album cards (cover/name/artist, click → album page, click artist → artist profile) and single-track cards
  (cover/title/artist/album, click → player, click album/artist → respective pages), and a context menu for
  adding/removing a track from one or more playlists (respecting tier limits).
- **Music player**: seekable progress bar, play/stop/next/prev, volume, repeat (off/playlist/one), shuffle,
  queue view/management, cover art, clickable artist/album links, lyrics (if present), gold-only
  listener/stream counts. Fixed bottom bar on desktop, expands to a mini/full-screen player on mobile.
- **Artist artwork management**: upload audio (MP3/WAV/FLAC — mocked, no real file storage yet), lyrics,
  cover image, single-vs-album designation, metadata (genre, release year, collaborators); post-publish
  stats (listeners/streams/revenue) with edit/delete.
- **Support & Admin dashboard**: sidebar-navigated panel. Supporters see only ticket handling + artist
  approvals; admin sees everything.
  - *Tickets & verification*: artist-approval table (stage name, email, "view sample works", approve/reject
    with reason) and a ticket table (id, user, subject, date, status: open/answered/closed) with a chat-style
    reply view.
  - *Accounting*: monthly table per artist — name/ID, unique listeners, streams, reward amount (real formula
    is a Phase 2 concern; Phase 1 just needs the structure/mock values), payment status
    (Pending/Settled) with a "Confirm settlement" action (admin-only in practice).
  - *Admin-only*: subscription price control (silver/gold numeric inputs, "Update prices" writes to the
    `subscriptionPrices` collection so nothing is hardcoded), a pie chart of users by tier, and revenue
    widgets for the current month.
- **Responsive & role-personalized**: every page must adapt to desktop/tablet/mobile and tailor its content
  to the logged-in role — this is graded explicitly, so avoid layouts that only work at desktop width.
- **Testing**: at least 10 frontend tests is a grading checklist item (currently far exceeded — see the
  `*.test.tsx` files colocated with components).
- **PWA support** is worth bonus points (manifest + service worker + offline page — already scaffolded).
- **Optional (pick at most one for extra credit)**: advanced player (quality switch that actually changes
  playback quality, 5s crossfade with volume ramp, and album-cover-driven accent color matching for player
  widgets — color matching and a quality toggle exist in `Player.tsx` already, but crossfade does not);
  meaningful (non-random) song recommendations (`utils/recommendation.ts` has a basic genre-affinity
  recommender); or real-time group listening with synced playback and an invite link
  (`GroupSession.tsx` — currently tab-local via the `storage` event, not cross-device).
