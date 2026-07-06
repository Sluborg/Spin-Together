#!/usr/bin/env python3
"""Apply a symbol set exported from the dev-tools builder (?dev=1 → "Export symbol set JSON").

Takes the exported JSON ({symbols: [...], art: {id: "pack/tile"}}) and makes it live:
  1. Replaces data/symbols.json's roster with the exported symbols (adds/edits/removals).
  2. Copies each picked dev-asset tile into public/assets/symbols/<id>.png, normalized to the
     game's 128x128 sprite canvas (nearest-neighbour, padded) — same as the existing sprites.

The exported symbols carry their `devNotes` (the shorthand design notes). Turning those notes
into actual synergies/destroys/transforms is a separate manual step by the orchestrator.

    python3 scripts/apply-symbol-set.py path/to/symbol-set.json
    npm run validate-data   # then check referential integrity
"""
import json
import os
import sys

from PIL import Image

SYMS = "data/symbols.json"
DEV_ASSETS = "public/dev-assets"
SPRITES = "public/assets/symbols"
CANVAS = 128
SCALE = 6  # fixed native-pixel scale => uniform outline weight (see scripts/seed_roster.py)


def normalize(src: str, dst: str) -> None:
    """Crop to content, nearest-neighbour upscale by a FIXED ×6 (uniform outline), pad to 128px."""
    im = Image.open(src).convert("RGBA")
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    scale = SCALE
    while scale > 1 and (im.width * scale > CANVAS or im.height * scale > CANVAS):
        scale -= 1
    im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    out = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    out.alpha_composite(im, ((CANVAS - im.width) // 2, (CANVAS - im.height) // 2))
    out.save(dst)


def main(path: str) -> None:
    data = json.load(open(path))
    symbols = data.get("symbols", [])
    art = data.get("art", {})

    doc = json.load(open(SYMS))
    doc["symbols"] = symbols  # exported set is the full intended roster (add/edit/remove)

    os.makedirs(SPRITES, exist_ok=True)
    for sid, ref in art.items():
        slug, tile = ref.split("/")
        src = os.path.join(DEV_ASSETS, slug, f"{tile}.png")
        if not os.path.exists(src):
            print(f"  WARN: missing tile {src} (skipped {sid})")
            continue
        normalize(src, os.path.join(SPRITES, f"{sid}.png"))
        print(f"  art: {sid} <- {ref}")

    with open(SYMS, "w") as f:
        json.dump(doc, f, indent=2, ensure_ascii=False)
        f.write("\n")

    # Flag any symbol whose art file is missing, and any leftover design notes to implement.
    for s in symbols:
        ref = s.get("artRef", "")
        if ref.startswith("assets/symbols/") and not os.path.exists(os.path.join("public", ref)):
            print(f"  WARN: no art file for '{s['id']}' ({ref}) — pick one in the tool or add it")
        if s.get("devNotes", "").strip():
            print(f"  NOTE to implement — {s['id']}: {s['devNotes'].strip()}")

    print(f"\napplied {len(symbols)} symbols, {len(art)} art copies -> {SYMS}")
    print("next: npm run validate-data  (then commit)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "symbol-set.json")
