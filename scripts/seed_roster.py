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
CANVAS = 128
# FIXED native-pixel scale so every sprite has the SAME outline weight (Kenney "Tiny" tiles are
# 16px native with a 1px outline; the original coin/gem/prospector are also authored at ×6). A
# uniform ×6 => 1 native pixel = 6 screen pixels everywhere; icons vary in size, outlines match.
SCALE = 6


def norm(src, dst):
    im = Image.open(src).convert("RGBA")
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    scale = SCALE
    while scale > 1 and (im.width * scale > CANVAS or im.height * scale > CANVAS):
        scale -= 1  # safety clamp for any oversized tile (16px tiles never trip this at ×6)
    im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    out = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    out.alpha_composite(im, ((CANVAS - im.width) // 2, (CANVAS - im.height) // 2))
    out.save(dst)


def recolor(src, hue, dst):
    """Recolor the (frame-free) gem to a target hue [0..255], keeping shading + alpha.
    Dark outlines have near-zero saturation so they stay dark."""
    im = Image.open(src).convert("RGBA")
    r, g, b, a = im.split()
    h, s, v = Image.merge("RGB", (r, g, b)).convert("HSV").split()
    h = h.point(lambda _: hue)
    rgb = Image.merge("HSV", (h, s, v)).convert("RGB")
    Image.merge("RGBA", (*rgb.split(), a)).save(dst)


def syn(effect, value, tag=None, sid=None, note=""):
    s = {"effect": effect, "value": value, "note": note}
    if tag is not None:
        s["withTag"] = tag
    if sid is not None:
        s["withId"] = sid
    return s


# id, name, rarity, base, tags, synergies, transforms, spawnRules, art(tile or None=keep existing), notes
R = [
    ("silver-coin", "Silver Coin", "common", 1, ["treasure"], [], [], [], None,
     "Baseline treasure filler that anchors EV. Original CC0 pixel coin (silver — distinct from the gold money icon)."),
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

    # --- More gems (frame-free recolors of the original gem) ---
    ("ruby", "Ruby", "rare", 4, ["mineral", "treasure"], [], [], [], "recolor:0",
     "Premium red gem: high flat value; feeds Prospector (mineral) and treasure scalers."),
    ("emerald", "Emerald", "uncommon", 3, ["mineral", "treasure"],
     [syn("addPerAdjacent", 1, tag="mineral", note="+1 for each adjacent mineral.")], [], [], "recolor:95",
     "Green gem that veins: +1 per adjacent mineral (cluster your ores/gems)."),
    ("sapphire", "Sapphire", "uncommon", 3, ["mineral", "treasure"],
     [syn("add", 1, tag="treasure", note="+1 for each treasure on the board.")], [], [], "recolor:160",
     "Blue gem that sparkles with wealth: +1 per treasure on the board."),

    # --- Weapons (new 'weapon' tag) — armory + a scaler ---
    ("sword", "Sword", "common", 2, ["weapon"],
     [syn("add", 1, tag="weapon", note="+1 for each weapon on the board.")], [], [], "tiny-dungeon/tile_0104",
     "Arsenal backbone: +1 per weapon on the board (also the Blacksmith's output)."),
    ("dagger", "Dagger", "common", 1, ["weapon"],
     [syn("addPerAdjacent", 2, tag="weapon", note="+2 for each adjacent weapon.")], [], [], "tiny-dungeon/tile_0103",
     "Dual-wield: +2 per adjacent weapon."),
    ("axe", "Axe", "common", 2, ["weapon", "tool"],
     [syn("add", 1, tag="weapon", note="+1 for each weapon on the board.")], [], [], "tiny-dungeon/tile_0131",
     "Weapon that also counts as a tool; +1 per weapon on the board."),
    ("war-hammer", "War Hammer", "uncommon", 3, ["weapon"],
     [syn("add", 2, tag="weapon", note="+2 for each weapon on the board.")], [], [], "tiny-dungeon/tile_0117",
     "Heavy hitter: +2 per weapon on the board."),
    ("bow", "Bow", "uncommon", 2, ["weapon"],
     [syn("addPerAdjacent", 2, tag="animal", note="+2 for each adjacent animal.")], [], [], "tiny-town/tile_0118",
     "Hunts: +2 per adjacent animal — a weapon that loves the farm."),
    ("knight", "Knight", "rare", 3, ["human", "scaler"],
     [syn("multiply", 2, tag="weapon", note="Pays x2 while any weapon is on the board.")], [], [], "tiny-battle/tile_0106",
     "Weapon scaler: doubles when it shares the board with any weapon (Prospector for the armory)."),
    ("blacksmith", "Blacksmith", "uncommon", 2, ["human", "tool"], [],
     [{"from": "iron-ingot", "to": "sword", "note": "Forges every Iron Ingot on the board into a Sword."}], [],
     "tiny-battle/tile_0178",
     "Bridges the chains: turns Iron Ingots into Swords (ore -> ingot -> sword -> Knight x2)."),
    ("pitchfork", "Pitchfork", "common", 2, ["tool", "weapon"],
     [syn("add", 1, tag="animal", note="+1 for each animal on the board.")], [], [], "tiny-town/tile_0116",
     "Farmhand's weapon: +1 per animal on the board (counts as tool AND weapon)."),

    # --- Potions (new 'potion' tag) — brews + a scaler ---
    ("red-potion", "Red Potion", "common", 2, ["potion", "treasure"],
     [syn("add", 1, tag="potion", note="+1 for each potion on the board.")], [], [], "tiny-dungeon/tile_0115",
     "Brew collection: +1 per potion on the board; counts as treasure."),
    ("green-potion", "Green Potion", "common", 2, ["potion"],
     [syn("addPerAdjacent", 2, tag="potion", note="+2 for each adjacent potion.")], [], [], "tiny-dungeon/tile_0114",
     "Bubbles best in a rack: +2 per adjacent potion."),
    ("blue-potion", "Blue Potion", "uncommon", 3, ["potion"],
     [syn("add", 1, tag="potion", note="+1 for each potion on the board.")], [], [], "tiny-dungeon/tile_0116",
     "Higher-value brew: +1 per potion on the board."),
    ("alchemist", "Alchemist", "rare", 2, ["human", "scaler"],
     [syn("multiply", 2, tag="potion", note="Pays x2 while any potion is on the board.")], [], [], "tiny-battle/tile_0142",
     "Potion scaler: doubles when it shares the board with any potion."),

    # --- More vehicles ---
    ("cargo-ship", "Cargo Ship", "rare", 3, ["vehicle"],
     [syn("add", 2, tag="treasure", note="+2 for each treasure on the board.")], [], [], "tiny-battle/tile_0177",
     "Big hauler: +2 per treasure on the board."),
    ("crop-duster", "Crop Duster", "uncommon", 2, ["vehicle"],
     [syn("add", 1, tag="plant", note="+1 for each plant on the board.")], [], [], "tiny-battle/tile_0172",
     "Dusts the whole field: +1 per plant on the board."),

    # --- More animals ---
    ("sheep", "Sheep", "common", 1, ["animal"],
     [syn("add", 1, tag="animal", note="+1 for each animal on the board.")], [], [], "tiny-farm/tile_0120",
     "Flocks: +1 per animal on the board (cheap herd-builder)."),

    # --- Delivery line: Factory (produces ore) -> Truck (hauls) -> Depot (pays for deliveries) ---
    ("factory", "Factory", "uncommon", 2, ["tool"], [], [],
     [{"spawns": "iron-ore", "chance": 0.5, "note": "50% each spin to produce an Iron Ore into an empty cell."}],
     "tiny-dungeon/tile_0054",
     "Producer for the supply line: makes Iron Ore that a Truck can haul to a Depot."),
    ("depot", "Depot", "uncommon", 1, ["treasure"], [], [], [], "tiny-farm/tile_0074",
     "Drop-off point: a Truck delivers adjacent minerals here for bonus coins (place it next to a Truck)."),
]

# Delivery specs (a hauler moves adjacent producer value to an adjacent consumer). Injected below.
DELIVERY = {
    "delivery-truck": {
        "from": "mineral", "to": "depot", "value": 2,
        "note": "Delivers an adjacent mineral (Ore/Ingot/gem) to an adjacent Depot for x2 its value.",
    },
}


def main():
    os.makedirs(SPRITES, exist_ok=True)
    symbols = []
    for sid, name, rar, base, tags, syns, trans, spawns, art, notes in R:
        entry = {
            "id": sid, "name": name, "rarity": rar, "baseValue": base, "tags": tags,
            "synergies": syns, "destroys": [], "transforms": trans, "spawnRules": spawns,
            "artRef": f"assets/symbols/{sid}.png", "soundRef": "", "devNotes": notes,
        }
        if sid in DELIVERY:
            entry["delivery"] = DELIVERY[sid]
        symbols.append(entry)
        if art and art.startswith("recolor:"):
            hue = int(art.split(":")[1])
            gem = os.path.join(SPRITES, "gemstone.png")
            recolor(gem, hue, os.path.join(SPRITES, f"{sid}.png"))
            print(f"  art {sid:16s} <- recolor(gem, hue={hue})")
        elif art:
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
