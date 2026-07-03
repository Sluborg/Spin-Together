# Project status — Spin-Together

_Last updated: 2026-07-03 (Phase 2)_

## Current state
**Phase 2 (Core loop, solo) — DONE and deployed live. ✅**
Playable single-device run on the dev URL: spin → individual own draft → communal shared draft
(both skippable, own hard-capped at shared+5) → rent deadlines → board growth (4×4→6×6) →
win/lose. Pure engine, 31 unit tests green, verified end-to-end via headless playthrough
(reached D4 / 5×5, synergies compute correctly, zero console errors).

**UI polish (post-Phase 2):** draft selections are now a **centered overlay** with a hide/show
toggle (board stays peekable); symbols render as an **original CC0 vector icon set**
(`public/assets/symbols/*.svg`) with an emoji fallback. _Note: the `asset-fetcher` subagent
looped without producing files, so the icon set was authored directly; can be swapped for a
Kenney.nl CC0 pack later if a different look is wanted._

Prior: **Phase 1 (Scaffold)** — toolchain, CI, dual-branch Pages, both URLs live.
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

## Engine (Phase 2, pure & tested — `src/engine/`)
- `rng.ts` mulberry32 (golden vectors) · `payout.ts` canonical resolver (integer math, snapshot
  semantics, destroy/transform/spawn/add/multiply + degenerate cases) · `draft.ts` guardrail +
  weighted offers · `economy.ts` rent/growth/rounds · `game.ts` reducers · `state.ts` types.
- 31 tests: RNG determinism, payout order + edge cases, guardrail property (`own ≤ shared+5`
  after every transition), win/lose. UI (`src/ui/app.ts`) is a thin DOM view over the reducers.

## Next action
**Await owner approval for Phase 3 (Dev tools):** symbol browser + tag filter, synergy graph,
in-browser live value editing + JSON export, `balance-report` wired to real data. (Two-player
P2P is Phase 4; balance tuning is Phase 5.)

## Live URLs
- Stable: `https://sluborg.github.io/Spin-Together/` — ✅ live
- Dev: `https://sluborg.github.io/Spin-Together/dev/` — ✅ live
