# Spin-Together — Game Design Document

> Status: **Phase 0 draft** for owner sign-off. Recommendations are marked **[REC]**.
> Open game-feel questions are marked **[OPEN]** and are *not* silently decided.
> Legal boundary: **mechanics only**. No LBAL art, symbol names, text, or sounds.
> All content original or CC0.

## 1. Pitch
A mobile-first, browser-based **2-player co-op** slot-builder roguelite. Two players share
one slot machine and one landlord. Each spin pays out coins based on the symbols shown and
how they interact (add / multiply / destroy / transform / spawn). Between spins you draft
new symbols to grow your machine. Together you must out-earn a **shared rent** that rises at
every deadline. Lose together, win together.

Inspired by the *mechanics* of Luck Be A Landlord (LBAL); zero LBAL assets or names.

## 2. Core loop
```
   ┌─ spin (active player) ──────────────────────────────────────┐
   │  board fills from active player's (own ∪ shared) pool        │
   │  payouts resolve (canonical order, §9): base → destroy →     │
   │  transform → spawn → synergy add → synergy multiply → sum     │
   │  coins added to the SHARED coffer                            │
   ├─ dual draft (both players, simultaneously) ─────────────────┤
   │  active player: pick 1 of 3 → OWN pool                       │
   │  co-player:     pick 1 of 3 → SHARED pool                    │
   ├─ turn passes to the other player ───────────────────────────┤
   └─ every N spins: RENT DEADLINE — pay shared rent or evicted ──┘
   at milestone deadlines the BOARD GROWS (see §6)
```

## 3. Co-op model
- **One shared landlord / one shared rent** that scales per deadline (§7). Both players'
  payouts flow into a single shared coffer. Rent is paid from it. **Lose together / win
  together.**
- **Turns alternate.** Only the active player spins. The **non-spinning player stays engaged**
  by (a) watching the live board sync over P2P and (b) making the **shared** draft pick every
  spin (§5).

## 4. Symbol pools
- Each player has an **own pool** (personal). There is **one shared pool** both draw from.
- On your turn, the spin draws the board from **own ∪ shared** (your own pool plus the shared
  pool). Your co-player's own pool is *not* in your draw.
- This means the shared pool is the collaboration surface: symbols placed there help *both*
  players and are where co-op synergy strategies are built.

## 5. Dual draft (every spin) — **[REC]**
After each spin, **two** drafts happen simultaneously:
- **Active player** drafts **1 of 3** offered symbols → their **own** pool.
- **Co-player** drafts **1 of 3** offered symbols → the **shared** pool.

**[REC]** Run this **every spin** so the non-spinner acts on every turn (max engagement).
- Rejected alt: shared draft only every *other* spin — reduces non-spinner engagement and
  makes turns feel passive.

Offered cards are drawn by the host RNG (seeded) weighted by rarity and by the guardrail (§8).

## 6. Board growth
Board starts small and grows at deadline milestones, replacing LBAL's fixed 5×4:

| After deadline | Board | Cells |
|----------------|-------|-------|
| start (1–2)    | 4×4   | 16    |
| 3              | 5×4   | 20    |
| 4              | 5×5   | 25    |
| 5              | 6×5   | 30    |
| 6+             | 6×6   | 36    |

More cells = more symbols land per spin = higher payout ceiling, so rent (§7) must scale with
board size *and* deadline index. All growth thresholds live in `data/economy.json`.

## 7. Economy (parametric — `data/economy.json`, tuned by balance-report, never hardcoded)
- **Shared rent per deadline:** `rent_d = round(base · growth^d)` where `d` is the deadline
  index. Starting point to tune: `base = 25`, `growth = 1.53` → `rent_8 ≈ 750` (LBAL-like
  25 → ~750 climb). *(Correction: an earlier draft used `growth = 1.7`, which overshoots to
  ~1744 by d8 — see §13 R-E2.)* Phase 5 replaces the scalar with a per-deadline vector.
