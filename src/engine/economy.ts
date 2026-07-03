// Pure economy helpers. All numbers come from data/economy.json — nothing hardcoded.
import type { Economy, BoardSize } from './types';

/** Rent due at a 1-based deadline index. Integer coins. */
export function rentFor(economy: Economy, deadline: number): number {
  const { base, growth, growthPerDeadline } = economy.rent;
  if (growthPerDeadline && growthPerDeadline.length > 0) {
    // Piecewise: multiply base by each per-deadline growth factor up to `deadline`.
    let r = base;
    for (let d = 1; d <= deadline; d++) {
      r *= growthPerDeadline[Math.min(d - 1, growthPerDeadline.length - 1)];
    }
    return Math.round(r);
  }
  return Math.round(base * Math.pow(growth, deadline));
}

/** Board size in effect after `deadlinesCleared` (largest matching threshold). */
export function boardSizeFor(growth: BoardSize[], deadlinesCleared: number): BoardSize {
  let current = growth[0];
  for (const g of growth) {
    if (deadlinesCleared >= g.afterDeadline) current = g;
  }
  return current;
}

/**
 * Rounds required to reach a given 1-based deadline. Solo: 1 spin per round, so this is
 * economy.run.spinsPerDeadline[d-1]. (In 2-player each round is 2 spins; that mapping lives
 * in the Phase 4 sync layer, not here.)
 */
export function roundsForDeadline(economy: Economy, deadline: number): number {
  const arr = economy.run.spinsPerDeadline;
  return arr[Math.min(deadline - 1, arr.length - 1)];
}
