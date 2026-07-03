# Symbol art — pack map

How each symbol's art is sourced. All packs are **CC0** (Kenney.nl). Art style: **pixel-art
(Kenney "Tiny" family, 16×16)**, upscaled with nearest-neighbor and normalized to a uniform
128×128 canvas (~18% padding). Provenance rows are in `CREDITS.md`.

## Source packs (all CC0, Kenney.nl)
| Pack | Style | Used for |
|------|-------|----------|
| [Tiny Farm](https://kenney.nl/assets/tiny-farm) | 16px pixel | wheat, farmer, rock, hen |
| [Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) | 16px pixel | gem |

Both are the same "Tiny" pixel family (shared 16px grid, palette, outline), so they cohere on
one board.

## Per-symbol mapping (id → tag → name → pack → tile)
| Symbol id | Tag(s) | Display name | Pack | Tile | Match |
|-----------|--------|--------------|------|------|-------|
| wheat-sheaf | food | **Wheat Sheaf** | Tiny Farm | `tile_0070` (wheat sack) | literal ✓ |
| raw-ore | mineral | **Raw Ore** | Tiny Farm | `tile_0089` (rock pile) | literal ✓ |
| prospector | human, scaler | Prospector | Tiny Farm | `tile_0109` (farmer) | person stand-in (rustic prospector) |
| field-mouse | animal | **Barn Hen** | Tiny Farm | `tile_0122` (chicken) | renamed — Tiny family has no mouse; a hen "pecks food", matching the +food mechanic |
| copper-coin | treasure | **Gemstone** | Tiny Dungeon | `tile_0102` (gem) | renamed — no coin in these packs; gem = treasure filler |

All **ids, tags, and mechanics are unchanged** — only display `name`/`artRef`/flavor moved. Fully reversible.

## Rejected / superseded
- **Generic Items** (flat color) — owner disliked the tilted/angled look. Superseded by Tiny pixel.
- **Animal Pack Redux** (flat) — used briefly for a rabbit; superseded (no mouse anyway).
- **Platformer Art Deluxe / Food Kit (3D) / Puzzle Pack 2 (tiles)** — style clashes; rejected earlier.

## Owner-surveyed packs (candidates for future symbols)
From the owner's own CC0 survey — assign these as the roster grows (keep to the pixel family for
cohesion where possible): Tiny Town (tools, beehive), Tiny Battle (vehicles), Tiny Dungeon
(heroes, potions, weapons), Pixel Platformer + Food/Farm expansions (food, wheat, sunflower,
pumpkin), Desert Shooter (rabbit, **mouse**), Sci-Fi RTS (ore piles), Map Pack (trees, mushrooms),
Voxel Pack (gems). Note: mixing non-Tiny styles risks clashing — normalize + drop clashers.
