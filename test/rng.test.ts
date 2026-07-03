import { describe, it, expect } from 'vitest';
import { makeRng, nextU32, nextFloat, nextInt, shuffle, weightedIndex } from '../src/engine/rng';

describe('mulberry32 rng', () => {
  it('produces the golden uint32 vector for seed 12345', () => {
    const rng = makeRng(12345);
    const seq = [0, 0, 0, 0, 0].map(() => nextU32(rng));
    expect(seq).toEqual([4207900869, 1317490944, 2079646450, 3513001552, 2187978186]);
    expect(rng.state).toBe(567906818);
  });

  it('is deterministic: same seed → same sequence', () => {
    const a = makeRng(999);
    const b = makeRng(999);
    const seqA = Array.from({ length: 20 }, () => nextU32(a));
    const seqB = Array.from({ length: 20 }, () => nextU32(b));
    expect(seqA).toEqual(seqB);
  });

  it('nextFloat is in [0,1)', () => {
    const rng = makeRng(1);
    for (let i = 0; i < 1000; i++) {
      const f = nextFloat(rng);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('nextInt stays in range', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = nextInt(rng, 6);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
  });

  it('shuffle is a permutation and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const rng = makeRng(42);
    const out = shuffle(rng, input);
    expect(out).not.toBe(input);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('weightedIndex returns -1 only when total weight is 0', () => {
    const rng = makeRng(3);
    expect(weightedIndex(rng, [0, 0, 0])).toBe(-1);
    const idx = weightedIndex(rng, [1, 0, 0]);
    expect(idx).toBe(0);
  });
});
