# Streamr — Music Streaming Frontend (Phase 1)

A frontend-only mock of a Spotify-style music streaming service, built with Next.js (App Router), React, and
TypeScript for a Sharif University web programming course project. This is **Phase 1**: the frontend and its
mock data layer only — there is no backend yet. All data (users, songs, playlists, notifications, etc.) is
seeded into and persisted via the browser's `localStorage`. Phase 2 will add a Django backend and connect it
to this frontend.

## Requirements

- Node.js 20+
- npm (or yarn/pnpm/bun)

## Getting started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app. You'll be redirected to
`/login`.

### Demo accounts

Since there's no real backend yet, login only checks email against a set of seeded mock accounts (any
password works):

| Email | Role |
|---|---|
| `listener@demo.com` | Listener — basic tier |
| `silver@demo.com` | Listener — silver tier |
| `gold@demo.com` | Listener — gold tier |
| `nova@demo.com` | Artist (approved) |
| `support@demo.com` | Support agent |
| `admin@demo.com` | System admin |

You can also register a new listener or artist account from `/register`.

## Other commands

```bash
npm run build      # production build
npm start           # run the production build (after `npm run build`)
npm run lint         # run ESLint
npm test            # run the test suite (Vitest)
npx tsc --noEmit    # typecheck without emitting output
```

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- Tailwind CSS
- Vitest + Testing Library for tests
- `localStorage` as the mock data/persistence layer for Phase 1

