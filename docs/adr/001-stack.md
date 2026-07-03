# ADR 001 — Rendering & build stack

- Status: **Accepted** (Phase 0)
- Date: 2026-07-03
- Deciders: Owner + Opus orchestrator

## Context
Spin-Together is a mobile-first, static-hosted (GitHub Pages) 2-player co-op slot-builder.
The board is a small grid (4×4 up to 6×6 = 36 cells). The bulk of the app is **data-driven
UI**: draft cards, symbol browser, a synergy graph visualizer, and a live-tuning dev tool.
Networking is P2P (PeerJS). Constraints: mobile performance, small bundle, trivial static
hosting, minimal build tooling, easy data-driven UI.

## Options considered
| Option | Pros | Cons |
|--------|------|------|
| **Vanilla TS + DOM/CSS Grid + Vite** | free text/layout/a11y; tiny bundle; CSS/WAAPI juice; trivial hosting; easiest data-driven UI & dev tools | must hand-roll some animation sequencing |
| Phaser 3 | batteries-included game framework | heavy bundle; canvas text/UI is painful; dev-tools UI fights the engine |
| PixiJS | fast WebGL rendering | overkill for ≤36 cells; still need a DOM UI layer anyway; more tooling |
| No-build (plain JS modules) | zero tooling | loses TypeScript types across a large content pipeline; no bundling/minify |

## Decision
**Vanilla TypeScript + DOM/CSS Grid, bundled with Vite.**

The visual complexity (a small grid of icons) does not justify a canvas/WebGL engine, and the
*real* complexity — data-driven menus, the symbol browser, and the synergy graph — is far
easier and more accessible in the DOM. Vite provides TypeScript, module bundling, and a dev
server with near-zero config, and outputs a static bundle Pages can host directly. Animation
"juice" is delivered with CSS transitions/transforms and the Web Animations API.

## Consequences
- Game logic is written as **pure TypeScript functions** (engine), independent of the DOM, so
  it is unit-testable and reusable on host and guest.
- Rendering is a thin DOM layer subscribing to engine state.
- If per-spin animation ever needs canvas-level performance, individual effects can be
  layered on canvas without changing the engine — revisit only if profiling on a real phone
  demands it.
- Build command: `vite build`; output `dist/` deployed to Pages (root for `main`, `/dev/`
  for `dev`).