- **Spins per deadline:** shared across the two alternating players; scales up over the run
  (start ~6, end ~10), mirroring LBAL's 5→10.
- **Calibration target:** `EV_per_spin × spins_per_deadline ≈ 1.3–1.6 × rent_d` across the
  run (tense but winnable with reasonable drafting). EV is measured by the `balance-report`
  skill, not guessed.
- **v1 length: 8 deadlines** **[REC]** (~15–20 min mobile run) rather than LBAL's 12.
  - **[OPEN]** Confirm 8; 10 or 12 are viable if longer runs are wanted.

## 8. Divergence guardrail — **[REC] hybrid soft-ramp + hard-cap**
Constraint from owner: **`own ≤ shared + 5`** (own pool must not outgrow shared by >5).
`gap = ownCount − sharedCount`.

Evaluated three mechanisms:

| Mechanism | Type | Pro | Con |
|-----------|------|-----|-----|
| Pure hard cap (`own ≤ shared+5` enforced by silently blocking own drafts) | hard | trivial, guaranteed | abrupt; a rejected draft feels bad; no warning ramp |
| Pure soft dilution (down-weight own-pool odds as gap grows) | soft | smooth, keeps agency | no hard guarantee — can still drift past +5 with unlucky offers |
| **Hybrid: soft ramp then hard backstop** | both | smooth *and* guaranteed | slightly more logic (still one pure function) |

**[REC] Hybrid**, implemented as a pure function `resolveDraftConstraints(ownCount, sharedCount)`:
- `gap ≤ 2` → **normal**: 3 own-pool draft cards; no dilution.
- `gap 3–4` → **soft ramp**: one of the 3 personal slots becomes a "donate to shared" card,
  and own-pool draw odds get a mild dilution weight so shared value stays attractive.
- `gap = 5` → **hard backstop**: personal draft is locked; the pick redirects to shared until
  the gap closes.

Rationale: preserves player agency for the vast majority of a run (soft), while *guaranteeing*
divergence never exceeds 5 (hard). Fully data-driven and unit-testable.
- **[OPEN]** Confirm the `+5` threshold and the ramp band (2 / 3–4 / 5). Easy to retune in
  `data/economy.json`.

## 9. Symbols (data-driven — `data/symbols.json`)
Schema per symbol:
```jsonc
{
  "id": "string, unique, kebab-case",
  "name": "string, original (no LBAL names)",
  "rarity": "common | uncommon | rare | very-rare | special",
  "baseValue": 0,                 // coins paid when it lands (before synergies)
  "tags": ["animal", "food", ...],// combo-line backbone
  "synergies": [                  // structured, machine-traceable
    { "withTag": "food", "effect": "add", "value": 2, "note": "…" },
    { "withId": "some-id", "effect": "multiply", "value": 2, "note": "…" }
  ],
  "destroys": ["tag-or-id", ...], // what this removes from the board on landing
  "transforms": [ { "from": "tag-or-id", "to": "id", "note": "…" } ],
  "spawnRules": [ { "spawns": "id", "chance": 0.1, "note": "…" } ],
  "artRef": "assets/symbols/xxx.png",
  "soundRef": "assets/sfx/xxx.ogg",
  "devNotes": "designer intent / balance notes"
}
```
- **`effect`** vocabulary (v1): `add`, `multiply`, `addPerAdjacent`, `destroy`, `transform`,
  `spawn`. Extend deliberately; every combo line must be expressible as data.
- **`tags`** (starter set): `animal, food, mineral, plant, human, tool, treasure, destroyer,
  scaler, spawner, gambler, cursed`. Tags are the backbone — every synergy references a tag
  or an id.
- **Resolution order per spin (canonical — see §13):** (1) base values, (2) destroy,
  (3) transform, (4) spawn, (5) synergy `add`, (6) synergy `multiply`, (7) sum → shared coffer.
  **Single-pass snapshot semantics**: each phase reads the board as of the end of the previous
  phase (no live mutation mid-phase), with a hard per-phase iteration cap and deterministic
  tie-break (board index → symbol id). Board-full spawn = drop; empty-pool draw = offer <3/skip.
  This is the first golden-master test in the payout engine (integer coin math only).

