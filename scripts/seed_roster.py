#!/usr/bin/env python3
"""One-off content seed: write data/symbols.json with a themed 20-symbol roster
(food / animals / ores / tools / vehicles / treasure) and copy+normalize each sprite
from the Kenney CC0 dev-asset tiles. Mechanics are authored here against the engine's
supported vocabulary (baseValue, synergy add/addPerAdjacent/multiply, transforms, spawnRules).

    python3 scripts/seed_roster.py && npm run validate-data
"""
import json
import os

from PIL import Image

SYMS = "data/symbols.json"
DEV = "public/dev-assets"
SPRITES = "public/assets/symbols"
CANVAS, CONTENT = 128, 0.80


def norm(src, dst):
    im = Image.open(src).convert("RGBA")
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    scale = max(int((CANVAS * CONTENT) // max(im.width, im.height)), 1)
    im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    out = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    out.alpha_composite(im, ((CANVAS - im.width) // 2, (CANVAS - im.height) // 2))
    out.save(dst)


def syn(effect, value, tag=None, sid=None, note=""):
    s = {"effect": effect, "value": value, "note": note}
    if tag is not None:
        s["withTag"] = tag
    if sid is not None:
        s["withId"] = sid
    return s


# id, name, rarity, base, tags, synergies, transforms, spawnRules, art(tile or None=keep existing), notes
R = [
    ("copper-coin", "Copper Coin", "common", 1, ["treasure"], [], [], [], None,
     "Baseline treasure filler that anchors EV. Original CC0 pixel coin."),
    ("gold-nugget", "Gold Nugget", "uncommon", 4, ["treasure", "mineral"], [], [], [], "tiny-dungeon/tile_0120",
     "High-value treasure that also counts as a mineral (feeds Prospector, chest, truck)."),
    ("gemstone", "Gemstone", "uncommon", 3, ["mineral", "treasure"], [], [], [], None,
     "Shiny mineral payload; doubles under Prospector and counts as treasure. Original CC0 pixel gem (frameless)."),
    ("treasure-chest", "Treasure Chest", "rare", 3, ["treasure"],
     [syn("add", 1, tag="treasure", note="+1 for each other treasure on the board.")], [], [], "tiny-dungeon/tile_0089",
     "Hoard scaler: rewards treasure-heavy boards (+1 per other treasure)."),
    ("iron-ore", "Iron Ore", "common", 1, ["mineral"], [], [], [], "tiny-farm/tile_0089",
     "Cheap mineral (raw rock). Forge upgrades it to an Ingot; Prospector doubles while it is out."),
    ("iron-ingot", "Iron Ingot", "uncommon", 4, ["mineral", "treasure"], [], [], [], "tiny-dungeon/tile_0082",
     "Smelted upgrade of Iron Ore (produced by the Forge). Valuable mineral + treasure."),
    ("forge", "Forge", "uncommon", 2, ["tool"], [],
     [{"from": "iron-ore", "to": "iron-ingot", "note": "Smelts every Iron Ore on the board into an Iron Ingot."}], [],
     "tiny-dungeon/tile_0074",
     "Turns every Iron Ore into an Iron Ingot before payout — the core smelting combo."),
    ("pickaxe", "Pickaxe", "common", 1, ["tool"], [], [],
     [{"spawns": "iron-ore", "chance": 0.25, "note": "25% to mine an Iron Ore into an empty cell."}],
     "tiny-town/tile_0129",
     "Mines: 25% each spin to drop an Iron Ore into an empty cell (feeds Forge/Prospector)."),
    ("prospector", "Prospector", "uncommon", 2, ["human", "scaler"],
     [syn("multiply", 2, tag="mineral", note="Pays x2 while any mineral is on the board.")], [], [], None,
     "Scaler that pays double when it shares the board with any mineral."),
    ("carrot", "Carrot", "common", 1, ["food", "plant"],
     [syn("add", 1, tag="animal", note="+1 for each animal on the board.")], [], [], "tiny-farm/tile_0008",
     "Food backbone; +1 per animal (feed the livestock)."),
    ("wheat", "Wheat", "common", 1, ["food", "plant", "spawner"], [], [],
     [{"spawns": "wheat", "chance": 0.12, "note": "12% to re-seed another Wheat into an empty cell."}],
     "tiny-farm/tile_0030",
     "Self-seeding crop: sometimes sows another Wheat into an empty cell."),
    ("corn", "Corn", "common", 1, ["food", "plant"],
     [syn("addPerAdjacent", 1, tag="plant", note="+1 for each adjacent plant.")], [], [], "tiny-farm/tile_0032",
     "Row crop: +1 per adjacent plant (plant it in a patch)."),
    ("tomato", "Tomato", "common", 2, ["food", "plant"],
     [syn("addPerAdjacent", 1, tag="plant", note="+1 for each adjacent plant.")], [], [], "tiny-farm/tile_0044",
     "Juicy crop worth a bit more; +1 per adjacent plant."),
    ("mushroom", "Mushroom", "uncommon", 2, ["food", "plant", "gambler"],
     [syn("multiply", 2, sid="mushroom", note="x2 while another Mushroom shares the board.")], [], [], "tiny-town/tile_0029",
     "Spore bloom: x2 when a second Mushroom is on the board (collect them)."),
    ("hen", "Hen", "common", 1, ["animal", "spawner"],
     [syn("addPerAdjacent", 2, tag="food", note="+2 for each adjacent food.")], [], [], "tiny-farm/tile_0122",
     "Pecks adjacent food for +2 each; cheap animal to trigger Carrot/Pig."),
    ("cow", "Cow", "uncommon", 2, ["animal"],
     [syn("add", 1, tag="plant", note="+1 for each plant on the board.")], [], [], "tiny-farm/tile_0121",
     "Grazer: +1 per plant on the board (loves a big farm)."),
    ("pig", "Pig", "common", 1, ["animal"],
     [syn("add", 1, tag="food", note="+1 for each food on the board.")], [], [], "tiny-farm/tile_0123",
     "Eats scraps: +1 per food on the board."),
    ("watering-can", "Watering Can", "common", 1, ["tool"],
     [syn("addPerAdjacent", 2, tag="plant", note="+2 for each adjacent plant.")], [], [], "tiny-farm/tile_0084",
     "Tends the garden: +2 per adjacent plant (park it between crops)."),
    ("delivery-truck", "Delivery Truck", "uncommon", 2, ["vehicle"],
     [syn("add", 1, tag="treasure", note="+1 for each treasure on the board.")], [], [], "tiny-battle/tile_0114",
     "Hauls loot: +1 per treasure on the board (pairs with chest/coins)."),
    ("tractor", "Tractor", "uncommon", 3, ["vehicle", "tool"],
     [syn("addPerAdjacent", 2, tag="plant", note="+2 for each adjacent plant.")], [], [], "tiny-battle/tile_0169",
     "Harvests: +2 per adjacent crop (plant) — a mobile Watering Can."),
]


def main():
    os.makedirs(SPRITES, exist_ok=True)
    symbols = []
    for sid, name, rar, base, tags, syns, trans, spawns, art, notes in R:
        symbols.append({
            "id": sid, "name": name, "rarity": rar, "baseValue": base, "tags": tags,
            "synergies": syns, "destroys": [], "transforms": trans, "spawnRules": spawns,
            "artRef": f"assets/symbols/{sid}.png", "soundRef": "", "devNotes": notes,
        })
        if art:
            slug, tile = art.split("/")
            src = os.path.join(DEV, slug, f"{tile}.png")
            if not os.path.exists(src):
                print(f"  WARN missing tile {src} for {sid}")
                continue
            norm(src, os.path.join(SPRITES, f"{sid}.png"))
            print(f"  art {sid:16s} <- {art}")
        else:
            dst = os.path.join(SPRITES, f"{sid}.png")
            print(f"  art {sid:16s} <- (keeps existing {'OK' if os.path.exists(dst) else 'MISSING!'})")

    doc = json.load(open(SYMS))
    doc["symbols"] = symbols
    with open(SYMS, "w") as f:
        json.dump(doc, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"\nwrote {len(symbols)} symbols -> {SYMS}")


if __name__ == "__main__":
    main()
