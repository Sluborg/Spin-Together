// Draft offers + the divergence guardrail (GAME_DESIGN §5, §8). Pure.
import type { Economy, Symbol as GameSymbol, Rarity } from './types';
import type { Rng } from './rng';
import { weightedIndex } from './rng';

export interface DraftConstraints {
  canDraftOwn: boolean;
}

/**
 * Guardrail: own pool may not exceed shared by more than `maxGap`. When the gap is at the cap,
 * the individual draft becomes skip-only (GAME_DESIGN §8). Recomputed from live counts so it
 * holds after any state transition, not just drafts (§13 R-Q6).
 */
export function resolveDraftConstraints(
  ownCount: number,
  sharedCount: number,
  maxGap: number,
): DraftConstraints {
  return { canDraftOwn: ownCount - sharedCount < maxGap };
}

/**
 * Offer `count` distinct symbols, weighted by rarity (economy.draft.rarityWeights).
 * Weighted sampling without replacement. Deterministic given rng.
 */
export function offerSymbols(
  rng: Rng,
  allSymbolIds: readonly string[],
  symbolsById: ReadonlyMap<string, GameSymbol>,
  economy: Economy,
  count: number,
): string[] {
  const pool = allSymbolIds.slice();
  const weights = pool.map((id) => {
    const s = symbolsById.get(id);
    const r = (s?.rarity ?? 'common') as Rarity;
    return economy.draft.rarityWeights[r] ?? 1;
  });
  const out: string[] = [];
  const want = Math.min(count, pool.length);
  for (let k = 0; k < want; k++) {
    const idx = weightedIndex(rng, weights);
    if (idx < 0) break;
    out.push(pool[idx]);
    pool.splice(idx, 1);
    weights.splice(idx, 1);
  }
  return out;
}