## 10. Items / relics (data-driven — `data/items.json`), co-op aware
Passive modifiers acquired at milestones. Each item targets a scope:
- `own` — affects the holder's own pool/board only.
- `shared` — affects the shared pool/board.
- `both` — affects both players.
Examples (flavor original): "+1 to all `food` in the shared pool", "own-pool `animal` symbols
pay ×1.5", "each deadline, add a random common to shared". Full schema finalized in Phase 5.

## 11. Networking (host-authoritative)
- PeerJS free cloud broker for **signaling only**. Host creates a **5-char room code**; guest
  joins by code.
- **Host-authoritative:** all RNG and canonical state live on the host. Guest sends *intents*
  (spin, draft pick), receives *state diffs*. Prevents desync and cheating.
- **Seeded RNG** (mulberry32/splitmix32): full game state = `f(seed, intent log)` →
  reproducible for testing and resync.
- **Disconnect/reconnect:** full-state resync on reconnect (broker holds offers ~5s; we retry
  with backoff). **Host migration is out of scope v1** (documented limitation — if the host
  drops, the run pauses/ends).
- **Hot-seat fallback [REC]:** single-client pass-and-play mode (no PeerJS). Cheap with DOM;
  useful for solo testing and same-couch play.

## 12. Open questions summary (each with a recommendation)
| # | Question | Recommendation |
|---|----------|----------------|
| Q1 | Rendering stack | vanilla TS + DOM/CSS Grid + Vite (ADR 001) |
| Q2 | Guardrail mechanism | Hybrid soft-ramp + hard-cap (§8) |
| Q3 | Board growth schedule | 4×4→6×6 tied to deadlines (§6) |
| Q4 | Run length | 8 deadlines for v1 (§7) |
| Q5 | Payout resolution order | destroy→transform→spawn→add→multiply (§9), TDD'd |
| Q6 | Dual-draft cadence | every spin (§5) |
| Q7 | Item schema depth | finalize in Phase 5 (§10) |
| Q8 | Icon art family | one CC0 family (asset-fetcher picks; documented in CREDITS.md) |

## 13. Multi-role review notes & revisions
Four independent reviewers (game designer, network/mobile engineer, economy analyst, QA/security
skeptic) critiqued the Phase 0 draft. Findings below, grouped, with **disposition**. Severities:
`[BLOCKER] [SHOULD-FIX] [NICE]`.

### ⭐ Headline: the guardrail can never fire (two reviewers, independently) — **OWNER DECISION NEEDED**
- **R-D1 [BLOCKER]** Under §5's *fixed* draft destinations (active player → own every one of
  *their* turns; co-player → shared every spin), the **shared pool grows ~2× as fast as any
  player's own pool**. So `gap = ownCount − sharedCount` trends strongly *negative* and the
  `own ≤ shared + 5` cap (§8) **never binds** — the entire hybrid guardrail is dead code, and
  the "personal vs shared investment" tension it sells does not actually exist. The real risk is
  the *inverse*: shared dominates both boards, own pools go vestigial, and the two players'
  boards homogenize.
  **Disposition — escalate to owner (do not silently decide).** Recommended resolution:
  **let each player choose their draft's destination (own *or* shared) every pick.** This (a)
  makes divergence a real, expressive decision the guardrail actually governs; (b) restores
  the co-op tension the design promised; (c) creates a genuine *joint* decision beat. If the
  owner prefers to keep fixed destinations, then **delete §8 entirely** and instead add a
  *floor* protecting own-pool relevance. Guardrail + draft-code lands in Phase 2, so this must
  be resolved before then — it does not block Phase 1.

