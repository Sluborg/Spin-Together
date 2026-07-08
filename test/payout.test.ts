import { describe, it, expect } from 'vitest';
import { resolveSpin } from '../src/engine/payout';
import type { Placed } from '../src/engine/payout';
import { makeRng } from '../src/engine/rng';
import type { Symbol as GameSymbol } from '../src/engine/types';

function sym(p: Partial<GameSymbol> & { id: string }): GameSymbol {
  return {
    name: p.id,
    rarity: 'common',
    baseValue: 0,
    tags: [],
    synergies: [],
    destroys: [],
    transforms: [],
    spawnRules: [],
    artRef: '',
    soundRef: '',
    ...p,
  };
}

function mapOf(...syms: GameSymbol[]): Map<string, GameSymbol> {
  return new Map(syms.map((s) => [s.id, s]));
}

function board(ids: (string | null)[]): Placed[] {
  return ids.map((symbolId) => ({ symbolId }));
}

const rng = () => makeRng(1);

describe('payout engine — canonical order', () => {
  it('sums base values', () => {
    const m = mapOf(sym({ id: 'coin', baseValue: 1 }));
    const r = resolveSpin(board(['coin', 'coin', null]), 3, 1, m, rng());
    expect(r.total).toBe(2);
  });

  it('add: +value per matching partner on the board (excludes self)', () => {
    const m = mapOf(
      sym({ id: 'mouse', baseValue: 1, synergies: [{ withTag: 'food', effect: 'add', value: 3 }] }),
      sym({ id: 'apple', baseValue: 1, tags: ['food'] }),
    );
    const r = resolveSpin(board(['mouse', 'apple', 'apple']), 3, 1, m, rng());
    // mouse: 1 + 3*2 = 7; apples: 1 each => total 9
    expect(r.cells[0].payout).toBe(7);
    expect(r.total).toBe(9);
  });

  it('addPerAdjacent: only orthogonally adjacent partners count', () => {
    const m = mapOf(
      sym({ id: 'mouse', baseValue: 1, synergies: [{ withTag: 'food', effect: 'addPerAdjacent', value: 2 }] }),
      sym({ id: 'apple', baseValue: 0, tags: ['food'] }),
    );
    // 3x1 row: mouse@0, apple@1 (adjacent), apple@2 (not adjacent to 0)
    const r = resolveSpin(board(['mouse', 'apple', 'apple']), 3, 1, m, rng());
    expect(r.cells[0].payout).toBe(1 + 2 * 1);
  });

  it('multiply applies after add (add-before-multiply)', () => {
    const m = mapOf(
      sym({
        id: 'engine',
        baseValue: 1,
        synergies: [
          { withTag: 'food', effect: 'add', value: 4 },
          { withTag: 'mineral', effect: 'multiply', value: 2 },
        ],
      }),
      sym({ id: 'apple', baseValue: 0, tags: ['food'] }),
      sym({ id: 'ore', baseValue: 0, tags: ['mineral'] }),
    );
    const r = resolveSpin(board(['engine', 'apple', 'ore']), 3, 1, m, rng());
    // engine: (1 + 4) * 2 = 10
    expect(r.cells[0].payout).toBe(10);
  });

  it('destroy removes matching symbols (they pay 0)', () => {
    const m = mapOf(
      sym({ id: 'fox', baseValue: 2, destroys: ['food'] }),
      sym({ id: 'apple', baseValue: 5, tags: ['food'] }),
      sym({ id: 'coin', baseValue: 1 }),
    );
    const r = resolveSpin(board(['fox', 'apple', 'coin']), 3, 1, m, rng());
    expect(r.cells[1].symbolId).toBeNull();
    expect(r.total).toBe(3); // fox 2 + coin 1, apple destroyed
  });

  it('destroy happens BEFORE synergy: a destroyed partner cannot buff', () => {
    const m = mapOf(
      sym({ id: 'fox', baseValue: 1, destroys: ['food'] }),
      sym({ id: 'mouse', baseValue: 1, synergies: [{ withTag: 'food', effect: 'add', value: 10 }] }),
      sym({ id: 'apple', baseValue: 0, tags: ['food'] }),
    );
    const r = resolveSpin(board(['fox', 'mouse', 'apple']), 3, 1, m, rng());
    // apple destroyed before synergy → mouse gets no +10
    expect(r.cells[1].payout).toBe(1);
    expect(r.total).toBe(2);
  });

  it('transform changes a matching symbol into its target (new base value)', () => {
    const m = mapOf(
      sym({ id: 'smelter', baseValue: 0, transforms: [{ from: 'ore', to: 'gold' }] }),
      sym({ id: 'ore', baseValue: 1, tags: ['mineral'] }),
      sym({ id: 'gold', baseValue: 9, tags: ['mineral'] }),
    );
    const r = resolveSpin(board(['smelter', 'ore', null]), 3, 1, m, rng());
    expect(r.cells[1].symbolId).toBe('gold');
    expect(r.total).toBe(9);
  });

  it('degenerate: transform cycle terminates and swaps by snapshot', () => {
    const m = mapOf(
      sym({ id: 'a', baseValue: 1, transforms: [{ from: 'b', to: 'a' }] }),
      sym({ id: 'b', baseValue: 2, transforms: [{ from: 'a', to: 'b' }] }),
    );
    const r = resolveSpin(board(['a', 'b']), 2, 1, m, rng());
    // snapshot swap: a-cell had 'a' (b turns a→b), b-cell had 'b' (a turns b→a)
    expect(r.cells[0].symbolId).toBe('b');
    expect(r.cells[1].symbolId).toBe('a');
    expect(r.total).toBe(3);
  });

  it('delivery: hauler moves adjacent producer value to an adjacent consumer', () => {
    const m = mapOf(
      sym({ id: 'ore', baseValue: 1, tags: ['mineral'] }),
      sym({ id: 'truck', baseValue: 0, delivery: { from: 'mineral', to: 'depot', value: 2 } }),
      sym({ id: 'depot', baseValue: 1 }),
    );
    // ore → truck → depot in a row: truck is adjacent to both
    const r = resolveSpin(board(['ore', 'truck', 'depot']), 3, 1, m, rng());
    expect(r.cells[2].payout).toBe(3); // depot base 1 + 2×ore.baseValue(1)
    expect(r.total).toBe(4); // ore 1 + truck 0 + depot 3
  });

  it('delivery: no consumer adjacent → no bonus', () => {
    const m = mapOf(
      sym({ id: 'ore', baseValue: 1, tags: ['mineral'] }),
      sym({ id: 'truck', baseValue: 0, delivery: { from: 'mineral', to: 'depot', value: 2 } }),
      sym({ id: 'depot', baseValue: 1 }),
    );
    const r = resolveSpin(board(['ore', 'truck', null]), 3, 1, m, rng());
    expect(r.total).toBe(1); // ore only; nothing delivered
  });

  it('degenerate: spawn on a full board is dropped', () => {
    const m = mapOf(sym({ id: 's', baseValue: 1, spawnRules: [{ spawns: 's', chance: 1 }] }));
    const r = resolveSpin(board(['s']), 1, 1, m, rng());
    expect(r.total).toBe(1); // no empty cell → no spawn
  });

  it('spawn fills a random empty cell when available', () => {
    const m = mapOf(
      sym({ id: 's', baseValue: 1, spawnRules: [{ spawns: 'coin', chance: 1 }] }),
      sym({ id: 'coin', baseValue: 5 }),
    );
    const r = resolveSpin(board(['s', null]), 2, 1, m, rng());
    expect(r.total).toBe(6);
  });

  it('degenerate: self-referential synergy counts OTHER instances only', () => {
    const m = mapOf(sym({ id: 's', baseValue: 1, synergies: [{ withId: 's', effect: 'add', value: 1 }] }));
    const solo = resolveSpin(board(['s', null]), 2, 1, m, rng());
    expect(solo.cells[0].payout).toBe(1); // alone → no bonus
    const pair = resolveSpin(board(['s', 's']), 2, 1, m, rng());
    expect(pair.cells[0].payout).toBe(2); // each sees the other
    expect(pair.total).toBe(4);
  });

  it('degenerate: empty board pays 0', () => {
    const m = mapOf(sym({ id: 'coin', baseValue: 1 }));
    const r = resolveSpin(board([null, null, null, null]), 2, 2, m, rng());
    expect(r.total).toBe(0);
  });
});
