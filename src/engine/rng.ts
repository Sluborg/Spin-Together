// Seeded, deterministic RNG (mulberry32). State is a single uint32 so it serializes
// trivially into GameState — the whole game is reproducible from (seed, intent log).
// No Math.random / Date anywhere in the engine (determinism contract, GAME_DESIGN §13).

export interface Rng {
  state: number;
}

export function makeRng(seed: number): Rng {
  return { state: seed >>> 0 };
}

/** Advance the stream, return a uint32. Mutates rng.state. */
export function nextU32(rng: Rng): number {
  const a = (rng.state + 0x6d2b79f5) | 0;
  rng.state = a >>> 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (t ^ (t >>> 14)) >>> 0;
}

/** Float in [0, 1). */
export function nextFloat(rng: Rng): number {
  return nextU32(rng) / 4294967296;
}

/** Integer in [0, n). */
export function nextInt(rng: Rng, n: number): number {
  if (n <= 0) return 0;
  return nextU32(rng) % n;
}

/** Fisher–Yates shuffle into a NEW array (does not mutate input). */
export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = nextInt(rng, i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * Weighted pick of an index. `weights` are non-negative; returns the chosen index.
 * Deterministic given rng. Returns -1 only if the total weight is 0.
 */
export function weightedIndex(rng: Rng, weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total <= 0) return -1;
  let r = nextFloat(rng) * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r < 0) return i;
  }
  return weights.length - 1;
}
