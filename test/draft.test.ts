import { describe, it, expect } from 'vitest';
import { resolveDraftConstraints, offerSymbols } from '../src/engine/draft';
import { makeRng } from '../src/engine/rng';
import type { Symbol as GameSymbol, Economy } from '../src/engine/types';

describe('guardrail', () => {
  it('allows own drafts while gap < maxGap and blocks at the cap', () => {
    expect(resolveDraftConstraints(0, 0, 5).canDraftOwn).toBe(true);
    expect(resolveDraftConstraints(4, 0, 5).canDraftOwn).toBe(true); // gap 4 < 5
    expect(resolveDraftConstraints(5, 0, 5).canDraftOwn).toBe(false); // gap 5 == cap
    expect(resolveDraftConstraints(6, 0, 5).canDraftOwn).toBe(false); // gap 6 > cap
  });

  it('binds on the live gap, not absolute counts', () => {
    expect(resolveDraftConstraints(10, 6, 5).canDraftOwn).toBe(true); // gap 4
    expect(resolveDraftConstraints(11, 6, 5).canDraftOwn).toBe(false); // gap 5
  });
});

function sym(id: string, rarity: GameSymbol['rarity']): GameSymbol {
  return {
    id, name: id, rarity, baseValue: 1, tags: [], synergies: [], destroys: [],
    transforms: [], spawnRules: [], artRef: '', soundRef: '',
  };
}

const economy = {
  draft: { cardsOffered: 3, rarityWeights: { common: 60, uncommon: 25, rare: 11, 'very-rare': 3, special: 1 } },
} as unknown as Economy;

describe('offers', () => {
  const syms = [sym('a', 'common'), sym('b', 'common'), sym('c', 'uncommon'), sym('d', 'rare')];
  const map = new Map(syms.map((s) => [s.id, s]));
  const ids = syms.map((s) => s.id);

  it('offers the requested count of DISTINCT symbols', () => {
    const offer = offerSymbols(makeRng(5), ids, map, economy, 3);
    expect(offer).toHaveLength(3);
    expect(new Set(offer).size).toBe(3);
  });

  it('never offers more than the pool size', () => {
    const offer = offerSymbols(makeRng(5), ids, map, economy, 10);
    expect(offer).toHaveLength(4);
  });

  it('is deterministic for a given seed', () => {
    expect(offerSymbols(makeRng(77), ids, map, economy, 3)).toEqual(
      offerSymbols(makeRng(77), ids, map, economy, 3),
    );
  });
});
