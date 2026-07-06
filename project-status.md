# Project status — Spin-Together

_Last updated: 2026-07-03 (Phase 2)_

## Current state
**Phase 2 (Core loop, solo) — DONE and deployed live. ✅**
Playable single-device run on the dev URL: spin → individual own draft → communal shared draft
(both skippable, own hard-capped at shared+5) → rent deadlines → board growth (4×4→6×6) →
win/lose. Pure engine, 31 unit tests green, verified end-to-end via headless playthrough
(reached D4 / 5×5, synergies compute correctly, zero console errors).

**UI polish (post-Phase 2):**
- **Board = slot machine** with a **reel spin**: reels scroll symbols **downward** one row at a
  time, land staggered left→right with a bounce, then **hold ~0.9s so the result reads** before
  the draft opens. Only the **current board** is shown (starts **3×3**, grows to 6×6); no 6×6
  preview. Per-slot payout is a small **rounded-rect gold tag** (radius 4, not a coin).
- **Combined draft:** one overlay shows **both pools at once** — **Your pool** (gold) and
  **Shared pool** (teal), visually distinct. Tap a card in each to select (glow feedback; tap
  again / leave blank to skip), then **Confirm** applies both. Engine reducer `resolveDrafts`
  replaced the sequential chooseOwn/chooseShared (phase `draft`; both offers drawn up-front).
- **HUD redesign (new-player clarity):** a gold **GOLD** box (styled like the payout tags) + one
  **RENT** box = amount due, `Deadline n/8`, a progress bar, `N spins left`, and a live
  `need X more` / `✓ covered` status. Dropped the board-size stat.
- **Post-spin flow:** the reels land, then a **Continue →** button (with "Spin paid +N gold")
  lets the player read the result before opening the draft (replaced the fixed delay).
- **Rarity coloring:** draft cards tint border + label by rarity (common grey · uncommon green ·
  rare blue · very-rare purple · special orange). Spin button de-iconed ("Spin"). Removed the
  event-log footer (the single "Spin paid" line covers it).
- **Deferred:** normalizing per-sprite outline weights (no clean fix-by-rule; would be per-sprite).
- **Sprites: frame-free 16px pixel** (Tiny-style). Kenney Tiny Farm for farmer/hen/carrot;
  coin + gem are **original CC0 pixel art** (Kenney's Tiny *item* tiles carry an inventory-slot
  frame — the "thick brown border" — so they're avoided). Crisp via `image-rendering: pixelated`.
- **Draft** is a centered overlay with a hide/show toggle.
- Names: Copper Coin, Gemstone, Prospector, Barn Hen, Carrot — **ids + mechanics unchanged**,
  reversible. Sourcing in `docs/assets/pack-map.md`; provenance in `CREDITS.md`.
  _Owner is iterating on feel._

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

## Phase 3 (Dev tools) — started
- **Asset picker + symbol builder** (`?dev=1`): Kenney **set** dropdown + a visual grid of
  **pre-filtered small-object tiles** (terrain/floors/large houses dropped by a transparency +
  bbox rule — `scripts/build-dev-assets.py`). Pick a tile, then **create or edit symbols**
  (id, name, rarity, baseValue, tags + the picked art) — including brand-new ones — and
  **Export symbol set JSON** (`{symbols[], art{id→pack/tile}}`). Existing symbols' richer fields
  (synergies/etc.) are preserved. Filtered tiles in `public/dev-assets/` (CC0 Kenney Tiny
  Farm/Dungeon/Town/Battle). Lazy chunk (`src/dev-tools/picker.ts`), not in the game bundle.
- **Authoring UX:** auto kebab-case **id** from the name; **Save symbol** shows a toast and
  clears the form to a blank "new symbol" (with a `new symbol` / `editing "X"` status line);
  **tags** normalized lowercase + de-duped, with a reuse datalist and a `lowercase · singular`
  hint. Picked-tile **preview sits above the inputs** (dashed "pick a tile" placeholder when
  empty — no broken-image icon). Tiles already assigned to a symbol show a **✓ "in use" badge**
  (per session). Changing **rarity snaps base value** to that rarity's default
  (`economy.rarityBaseValue`: common 1 · uncommon 2 · rare 3 · very-rare 5 · special 8).

## Content roster (Phase 3) — 38 symbols, themed + combo-linked
Authored via `scripts/seed_roster.py` (mechanics against the engine vocab; art copied from CC0
Kenney Tiny tiles, gems are frame-free recolors of the original gem). Tags added: `vehicle`,
`weapon`, `potion`. Categories:
- **food/plants:** carrot, wheat, corn, tomato, mushroom
- **animals:** hen, cow, pig, sheep
- **ores/minerals + gems:** iron-ore, iron-ingot, gemstone, gold-nugget, ruby, emerald, sapphire
- **tools:** pickaxe, forge, watering-can (+ blacksmith/axe/pitchfork double as tools)
- **weapons:** sword, dagger, axe, war-hammer, bow, pitchfork
- **potions:** red-/green-/blue-potion
- **vehicles:** delivery-truck, tractor, cargo-ship, crop-duster
- **humans (scalers):** prospector, knight, alchemist, blacksmith
- **treasure:** copper-coin, treasure-chest

Signature combos (LBAL/Spincraft-style):
- **Smelting → forging:** Pickaxe mines Iron Ore → Forge turns Ore→Ingot → Blacksmith turns
  Ingot→Sword → Knight ×2 with any weapon; Prospector ×2 on minerals; Ingot/Gold/gems are treasure.
- **Armory:** Sword/Axe +per weapon · War-Hammer +2/weapon · Dagger +per adjacent weapon ·
  Bow +per adjacent animal (weapon that hunts the farm) · Knight ×2 with weapon.
- **Apothecary:** Potions +per (adjacent) potion · Alchemist ×2 with any potion.
- **Farm:** Watering-Can/Tractor/Corn/Tomato +per adjacent plant · Wheat self-seeds ·
  Hen +adjacent food · Cow +per plant · Pig +per food · Carrot/Sheep/Pitchfork +per animal ·
  Crop-Duster +per plant.
- **Hoard:** Treasure-Chest & Cargo-Ship & Delivery-Truck & Sapphire scale with treasure count.
- **Gamble:** Mushroom ×2 when a second Mushroom is on the board.
Balance is first-pass (values sane, not tuned) — `balance-report` is the next tuning pass.
Note: no sickle/scythe tile exists in these CC0 packs — Pitchfork fills the farm-tool/weapon slot.

## Content workflow (dev tool → live)
1. Design in the browser tool (`?dev=1`): browse Kenney art, create/edit symbols (id, name,
   rarity, baseValue, tags, art, **notes** = shorthand mechanic to code), **Export symbol set JSON**.
2. `python3 scripts/apply-symbol-set.py symbol-set.json` — replaces the roster in
   `data/symbols.json` and copies each picked tile → `public/assets/symbols/<id>.png` (normalized
   to 128px). Echoes every symbol's design note.
3. Orchestrator implements the noted mechanics as real `synergies/destroys/transforms`.
4. `npm run validate-data` → commit. (Tested end-to-end; add/edit/remove + art copy + validate.)

## Next action
**Phase 3 continued:** synergy graph viewer + live stat tuning + `balance-report`. (Or: owner
designs a batch of symbols in the tool and sends the export to apply.) Two-player P2P = Phase 4.

## Live URLs
- Stable: `https://sluborg.github.io/Spin-Together/` — ✅ live
- Dev: `https://sluborg.github.io/Spin-Together/dev/` — ✅ live
