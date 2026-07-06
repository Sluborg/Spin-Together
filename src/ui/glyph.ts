// Presentation-only: map a symbol to a display glyph. Emoji are CC0-safe and not LBAL assets.
// This is UI flavor, not game stats, so it does not violate the data-driven rule.
import type { Symbol as GameSymbol } from '../engine/types';

const BY_ID: Record<string, string> = {
  'copper-coin': '🪙',
  'gold-nugget': '💰',
  gemstone: '💎',
  'treasure-chest': '🧰',
  'iron-ore': '🪨',
  'iron-ingot': '🧱',
  forge: '🔥',
  pickaxe: '⛏️',
  prospector: '🧑‍🌾',
  carrot: '🥕',
  wheat: '🌾',
  corn: '🌽',
  tomato: '🍅',
  mushroom: '🍄',
  hen: '🐔',
  cow: '🐄',
  pig: '🐖',
  'watering-can': '🪣',
  'delivery-truck': '🚚',
  tractor: '🚜',
  ruby: '🔴',
  emerald: '🟢',
  sapphire: '🔵',
  sword: '⚔️',
  dagger: '🗡️',
  axe: '🪓',
  'war-hammer': '🔨',
  bow: '🏹',
  knight: '🛡️',
  blacksmith: '🧑‍🏭',
  'red-potion': '🧪',
  'green-potion': '🧪',
  'blue-potion': '🧪',
  alchemist: '🧙',
  'cargo-ship': '🚢',
  'crop-duster': '✈️',
  sheep: '🐑',
  pitchfork: '🔱',
};

const BY_TAG: Record<string, string> = {
  treasure: '💰',
  animal: '🐾',
  food: '🍎',
  plant: '🌱',
  mineral: '💎',
  human: '🧑',
  tool: '🔧',
  weapon: '⚔️',
  vehicle: '🚚',
  potion: '🧪',
  destroyer: '💥',
  scaler: '✖️',
  spawner: '🌀',
  gambler: '🎲',
  cursed: '☠️',
};

export function glyphFor(symbol: GameSymbol | undefined): string {
  if (!symbol) return '·';
  if (BY_ID[symbol.id]) return BY_ID[symbol.id];
  for (const t of symbol.tags) if (BY_TAG[t]) return BY_TAG[t];
  return '●';
}
