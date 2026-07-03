// Loud-failing data validator (GAME_DESIGN §13 R-Q5).
// Pure: takes parsed data, returns a list of human-readable errors ([] === valid).
// Used by scripts/validate-data.ts (CI) and by the runtime dev check in main.ts.

import { RARITIES, TAGS, EFFECTS } from './types';
import type { SymbolsFile, ItemsFile, Symbol as GameSymbol } from './types';

const RARITY_SET: ReadonlySet<string> = new Set(RARITIES);
const TAG_SET: ReadonlySet<string> = new Set(TAGS);
const EFFECT_SET: ReadonlySet<string> = new Set(EFFECTS);
const ITEM_SCOPES: ReadonlySet<string> = new Set(['own', 'shared', 'both']);
const ITEM_TARGETS: ReadonlySet<string> = new Set(['tag', 'id', 'global']);

function isTagOrId(ref: string, ids: ReadonlySet<string>): boolean {
  return TAG_SET.has(ref) || ids.has(ref);
}

/** Validate symbols.json. Returns [] when valid. */
export function validateSymbols(file: SymbolsFile): string[] {
  const errors: string[] = [];
  const symbols: GameSymbol[] = file?.symbols ?? [];
  if (!Array.isArray(symbols)) return ['symbols.json: `symbols` must be an array'];

  const ids = new Set<string>();
  for (const s of symbols) {
    const where = `symbol "${s?.id ?? '<missing id>'}"`;
    if (!s.id || typeof s.id !== 'string') errors.push(`${where}: missing/invalid id`);
    else if (ids.has(s.id)) errors.push(`${where}: duplicate id`);
    else ids.add(s.id);
  }

  for (const s of symbols) {
    const where = `symbol "${s.id}"`;
    if (!s.name) errors.push(`${where}: missing name`);
    if (!RARITY_SET.has(s.rarity)) errors.push(`${where}: unknown rarity "${s.rarity}"`);
    if (typeof s.baseValue !== 'number' || s.baseValue < 0) {
      errors.push(`${where}: baseValue must be a number >= 0`);
    }
    for (const t of s.tags ?? []) {
      if (!TAG_SET.has(t)) errors.push(`${where}: unknown tag "${t}"`);
    }
    for (const syn of s.synergies ?? []) {
      const hasTag = syn.withTag != null;
      const hasId = syn.withId != null;
      if (hasTag === hasId) errors.push(`${where}: synergy must have exactly one of withTag/withId`);
      if (hasTag && !TAG_SET.has(syn.withTag as string)) {
        errors.push(`${where}: synergy withTag "${syn.withTag}" is not a known tag`);
      }
      if (hasId && !ids.has(syn.withId as string)) {
        errors.push(`${where}: synergy withId "${syn.withId}" references a missing symbol`);
      }
      if (!EFFECT_SET.has(syn.effect)) errors.push(`${where}: unknown effect "${syn.effect}"`);
      if (typeof syn.value !== 'number') errors.push(`${where}: synergy value must be a number`);
    }
    for (const d of s.destroys ?? []) {
      if (!isTagOrId(d, ids)) errors.push(`${where}: destroys "${d}" is not a known tag or id`);
    }
    for (const tr of s.transforms ?? []) {
      if (!isTagOrId(tr.from, ids)) errors.push(`${where}: transform.from "${tr.from}" is not a known tag or id`);
      if (!ids.has(tr.to)) errors.push(`${where}: transform.to "${tr.to}" references a missing symbol`);
    }
    for (const sp of s.spawnRules ?? []) {
      if (!ids.has(sp.spawns)) errors.push(`${where}: spawnRules.spawns "${sp.spawns}" references a missing symbol`);
      if (typeof sp.chance !== 'number' || sp.chance < 0 || sp.chance > 1) {
        errors.push(`${where}: spawnRules.chance must be within [0,1] (got ${sp.chance})`);
      }
    }
  }
  return errors;
}

/** Validate items.json against the set of known symbol ids. Returns [] when valid. */
export function validateItems(file: ItemsFile, symbolIds: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  const items = file?.items ?? [];
  if (!Array.isArray(items)) return ['items.json: `items` must be an array'];

  const ids = new Set<string>();
  for (const it of items) {
    const where = `item "${it?.id ?? '<missing id>'}"`;
    if (!it.id) errors.push(`${where}: missing id`);
    else if (ids.has(it.id)) errors.push(`${where}: duplicate id`);
    else ids.add(it.id);
    if (!RARITY_SET.has(it.rarity)) errors.push(`${where}: unknown rarity "${it.rarity}"`);
    if (!ITEM_SCOPES.has(it.scope)) errors.push(`${where}: unknown scope "${it.scope}"`);
    for (const e of it.effects ?? []) {
      if (!ITEM_TARGETS.has(e.target)) errors.push(`${where}: unknown effect target "${e.target}"`);
      if (!EFFECT_SET.has(e.effect)) errors.push(`${where}: unknown effect "${e.effect}"`);
      if (e.target === 'tag' && !TAG_SET.has(e.match as string)) {
        errors.push(`${where}: effect target tag "${e.match}" is not a known tag`);
      }
      if (e.target === 'id' && !symbolIds.has(e.match as string)) {
        errors.push(`${where}: effect target id "${e.match}" references a missing symbol`);
      }
    }
  }
  return errors;
}

/** Full validation across symbols + items. Returns [] when valid. */
export function validateData(symbolsFile: SymbolsFile, itemsFile: ItemsFile): string[] {
  const errors = validateSymbols(symbolsFile);
  const symbolIds = new Set((symbolsFile?.symbols ?? []).map((s) => s.id));
  return errors.concat(validateItems(itemsFile, symbolIds));
}
