# Project status — Spin-Together

_Last updated: 2026-07-03 (Phase 0)_

## Current state
**Phase 0 (Research + design docs + scaffolding) — in progress.**
- Repo initialized (was blank). Directory skeleton created.
- Design docs written: `docs/GAME_DESIGN.md`, `docs/adr/001-stack.md`, `PLAN.md`, this file,
  `CLAUDE.md`, `docs/PLAYTEST.md`, `CREDITS.md`.
- Data schema seeded + validated: `data/symbols.json`, `data/items.json`, `data/economy.json`.
- Subagents scaffolded: `.claude/agents/{asset-fetcher,boilerplate-writer,test-writer,content-filler,docs-writer}.md`.
- Skills scaffolded: `.claude/skills/{add-symbol,balance-report,release}/`.
- Multi-role review (game design / network-mobile / economy / QA-skeptic) run; findings
  folded into `docs/GAME_DESIGN.md` §13.

## Key decisions locked (Phase 0)
- Stack: vanilla TS + DOM/CSS Grid + Vite (ADR 001).
- Branches: `dev` default + `main` stable, dual Pages.
- Guardrail: hybrid soft-ramp + hard-cap (`own ≤ shared+5`).
- Board growth: 4×4 → 6×6 tied to deadlines; run length 8 deadlines (v1).
- Networking: host-authoritative, seeded RNG, full-state snapshot resync.

## Open questions awaiting owner (see GAME_DESIGN.md §12 + §13 review)
- Confirm run length (8), guardrail band, payout resolution order.
- Networking review flagged: **TURN relay needed** (STUN-only free PeerJS fails on mobile
  CGNAT), **wss/secure signaling** (mixed-content), **snapshot+localStorage resume** as cheap
  host-drop mitigation. These become Phase 4 requirements.

## Next action
**Await owner approval to begin Phase 1 (Scaffold):** package.json + Vite + TS config, CI
(lint/test/build), dual-branch Pages workflow, and a board that renders on a phone. Verify
both Pages URLs respond before marking Phase 1 done.

## Live URLs
- Stable: `https://sluborg.github.io/Spin-Together/` — _not deployed yet (Phase 1)_
- Dev: `https://sluborg.github.io/Spin-Together/dev/` — _not deployed yet (Phase 1)_
