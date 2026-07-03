# Symbol art — pack map

How each symbol's art is sourced. All packs are **CC0** (Kenney.nl). Sprites are normalized on
import to a uniform 128×128 canvas with ~10% padding (via `scripts`/Pillow), so the board reads
consistently. Provenance rows are in `CREDITS.md`.

## Source packs (all CC0, Kenney.nl)
| Pack | Style | Used for |
|------|-------|----------|
| [Generic Items](https://kenney.nl/assets/generic-items) | flat color, shaded 2D items | coin, pickaxe, stew bowl, ore nugget |
| [Animal Pack Redux](https://kenney.nl/assets/animal-pack-redux) (via OpenGameArt CC0 mirror) | flat color, round animal | rabbit |

## Per-symbol mapping (tag → pack → sprite)
| Symbol id | Tag(s) | Display name | Pack | Sprite | Match |
|-----------|--------|--------------|------|--------|-------|
| copper-coin | treasure | Copper Coin | Generic Items | `genericItem_color_159` (coin) | literal |
| prospector | human, scaler | Prospector | Generic Items | `genericItem_color_021` (pickaxe) | trade-tool stand-in (no miner sprite in a cohesive flat pack) |
| field-mouse | animal | **Meadow Rabbit** | Animal Pack Redux | `rabbit` | name matched to art — Kenney has no mouse/rat in a cohesive flat pack; id + mechanics kept |
| wheat-sheaf | food | **Hearty Stew** | Generic Items | `genericItem_color_128` (bowl) | name matched to art — no wheat/grain in a cohesive flat pack; id + mechanics kept, `plant` tag dropped |
| raw-ore | mineral | Raw Ore | Generic Items | `genericItem_color_161` (nugget) | literal-ish (nugget = raw ore) |

## Rejected / not used
- **Kenney Platformer Art Deluxe** — earlier attempt; shaded-cartoon platformer style clashed
  with a clean board and required an alien-as-prospector substitution. Rejected.
- **Kenney Food Kit** — 3D-rendered isometric food; perspective/shading clash with flat 2D. Rejected.
- **Kenney Puzzle Pack 2** — match-3 *tiles* (square backgrounds), not standalone gems; would
  clash. Rejected (so `raw-ore` uses the Generic Items nugget instead of a puzzle gem).

## Notes / known gaps
- Kenney's catalog has **no cohesive flat-color mouse, wheat, or human-miner**, so two
  placeholder seed symbols were renamed to their available art (mouse→rabbit, wheat→stew). All
  **ids and mechanics are unchanged** — only display `name`/`artRef`/flavor moved. Fully reversible.
- This map grows as `content-filler` adds symbols/tags; new tags get a pack assignment here first.
