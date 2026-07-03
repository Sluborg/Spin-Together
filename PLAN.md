# PLAN.md — Spin-Together roadmap

Phased delivery. **Each phase ends playable on the dev URL.** Stop after each phase, update
`project-status.md`, summarize, and wait for owner approval before the next phase.

## Phase 0 — Research + design + scaffolding _(this session)_
- [x] Research LBAL loop + PeerJS realities.
- [x] `docs/GAME_DESIGN.md`, `docs/adr/001-stack.md`, `CLAUDE.md`, `project-status.md`.
- [x] Data schema seeded + validated: `data/{symbols,items,economy}.json`.
- [x] Subagents + skills scaffolded.
- [x] Multi-role review folded into GAME_DESIGN §13.
- No gameplay code. **Gate: owner approves before Phase 1.**

## Phase 1 — Scaffold
- `package.json`, Vite, TypeScript, ESLint config.
- `.github/workflows/ci.yml` (lint + test + build on every PR).
- `.github/workflows/pages.yml` — compose `main`→root + `dev`→`/dev/` into one Pages artifact.
- Minimal app: load `data/*.json`, render an empty board (4×4) responsively on a phone.
- **Done when:** both Pages URLs respond and the board renders on a real phone.

## Phase 2 — Core loop (solo harness)
Builds + TDDs the pure engine and a single-device playable loop; the two-player round
sync (individual + communal consensus draft over P2P) is Phase 4.
- Seeded RNG (mulberry32) with golden vectors; integer coin math.
- Payout engine (TDD): canonical order base → destroy → transform → spawn → add → multiply → sum
  (GAME_DESIGN §9), single-pass snapshot semantics + degenerate-case tests (§13 R-Q2).
- Synergy resolver; draft (1-of-3) **to own** and **to shared**, with **skip**; rent deadlines;
  board growth (16→36).
- Guardrail `resolveDraftConstraints(own, shared) → {canDraftOwn}` — ✅ **confirmed** hard cap
  `own ≤ shared+5`, skip-only at cap (§8); property-tested after every transition (§13 R-Q6).
- Playable solo run start → win/lose on the dev URL.
- **Done when:** a run is completable on the dev URL and the engine test suite is green.

## Phase 3 — Dev tools
- Symbol browser (filter by tag/rarity), synergy graph (buffs/destroys/spawns), live value
  editing + JSON export. `?debug=1` or `/dev-tools/`.
- `balance-report` skill wired to real data.
- **Done when:** owner can browse + tune symbols in-browser and export edited JSON.

## Phase 4 — Multiplayer
- PeerJS host-authoritative rooms (5–6 char codes, namespaced, `secure: true`).
- Explicit `iceServers` incl. **TURN relay** (per network review); connection-health timeout.
- Intent validation (turn check, offer-membership check, per-peer monotonic seq + idempotent
  dedupe), state-diff sync, snapshot resync + `localStorage` resume on host drop.
- Alternating turns, own/shared pools, dual draft. Hot-seat fallback mode.
- **Done when:** two real phones on cellular complete a co-op run incl. a reconnect.

## Phase 5 — Polish
- Items/relics (co-op scoped), audio, animation juice.
- Balance pass via `balance-report`; retune `data/economy.json`.
- `release` skill: promote dev→main, verify both URLs.
- **Done when:** balanced, juiced build promoted to `main`.

## Cross-cutting requirements (from Phase 0 multi-role review — GAME_DESIGN §13)
- Integer/fixed-point coin math; one canonical payout resolution order; determinism golden tests.
- Data validator in CI (dangling ids/tags, `chance ∉ [0,1]`, unknown enums, dup ids).
- Defined semantics for synergy edge cases (cycles, destroy-then-reference, board-full spawn,
  empty-pool draw) with named unit tests.
- TURN relay + wss + snapshot resume for mobile networking.