### Game feel
- **R-G1 [SHOULD-FIX]** Non-spinner is a spectator during the partner's spin+resolve; "watching
  board sync" isn't a mechanic. → **Pipeline** the idle player's next shared draft *during* the
  partner's spin animation, and give them one *in-spin* action (shared boost/reroll/nudge token
  that lands on the current spin). Fold into Phase 4 turn UX.
- **R-G2 [SHOULD-FIX]** Forced 2 adds/spin bloats pools far past 36 cells → built synergies
  rarely fire → outcomes feel random, not skillful. → Add **skip-draft** and/or a per-deadline
  **remove-a-symbol** action, or a soft pool cap. Design in Phase 2.
- **R-G3 [SHOULD-FIX]** Siloed simultaneous drafts remove the "together." → Add ≥1 *joint*
  decision beat (e.g. a shared-item choice at each deadline both must confirm). Overlaps R-D1.
- **R-G4 [NICE]** Own-vs-shared is two mental models/turn and hurts board legibility (spectator
  sees own-pool symbols they never influenced). → Tag symbol **provenance** on the board;
  largely resolved if R-D1's "choose destination" fix lands.
- **R-G5 [NICE]** A hard `gap=5` lock feels bad (confiscates a choice). → If any guardrail
  survives, keep it **purely soft** (asymptotic odds bias, never a hard lock).

### Networking / mobile  (→ all become Phase 4 requirements)
- **R-N1 [BLOCKER]** Free PeerJS is **STUN-only, no TURN** — phone↔phone on carrier CGNAT /
  symmetric NAT often never connects. → Budget a **TURN relay** from day one (self-host
  `coturn`, or Metered/Twilio free tier), pass `iceServers` explicitly, add a ~10s
  connection-health timeout, and test on real **cellular↔cellular**.
- **R-N2 [BLOCKER]** "Host drop ends the run" + mobile backgrounding = "anyone who locks their
  phone ends the game" (iOS Safari tears down WebRTC ~30s after backgrounding). → Treat
  `visibilitychange`/`pagehide` as first-class; keep a **warm full mirror on the guest** and a
  **`localStorage` snapshot** on both peers each turn, enabling *re-pair-and-resume* from the
  last snapshot — cheap partial host-migration without true migration.
- **R-N3 [SHOULD-FIX]** Non-SSL signaling = **mixed-content block** under an HTTPS site. → Use
  PeerJS `secure: true` (wss) and serve the game over HTTPS (Pages already is).
- **R-N4 [SHOULD-FIX]** No intent **ack/dedup** across a drop → intents lost or double-applied.
  → Monotonic per-peer intent id; host dedups + echoes `lastAppliedIntentId`; idempotent apply;
  on reconnect guest resyncs to snapshot and resends only intents after that id.
- **R-N5 [SHOULD-FIX]** 5-char code lives in the **global** free-broker namespace → collisions /
  `unavailable-id` / squatting. → Namespace the id (`spintog-<code>`), unambiguous alphabet
  (drop `0/O/1/I/l`), regenerate-and-retry on `unavailable-id`, consider 6 chars.
- **R-N6 [SHOULD-FIX]** Resync by **snapshot, not log replay** (log grows unbounded; replay is
  slow and determinism-fragile). Keep the intent log for tests/debug only; target snapshot
  messages well under ~16KB (worst-case 6×6 + two pools + items); test chunk reassembly.

### Economy / balance
- **R-E1 [BLOCKER]** `EV_per_spin` is **not separable** (synergy `add→multiply` chains depend on
  co-occurrence; heavy-tailed) and mean EV is the wrong statistic. → `balance-report`
  **Monte-Carlos** K spins/deadline at each cell count against a defined **reference draft
  policy**, reports **median & p25**, and calibrates the band on **p25 vs rent**, averaged
  **turn-weighted across both players' decks** (own_A∪shared vs own_B∪shared).
- **R-E2 [SHOULD-FIX]** ✅ *Fixed.* `25·1.7^8 ≈ 1744`, not ~750. Corrected `growth` to **1.53**
  in `economy.json` and §7 (`25·1.53^8 ≈ 750`).
