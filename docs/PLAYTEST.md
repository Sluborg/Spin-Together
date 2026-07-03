# PLAYTEST.md — two-phone testing checklist

Manual test passes per phase. Prefer **two real phones on cellular** (not two tabs on wifi) for
anything networking-related — see the network review (GAME_DESIGN §13 R-N1).

## Phase 1 — Scaffold
- [ ] Both Pages URLs load on a phone: stable `/Spin-Together/` and dev `/Spin-Together/dev/`.
- [ ] Empty 4×4 board renders and fits portrait without horizontal scroll.
- [ ] Tap targets ≥ 44px; no layout overflow on a small phone (≤360px wide).
- [ ] `data/*.json` load without console errors.

## Phase 2 — Solo core loop
- [ ] Spin animates and pays out; coins update the shared coffer.
- [ ] Draft offers 3 symbols; picking adds to the pool.
- [ ] Rent deadline triggers; paying / failing resolves correctly (win/lose together).
- [ ] Board grows at the scheduled deadlines (16→20→25→30→36).
- [ ] Same seed + same picks → identical run (determinism).

## Phase 3 — Dev tools
- [ ] `?debug=1` opens the symbol browser; filter by tag/rarity works.
- [ ] Synergy graph shows buffs/destroys/spawns edges.
- [ ] Live-editing a value updates EV; export produces valid JSON.

## Phase 4 — Multiplayer (two phones, cellular)
- [ ] Host gets a room code; guest joins by code within ~10s (or clear failure message).
- [ ] Connects on **cellular↔cellular** (TURN relay working), not just same wifi.
- [ ] Guest board mirrors host live; turns alternate correctly.
- [ ] Dual draft: active→own, co-player→shared (or chosen destination per final R-D1 decision).
- [ ] Lock one phone / background it → "reconnecting" shown → resumes from snapshot on return.
- [ ] Forged/off-turn intent from guest is rejected, host does not crash.
- [ ] Hot-seat mode: single device pass-and-play completes a run.

## Phase 5 — Polish
- [ ] Items apply at correct scope (own / shared / both).
- [ ] Audio plays; no jarring clipping; respects mute.
- [ ] Balance: a competent pair wins ~most runs but can lose to bad luck (balance-report band).
