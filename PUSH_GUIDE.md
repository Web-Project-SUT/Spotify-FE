# Push guide — Phase 1 fixes (Kiarash + Sepehr's tasks)

All work branches off the real `main` (last commit: `feat: prettier config`).
Nothing on `main` was rewritten. Every branch follows the `feat/*` and `fix/*`
naming convention, and commit messages match the existing `feat:` / `fix:` style
with task references.

## Branch map

| Branch | What it contains |
|---|---|
| `feat/types-and-auth` | Foundation: Role/Tier split, auth helper, seeded mock DB (3 commits) |
| `feat/gold-early-access` | GoldEarlyAccess fix (Task 14) |
| `fix/top-songs-row` | TopSongsRow empty-state fix (Task 13) |
| `feat/notifications` | NotificationPanel fixes (Task 18, 19) |
| `feat/playlist-manager` | PlaylistManager tier limits (Task 23) |
| `feat/artist-profile` | ArtistProfile fixes (Task 17) |
| `feat/advanced-player-features` | Player fixes (Task 27, 28, 29) |
| `feat/artist-management` | UploadArtworkForm + ArtistStatsDashboard (Task 30, 31) |
| `feat/admin-dashboard` | AccountingTable + RevenueChart (Task 36, 38) |
| `feat/recommendation-engine` | RecommendationEngine (Task 49) |
| `feat/group-session` | GroupSession (Task 47) |
| `feat/page-integration` | Merges all of the above + route pages + layout. This is the buildable, fully-wired app. |

The component branches each depend on `feat/types-and-auth` (they're branched
from it), so open their PRs against `feat/types-and-auth` first — or merge
`feat/types-and-auth` into `main` first, then retarget the rest to `main`.

## Recommended order

1. Push and merge `feat/types-and-auth` → `main` first (everything needs it).
2. Push the component branches and open PRs (one ticket each).
3. Push `feat/page-integration` last — it's the integration that wires routes.

## Push everything at once

    ./push-all.sh

## Verify before pushing

    npm install
    npm test        # 64 tests, all green
    npx tsc --noEmit

`npm run build` needs internet to fetch the Geist Google Font — it builds fine
on a normal machine; it only fails in a sandboxed/offline environment.
