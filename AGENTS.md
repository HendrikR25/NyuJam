# NyuJam — Agent guidance

## Layout

This is NOT a monorepo — it is two separate Node projects in one repo:

| Directory | Tech | Entry | Port |
|-----------|------|-------|------|
| `soniq/` | Vue 3 + Vite + TS + Pinia + Vue Router | `src/main.ts` | 5173 |
| `server/` | Express.js (CJS) + Supabase + R2 + Stripe | `server.js` | 3001 |

No shared packages, no workspace tooling. Each dir has its own `package.json` and dependencies.

## Frontend commands (from `soniq/`)

```sh
npm run dev          # vite dev server on 0.0.0.0:5173
npm run build        # vite build
npm run type-check   # vue-tsc --build
npm run lint         # oxlint . --fix  THEN  eslint . --fix --cache
npm run format       # prettier --write src/
```

No test framework is installed — there are no tests.

## Backend commands (from `server/`)

```sh
npm start            # node server.js
```

Backend requires a `.env` file (not committed). No lint, no typecheck, no tests.

## Key conventions

- **Frontend → Backend URL**: `VITE_SERVER_URL` env var, defaults to `http://localhost:3001`. Check this env if API calls fail.
- **Lint order matters**: oxlint runs before eslint (defined via `npm-run-all2`). Both must pass.
- **Formatting**: Prettier with `{ semi: false, singleQuote: true, printWidth: 100 }`.
- **EditorConfig**: indent 2 spaces, LF line endings, utf-8.
- **Vue**: Composition API with `<script setup lang="ts">` and `@/` path alias.
- **Stores**: Pinia, filenames use `.js` extension (even though project is TS).
- **Radio audio**: Managed via reactive `radioState` store shared between Radio views and `NowPlayingBar`.
- **Auth**: Custom token-based (base64 `id:timestamp`), stored in `localStorage` as `nyujam_token` / `nyujam_user`.
- **Stream logging**: Client POSTs to `/api/streams` after 30s of playback.
- **API responses**: German error messages throughout.
- **`.npmrc`**: `legacy-peer-deps=true` — use this flag if adding deps outside the existing install.

## Deployment

- Frontend deploys to Vercel (see `vercel.json` — SPA rewrites + CSP headers + AdSense).
- Server runs on Railway or similar behind a proxy (`app.set('trust proxy', 1)`).
- CORS allows `localhost:5173`, `*.vercel.app`, `nyujam.com`, and `FRONTEND_URL` env.
- Media served from Cloudflare R2. Auth + metadata in Supabase.
