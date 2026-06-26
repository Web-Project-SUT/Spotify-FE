# Push guide — Phase 1 (Kiarash + Sepehr's tasks)

Everything branches off the real `main` (last commit `feat: prettier config`).
`main` was never rewritten. Branch names follow your `feat/*` / `fix/*`
convention and commit messages match the existing `feat:` / `fix:` style with
task references.

## Two layers of work

**Layer 1 — Sepehr's components reviewed, fixed, and tested.**
These branch off `feat/types-and-auth` (the shared foundation).

| Branch | Ticket(s) |
|---|---|
| `feat/types-and-auth` | Foundation: Role/Tier split, auth helper, seeded mock DB (3 commits) |
| `feat/gold-early-access` | Gold early access (Task 14) |
| `fix/top-songs-row` | Top songs empty state (Task 13) |
| `feat/notifications` | Notifications (Task 18, 19) |
| `feat/playlist-manager` | Playlist tier limits (Task 23) |
| `feat/artist-profile` | Artist profile (Task 17) |
| `feat/advanced-player-features` | Player queue/lyrics/quality/gold stats (Task 27, 28, 29) |
| `feat/artist-management` | Upload form + stats dashboard (Task 30, 31) |
| `feat/admin-dashboard` | Accounting table + revenue charts (Task 36, 38) |
| `feat/recommendation-engine` | Recommender (Task 49) |
| `feat/group-session` | Group listening (Task 47) |
| `feat/page-integration` | Merges Layer 1 + first route pages + player in layout |

**Layer 2 — Kiarash's own tickets.**
These branch off `feat/auth-and-routing` (which itself sits on `feat/design-system`,
which sits on `feat/page-integration`).

| Branch | Ticket(s) |
|---|---|
| `feat/design-system` | Design system & global styles |
| `feat/auth-and-routing` | Auth context, role-based routing, login/register, app shell + sidebar |
| `feat/home-layout` | Home page layout & sidebar |
| `feat/albums-browse` | Albums & singles browse + album detail + player page |
| `feat/player-controls` | Desktop player bar: play/pause/next/prev, repeat, shuffle (Task 24, 25) |
| `feat/settings-and-profile` | Settings page + user profile (Task 32, 15, 16) |
| `feat/support-dashboard` | Dashboard shell, artist approvals, support tickets (Task 33, 34, 35) |
| `feat/price-control` | Admin subscription price control (Task 37) |
| `feat/pwa` | PWA manifest, service worker, offline page (Task 42, 43) |

**`feat/full-app`** merges everything into one complete, runnable, fully-wired
app. If you just want the finished product on one branch, this is it.

## Recommended order

If you want clean PR-per-ticket history:
1. Merge `feat/types-and-auth` → `main` first (everything depends on it).
2. Open PRs for the Layer 1 component branches.
3. Merge `feat/page-integration`, then `feat/design-system`, then
   `feat/auth-and-routing`.
4. Open PRs for the remaining Layer 2 branches.

If you just want it done: push `feat/full-app` and merge it to `main`.

## Push everything

    ./push-all.sh

## Verify before pushing

    npm install
    npm test          # 86 tests across 19 files, all green
    npx tsc --noEmit  # clean

`npm run build` needs internet to fetch the Geist Google Font — it builds on a
normal machine; it only fails in a sandboxed/offline environment.

## Demo accounts (any password)

- `listener@demo.com` — basic listener
- `silver@demo.com` — silver tier
- `gold@demo.com` — gold tier
- `nova@demo.com` — approved artist
- `support@demo.com` — support agent
- `admin@demo.com` — system admin
