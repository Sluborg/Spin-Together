# Project status — Spin-Together

_Last updated: 2026-07-03 (Phase 1)_

## Current state
**Phase 1 (Scaffold) — DONE and deployed live. ✅**
Both Pages URLs verified serving the app (HTTP 200 + JS bundle 200). CI green on all branches.
- Toolchain: Vite + TypeScript (strict) + ESLint (flat) + Vitest. `package.json` scripts:
  `dev`, `build`, `preview`, `typecheck`, `lint`, `validate-data`, `test`.
- Board renders on a phone: responsive 4×4 CSS-Grid board + placeholder HUD (coffer / rent /
  deadline / board size), mobile-first, no horizontal scroll at 360px (verified via headless
  screenshot). Bundle ~5.3 kB JS / 1.6 kB CSS.
- Data-driven load: `src/main.ts` loads `data/*.json` through typed interfaces
  (`src/engine/types.ts`); dev build runs the validator at runtime.
- **Loud-failing data validator** (`src/engine/validate.ts` + `scripts/validate-data.ts`,
  `npm run validate-data`): rejects dangling refs, bad enums, `chance ∉ [0,1]`, dup ids.
  Negative fixture + unit test in `test/`.
- CI (`.github/workflows/ci.yml`): typecheck → lint → validate-data → test → build.
- Dual-branch Pages (`.github/workflows/pages.yml`): composes `main`→root + `dev`→`/dev/` into
  one artifact. **Needs repo Pages Source = "GitHub Actions" to deploy.**

## Local verification (all green)
`typecheck` ✓ · `lint` ✓ · `validate-data` ✓ (5 symbols, 3 items) · `test` ✓ (2) ·
`build` ✓ (default + `/Spin-Together/dev/` base) · headless board render ✓.

## Deploy status
- Pages Source = GitHub Actions ✅ (composing workflow deployed both builds).
- `main`→root and `dev`→`/dev/` both verified live (HTTP 200 + JS 200), commit `f105417`.
- Remaining optional owner setting: **Settings → General → Default branch → `dev`** (if not
  already set) so PRs default to `dev`.

## Open questions awaiting owner
- **⭐ R-D1 (guardrail / draft destinations)** — still open; needed before Phase 2 codes drafting.
  Recommendation: let each player choose own-vs-shared destination per draft. See GAME_DESIGN §13.
- Confirm run length (8) and payout resolution order (canonical order already spec'd).
- Phase 4 networking requirements captured: TURN relay, wss, snapshot+localStorage resume.

## Next action
**Await owner approval for Phase 2 (Solo core loop)** — seeded RNG (mulberry32) + golden
vectors, TDD payout engine (canonical order, integer coin math), synergy resolver, draft, rent
deadlines, board growth. Resolve R-D1 before drafting is coded.

## Live URLs
- Stable: `https://sluborg.github.io/Spin-Together/` — ✅ live
- Dev: `https://sluborg.github.io/Spin-Together/dev/` — ✅ live
