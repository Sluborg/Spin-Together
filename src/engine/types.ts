// Shared types mirroring the data schemas (docs/GAME_DESIGN.md §9–§10, §7).
// The engine, UI, and net layers all build on these. No stats live here — only shapes.

export const RARITIES = ['common', 'uncommon', 'rare', 'very-rare', 'special'] as const;
export type Rarity = (typeof RARITIES)[number];

export const TAGS = [
  'animal',
  'food',
  'mineral',
  'plant',
  'human',
  'tool',
  'vehicle',
  'treasure',
  'destroyer',
  'scaler',
  'spawner',
  'gambler',
  'cursed',
] as const;
export type Tag = (typeof TAGS)[number];

export const EFFECTS = [
  'add',
  'multiply',
  'addPerAdjacent',
  'destroy',
  'transform',
  'spawn',
  'rentReduce',
] as const;
export type Effect = (typeof EFFECTS)[number];

export interface Synergy {
  withTag?: Tag;
  withId?: string;
  effect: Effect;
  value: number;
  note?: string;
}

export interface Transform {
  from: string;
  to: string;
  note?: string;
}

export interface SpawnRule {
  spawns: string;
  chance: number;
  note?: string;
}

export interface Symbol {
  id: string;
  name: string;
  rarity: Rarity;
  baseValue: number;
  tags: string[];
  synergies: Synergy[];
  destroys: string[];
  transforms: Transform[];
  spawnRules: SpawnRule[];
  artRef: string;
  soundRef: string;
  devNotes?: string;
}

export interface SymbolsFile {
  $schemaVersion: number;
  note?: string;
  symbols: Symbol[];
}

export type ItemScope = 'own' | 'shared' | 'both';

export interface ItemEffect {
  target: 'tag' | 'id' | 'global';
  match: string | null;
  effect: Effect;
  value: number;
  note?: string;
}

export interface Item {
  id: string;
  name: string;
  rarity: Rarity;
  scope: ItemScope;
  effects: ItemEffect[];
  artRef: string;
  devNotes?: string;
}

export interface ItemsFile {
  $schemaVersion: number;
  note?: string;
  items: Item[];
}

export interface BoardSize {
  afterDeadline: number;
  cols: number;
  rows: number;
}

export interface Economy {
  version: number;
  note?: string;
  run: { deadlines: number; spinsPerDeadline: number[] };
  rent: { model: string; base: number; growth: number; growthPerDeadline: number[] | null; note?: string };
  boardGrowth: BoardSize[];
  guardrail: {
    maxGap: number;
    softRampStart: number;
    dilutionPerGap: number;
    note?: string;
  };
  rarityBaseValue: Record<Rarity, number> & { note?: string };
  draft: { cardsOffered: number; rarityWeights: Record<Rarity, number> };
  starter: { own: string[]; shared: string[] };
}