- **R-E3 [SHOULD-FIX]** Fixed 1.7×/deadline rent vs lumpy cell growth (only d3–d6) makes **d7–d8
  the hardest walls** (no more board/spin growth, rent still compounding). → Bend rent
  sub-geometric after d6 and/or extend growth past d6; make `growth` a **per-deadline vector**
  (`growthPerDeadline` stub already added to `economy.json`).
- **R-E4 [SHOULD-FIX]** A single growth constant can't track an **emergent multiplicative**
  economy (overshoots on an engine, undershoots on bad luck). → Validate the band empirically
  per-`d` against both a p25 floor and a greedy-synergy ceiling; retune per-deadline.
- **R-E5 [NICE]** Co-op needs **no 2× rent factor** — alternating turns already feed the coffer
  one spin at a time; `spinsPerDeadline` captures throughput. (Current framing kept.)

### QA / determinism / security  (→ engine + CI requirements, Phase 2/4)
- **R-Q1 [BLOCKER]** ✅ *Fixed.* Resolution order was stated **three contradictory ways** (§2, §9,
  Q5). Canonicalized to a single order below; it is the first golden-master test.
- **R-Q2 [BLOCKER]** Undefined semantics for **degenerate cases** (transform cycles, destroy of a
  buffing symbol, spawn on a full board, self-referential synergy, empty-pool draw). → Define
  **single-pass snapshot semantics** (each effect reads the pre-phase board, not live-mutated
  state), a hard per-phase iteration cap with deterministic tie-break (board index → symbol id),
  explicit board-full spawn rule (drop), empty-pool fallback (offer < 3 / skip). Each gets a
  named unit test. Spec'd in §9 revision below.
- **R-Q3 [BLOCKER]** Host authority asserted but **intent validation unspecified** (forge
  unoffered draft, replay spin, spin off-turn, malformed crash). → Host validates every intent:
  type/schema, `turn == sender`, draft pick ∈ the exact 3 host-generated offers, monotonic
  per-peer seq + idempotent dedupe; **reject, never crash**. Phase 4 core.
- **R-Q4 [SHOULD-FIX]** **Floating point** breaks `f(seed, intent log)` reproducibility. → Use
  **integer/fixed-point** coin math (multipliers as rationals, round at one defined point),
  specify exact RNG draw order per phase, add a cross-env byte-for-byte golden-master in CI.
- **R-Q5 [SHOULD-FIX]** `symbols.json` **referential integrity** must **fail loud**. → CI
  validator hard-fails on: duplicate/missing ids, dangling `withId`/`transforms.*`/`destroys`/
  `spawnRules.spawns`, unknown tag/effect/rarity enums, `chance ∉ [0,1]`. (The seed data
  intentionally contains one dangling `transforms.to` — `silver-ingot` — as a validator fixture.)
- **R-Q6 [SHOULD-FIX]** Guardrail `gap` must be recomputed from **live authoritative counts**
  (items, destroys, "donate" cards mutate counts outside the draft path); define dual-draft
  tie-break; property-test `own ≤ shared+5` after **every** transition. (Moot if R-D1 removes
  fixed destinations — but the property test stays.)

### Canonical revisions adopted now
- **Payout resolution order (canonical, replaces §2/§9/Q5 conflict):**
  `1) base values → 2) destroy → 3) transform → 4) spawn → 5) synergy add → 6) synergy multiply
  → 7) sum → shared coffer`. Single-pass snapshot semantics; each phase reads the state as of
  the end of the previous phase. This is the first golden-master test in Phase 2.
- **Determinism contract:** integer coin math; seeded RNG only (no `Date.now`/`Math.random`);
  sorted/stable iteration over symbols; fixed per-phase RNG draw order.
- **Data validation:** loud-failing CI validator (R-Q5) is a Phase 1 deliverable.
- **Economy measurement:** `balance-report` = Monte-Carlo median/p25, turn-weighted (R-E1).
