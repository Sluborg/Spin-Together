# CLAUDE.md — Spin-Together

Conventions, commands, and the agent/skill index for this repo. Keep this current.

## What this is
Mobile-first, browser-based **2-player co-op** slot-builder roguelite. Static site on GitHub
Pages, real-time P2P via PeerJS room codes. Inspired by the **mechanics** of Luck Be A
Landlord — **mechanics only**. No LBAL art, symbol names, text, or sounds. All content
original or CC0.

## Golden rules
- **Data-driven, always.** All symbol/item/economy stats live in `/data/*.json`. Never
  hardcode a stat in engine code.
- **Pure engine.** Game logic in `src/engine/` is pure functions (no DOM, no network),
  unit-tested. Rendering (`src/ui/`) and networking (`src/net/`) sit on top.
- **Host-authoritative + seeded RNG.** All RNG on the host; state = `f(seed, intent log)`.
  Guest sends intents, receives state diffs.
- **Mechanics only, CC0 assets only.** Every asset credited in `CREDITS.md` with source + license.
- **Verify before claiming done.** curl the Pages URL / watch the Actions run; never assert a
  deploy without checking.
- **Every phase ends playable** on the dev URL; update `project-status.md` and stop for approval.

## Stack (ADR 001)
Vanilla **TypeScript + DOM/CSS Grid**, bundled with **Vite**. No game framework.

## Repo layout
```
src/engine/   pure game logic (payout, synergy, draft, growth, guardrail, RNG)
src/net/      PeerJS host-authoritative networking
src/ui/       DOM rendering + input
src/dev-tools/ symbol browser, synergy graph, live tuning (?debug=1 or /dev-tools/)
data/         symbols.json, items.json, economy.json  (source of truth)
docs/         GAME_DESIGN.md, adr/, PLAYTEST.md
.github/workflows/  ci.yml, pages.yml
```

## Commands (filled in as they exist — Phase 1+)
- `npm install` — deps
- `npm run dev` — Vite dev server
- `npm run build` — static build to `dist/`
- `npm test` — unit tests (payout engine, synergy, draft/guardrail, growth, RNG determinism)
- `npm run lint` — lint

## Branches & deploy
- `dev` = default (latest) → Pages `/Spin-Together/dev/`
- `main` = stable → Pages `/Spin-Together/`
- Feature work on `claude/spin-together-plan-l44a45`, PR → `dev`. Promote `dev`→`main` by PR.
- One Pages workflow composes both branch builds into one artifact. **Verify both URLs.**

## Subagents (`.claude/agents/`, model: sonnet)
| Agent | Job |
|-------|-----|
| `asset-fetcher` | Fetch CC0 assets (Kenney.nl → OpenGameArt/Freesound), rename to art/soundRef, write CREDITS.md |
| `boilerplate-writer` | Scaffold repetitive TS modules/config from a spec |
| `test-writer` | Write unit tests for pure engine functions |
| `content-filler` | Author original symbol/item flavor text into data JSON |
| `docs-writer` | Maintain docs (PLAYTEST, README, phase notes) |

## Skills (`.claude/skills/`)
| Skill | Job |
|-------|-----|
| `add-symbol` | Scaffold + validate a new symbol entry in symbols.json |
| `balance-report` | EV per symbol/spin, EV by rarity, flag outliers |
| `release` | dev→main promotion checklist; verify both Pages URLs |

## Docs index
- `docs/GAME_DESIGN.md` — full spec, open questions, multi-role review notes
- `docs/adr/001-stack.md` — stack decision
- `docs/PLAYTEST.md` — two-phone testing checklist per phase
- `project-status.md` — current state + next action (update every session)
- `PLAN.md` — phased roadmap
