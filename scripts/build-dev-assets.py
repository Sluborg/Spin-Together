#!/usr/bin/env python3
"""Prep the dev-tools asset picker.

Downloads a curated set of Kenney CC0 pixel packs, keeps only the SMALL OBJECT tiles
(drops terrain / floors / walls / large houses via a transparency + bounding-box rule),
and writes them to public/dev-assets/<slug>/tile_XXXX.png plus a manifest.json.

Run manually (not part of the Vite build); commit the output. Requires Pillow + curl.
    python3 scripts/build-dev-assets.py
"""
import glob
import json
import os
import subprocess
import tempfile
import zipfile

from PIL import Image

PACKS = [
    ("tiny-farm", "Tiny Farm", "https://kenney.nl/media/pages/assets/tiny-farm/dfded1ae3e-1782913588/kenney_tiny-farm.zip"),
    ("tiny-dungeon", "Tiny Dungeon", "https://kenney.nl/media/pages/assets/tiny-dungeon/f8422efb44-1674742415/kenney_tiny-dungeon.zip"),
    ("tiny-town", "Tiny Town", "https://kenney.nl/media/pages/assets/tiny-town/a415fbeb49-1735736916/kenney_tiny-town.zip"),
    ("tiny-battle", "Tiny Battle", "https://kenney.nl/media/pages/assets/tiny-battle/c1c25ac1f3-1691487575/kenney_tiny-battle.zip"),
]
OUT = "public/dev-assets"


def is_small_object(path: str) -> bool:
    """Keep standalone objects; drop full-tile terrain/large fills."""
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    total = w * h
    transparent = sum(1 for y in range(h) for x in range(w) if px[x, y][3] < 12)
    if transparent / total < 0.12:  # nearly opaque edge-to-edge => terrain/floor/wall
        return False
    bb = im.getbbox()
    if not bb:
        return False  # empty
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    if bw * bh > 0.9 * total:  # object spans almost the whole tile => big/terrain
        return False
    return True


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    manifest = {"packs": []}
    tmp = tempfile.mkdtemp()
    for slug, name, url in PACKS:
        zpath = os.path.join(tmp, slug + ".zip")
        subprocess.run(["curl", "-sL", "-o", zpath, url], check=True)
        ex = os.path.join(tmp, slug)
        with zipfile.ZipFile(zpath) as z:
            z.extractall(ex)
        tiles = sorted(glob.glob(os.path.join(ex, "**", "Tiles", "tile_*.png"), recursive=True))
        dst = os.path.join(OUT, slug)
        os.makedirs(dst, exist_ok=True)
        kept = []
        for t in tiles:
            if is_small_object(t):
                base = os.path.basename(t)
                Image.open(t).convert("RGBA").save(os.path.join(dst, base))
                kept.append(base[:-4])
        manifest["packs"].append({"slug": slug, "name": name, "tiles": kept})
        print(f"{slug}: kept {len(kept)}/{len(tiles)}")
    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print("wrote", os.path.join(OUT, "manifest.json"))


if __name__ == "__main__":
    main()
