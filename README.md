# Spin-Together

A mobile-first, browser-based **2-player co-op** slot-builder roguelite. Two players share one
slot machine and one landlord: spin, earn coins from how your symbols interact, draft new
symbols to grow the machine, and together out-earn a shared rent that rises every deadline.
**Lose together, win together.**

Inspired by the *mechanics* of Luck Be A Landlord — **mechanics only**. No LBAL art, symbol
names, text, or sounds. All content is original or CC0.

- **Play:** static site on GitHub Pages (stable + dev builds — links below once deployed).
- **Multiplayer:** real-time P2P via PeerJS room codes (host-authoritative).
- **Stack:** vanilla TypeScript + DOM/CSS Grid, built with Vite (see `docs/adr/001-stack.md`).

## Status
**Phase 0 (design + scaffolding).** See `project-status.md` for current state and next action,
`PLAN.md` for the roadmap, and `docs/GAME_DESIGN.md` for the full design.

## Live builds
- Stable (`main`): `https://sluborg.github.io/Spin-Together/` — _pending Phase 1_
- Dev (`dev`): `https://sluborg.github.io/Spin-Together/dev/` — _pending Phase 1_

## Repo map
| Path | What |
|------|------|
| `data/` | Source of truth: `symbols.json`, `items.json`, `economy.json` |
| `src/` | `engine/` (pure logic), `net/` (PeerJS), `ui/` (DOM), `dev-tools/` |
| `docs/` | `GAME_DESIGN.md`, `adr/`, `PLAYTEST.md` |
| `.claude/` | Subagents + skills for this project |
| `CLAUDE.md` | Conventions, commands, agent/skill index |

## Contributing
Data-driven only (no hardcoded stats), pure testable engine, host-authoritative networking.
Read `CLAUDE.md` first. Feature work → PR into `dev`; `dev`→`main` by PR for stable releases.
