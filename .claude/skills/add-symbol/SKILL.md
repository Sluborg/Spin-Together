---
name: add-symbol
description: Scaffold and validate a new symbol entry in data/symbols.json. Use when adding a symbol to the roster — it enforces the schema, checks referential integrity (tags/ids/transforms/spawns), and keeps artRef/soundRef consistent.
---

# add-symbol

Add a new symbol to `data/symbols.json` correctly and safely.

## Steps
1. Gather intent: name (original, no LBAL), rarity, rough baseValue, tags, and which synergies /
   destroys / transforms / spawns it should have.
2. Derive a unique kebab-case `id`. Verify it is not already used.
3. Build the entry against the schema (GAME_DESIGN §9):
   ```jsonc
   { "id","name","rarity","baseValue","tags":[],
     "synergies":[{ "withTag"|"withId","effect","value","note" }],
     "destroys":[], "transforms":[{ "from","to","note" }], "spawnRules":[{ "spawns","chance","note" }],
     "artRef":"assets/symbols/<id>.png", "soundRef":"assets/sfx/<id>.ogg", "devNotes":"" }
   ```
4. **Validate referential integrity** (fail loud):
   - `id` unique; all `tags` are in the known tag vocabulary.
   - every `withId` / `transforms.from` / `transforms.to` / `destroys` / `spawnRules.spawns`
     resolves to an existing id or tag.
   - `effect` ∈ {add, multiply, addPerAdjacent, destroy, transform, spawn}; `rarity` valid;
     every `chance` ∈ [0,1].
5. Insert into `data/symbols.json`, keep it valid JSON, and note that `asset-fetcher` still owes
   the `artRef`/`soundRef` files (add to CREDITS.md when fetched).
6. Suggest running `balance-report` to sanity-check the new symbol's EV.
