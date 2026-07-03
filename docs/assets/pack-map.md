# Symbol art — pack map

How each symbol's art is sourced. All packs are **CC0** (Kenney.nl). Art style: **pixel-art
(Kenney "Tiny" family, 16×16)**, upscaled with nearest-neighbor and normalized to a uniform
128×128 canvas (~18% padding). Provenance rows are in `CREDITS.md`.

## Source (all CC0)
| Source | Style | Used for |
|------|-------|----------|
| [Tiny Farm](https://kenney.nl/assets/tiny-farm) | 16px pixel | farmer, hen, carrot (frame-free tiles) |
| Original pixel art (this repo) | 16px pixel, Tiny-style | coin, gem |

**Frame note:** Kenney's Tiny *item* tiles (coin/gem/potion/sack) are drawn inside an
inventory-slot frame (a thick dark border), which looked bad on the board. Only Tiny
*characters/animals/crops* are frame-free. So the frame-free Kenney tiles are used directly, and
the coin + gem were authored as original 16px pixel art in the same style.

## Per-symbol mapping (id → tag → name → source → tile)
| Symbol id | Tag(s) | Display name | Source | Tile | Match |
|-----------|--------|--------------|--------|------|-------|
| prospector | human, scaler | Prospector | Tiny Farm | `tile_0109` (farmer) | person; a rustic prospector |
| field-mouse | animal | **Barn Hen** | Tiny Farm | `tile_0122` (chicken) | renamed — a hen "pecks food", matching the +food mechanic |
| wheat-sheaf | food | **Carrot** | Tiny Farm | `tile_0068` (carrot) | renamed — clean, frame-free crop |
| copper-coin | treasure | **Copper Coin** | original | authored 16px coin | literal ✓ |
| raw-ore | mineral | **Gemstone** | original | authored 16px gem | mineral crystal |

All **ids, tags, and mechanics are unchanged** — only display `name`/`artRef`/flavor moved. Fully reversible.

## Board presentation
Rendered as a **slot machine**: a dark cabinet holding vertical cream reel strips (LBAL-style),
with slot dots for empty positions. The footprint is the full 6×6; the current board region is
centered and "active" (lit) while the surrounding ring is dimmed to preview the growth to 6×6.

## Rejected / superseded
- **Generic Items** (flat color) — owner disliked the tilted look, and the item tiles are framed.
- **Tiny Farm sack/rock tiles + Tiny Dungeon coin/gem tiles** — carry the inventory-slot frame; not used.
- **Animal Pack Redux / Platformer Art Deluxe / Food Kit (3D) / Puzzle Pack 2** — style clashes; rejected earlier.

## Owner-surveyed packs (candidates for future symbols)
From the owner's own CC0 survey — assign these as the roster grows (keep to the pixel family for
cohesion where possible): Tiny Town (tools, beehive), Tiny Battle (vehicles), Tiny Dungeon
(heroes, potions, weapons), Pixel Platformer + Food/Farm expansions (food, wheat, sunflower,
pumpkin), Desert Shooter (rabbit, **mouse**), Sci-Fi RTS (ore piles), Map Pack (trees, mushrooms),
Voxel Pack (gems). Note: mixing non-Tiny styles risks clashing — normalize + drop clashers.
