## Quick Orientation for AI Coding Agents

This repository contains two closely related workers for collecting and viewing registry/company data:

- `worker.mjs` (root) — registry-stagehand worker that uses `@browserbasehq/stagehand` and Supabase to run browser automation against a Registry portal.
- `browserbase-worker/` — utilities, configs and multiple worker entrypoints (under `src/`), a `lib/` client wrapper for Browserbase, and a lightweight `ui/` static viewer.

Key integrations
- Supabase: `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` — service role key is sensitive; do not expose it in outputs or commits.
- Browserbase SDK + Stagehand: see `browserbase-worker/lib/BrowserbaseClient.mjs` and root `worker.mjs` for context/session lifecycle.

Important files to read first
- `worker.mjs` — main flow, normalization helpers, Supabase usage, top-level `Stagehand` init and page helpers.
- `browserbase-worker/package.json` — canonical npm scripts (run targets like `registry:stagehand`, `registry:local`, `check-proxies`).
- `browserbase-worker/lib/BrowserbaseClient.mjs` — how sessions/contexts are created and released.
- `browserbase-worker/config/constants.mjs` — project constants (geolocation, browser defaults, colors).
- `browserbase-worker/ui/README.md` — how to run and test the static UI (Mode 1) and optional server ideas.
- `migrations/` — database setup and schema changes relevant to Supabase tables used by workers.

Developer workflows & commands
- Install and run (project root):
  - `npm install` then `npm start` (runs `worker.mjs`).
- `browserbase-worker` specific (from that folder):
  - `npm run registry:stagehand` — run Stagehand-backed registry worker.
  - `npm run registry:local` — run local registry collector flow.
  - `npm run check-proxies` — proxy validation flow.
  - `npm run validate` / `npm run test` — helper entrypoints implemented in `src/worker.mjs`.
- UI testing: `npx http-server browserbase-worker/ui -p 8080` or `python3 -m http.server 8080` and open `index.html`.

Project-specific conventions and patterns
- ESM modules + top-level `await` are used (Node >= 18). Files end with `.mjs`.
- Logging: small console helpers and `COLORS` from `config/constants.mjs` — keep console output consistent.
- String/DOM parsing: `worker.mjs` uses strict normalization functions and exact-match name comparisons; preserve these semantics when modifying extraction logic.
- Browser automation: prefer Stagehand/Browserbase SDK flows over raw Puppeteer where provided (see `BrowserbaseClient`).
- Proxy handling is centralized under `browserbase-worker/config/proxies.mjs` and `ProxyManager`/`ProxyVerifier` in `lib/`.

Safety & secrets
- Never commit `SUPABASE_SERVICE_ROLE_KEY`, Browserbase API keys, or other secrets. If you need to run tests, use a local `.env` and add to `.gitignore`.
- Avoid creating DB functions or REST endpoints that accept arbitrary SQL strings (this repo uses Supabase and migrations instead).

What an agent should do first when making changes
1. Read `worker.mjs` and `browserbase-worker/lib/BrowserbaseClient.mjs` to understand lifecycle and side effects.
2. Look at `browserbase-worker/package.json` scripts and run the appropriate script in a disposable environment.
3. For DB changes, update `migrations/` SQL files and avoid exposing keys. Prefer read-only Supabase client for tests.

Examples to reference in code suggestions
- Replace direct page evaluation snippets with helper functions used in `worker.mjs` (e.g., `extractCompaniesFromCurrentPage`).
- When creating or modifying sessions use `BrowserbaseClient.createTestSession()` and `releaseSession()` semantics.

If anything is unclear
- Ask for the intended runtime (local vs CI), which secrets are available, and whether changes should run against real Browserbase/Supabase or mocked interfaces.

Please review and tell me which sections need more detail (scripts, env, or DB schema examples) and I will iterate.
