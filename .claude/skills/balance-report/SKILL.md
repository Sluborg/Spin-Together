---
name: balance-report
description: Compute expected-value balance stats for symbols and the run economy — Monte-Carlo median/p25 payout per spin per deadline, EV by rarity tier, and outlier flags. Use to tune data/symbols.json and data/economy.json.
---

# balance-report

Produce a balance report from `data/symbols.json`, `data/items.json`, and `data/economy.json`.

## Method (per the economy review, GAME_DESIGN §13 R-E1)
EV is **not** a per-symbol sum — synergy `add → multiply` chains depend on which symbols
co-occur, and payouts are heavy-tailed. So:
1. For each deadline `d` (with its cell count from `boardGrowth` and `spinsPerDeadline[d]`):
   - Simulate K spins (K ≥ 5000) using the seeded RNG and the **canonical resolution order**
     (base → destroy → transform → spawn → add → multiply → sum).
   - Draw boards from a **reference draft policy** (define + hold constant: e.g. random, a
     median-competent heuristic, and a greedy-synergy ceiling — report all three as the band).
   - Average **turn-weighted across both players' decks** (own_A∪shared vs own_B∪shared).
2. Report per deadline: **median** and **p25** payout/spin, and `p25 × spinsPerDeadline` vs
   `rent_d`. Flag any `d` where `p25×spins` falls outside **1.3–1.6 × rent** (too hard / runaway).
3. Report EV contribution **by rarity tier**; flag symbols whose solo/marginal EV is a strong
   outlier (e.g. > 2σ from tier mean).
4. Output a short markdown table + the flagged outliers + suggested retunes. Never mutate data;
   propose changes for the owner/orchestrator to apply.

## Notes
- Use integer coin math (no floats) so numbers match the engine.
- Keep the reference policy definitions in the report so results are reproducible.
