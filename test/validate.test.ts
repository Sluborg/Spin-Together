import { describe, it, expect } from 'vitest';
import { validateData, validateSymbols } from '../src/engine/validate';
import symbolsFile from '../data/symbols.json';
import itemsFile from '../data/items.json';
import invalidSymbols from './fixtures/invalid-symbols.json';
import type { SymbolsFile, ItemsFile } from '../src/engine/types';

describe('data validator', () => {
  it('passes the real seed data with zero errors', () => {
    const errors = validateData(symbolsFile as SymbolsFile, itemsFile as ItemsFile);
    expect(errors).toEqual([]);
  });

  it('fails loud on the invalid fixture and reports the specific problems', () => {
    const errors = validateSymbols(invalidSymbols as SymbolsFile);
    expect(errors.length).toBeGreaterThan(0);
    const joined = errors.join('\n');
    expect(joined).toMatch(/duplicate id/i);
    expect(joined).toMatch(/unknown rarity "legendary"/i);
    expect(joined).toMatch(/baseValue must be a number >= 0/i);
    expect(joined).toMatch(/unknown tag "not-a-tag"/i);
    expect(joined).toMatch(/exactly one of withTag\/withId/i);
    expect(joined).toMatch(/withId "missing-symbol" references a missing symbol/i);
    expect(joined).toMatch(/unknown effect "boop"/i);
    expect(joined).toMatch(/destroys "also-missing" is not a known tag or id/i);
    expect(joined).toMatch(/transform\.to "silver-ingot" references a missing symbol/i);
    expect(joined).toMatch(/spawnRules\.spawns "ghost" references a missing symbol/i);
    expect(joined).toMatch(/spawnRules\.chance must be within \[0,1\]/i);
  });
});
