// Pure payout engine (GAME_DESIGN §9). Canonical resolution order with single-pass
// SNAPSHOT semantics: each phase reads the board as of the end of the previous phase, so
// transform cycles / destroy-of-a-buffer / spawn-on-full are all well-defined and terminate.
// Integer coin math only. Synergies are SELF-buff in v1 (a symbol is boosted by the partners
// present); targeted "buff others" is a Phase 5 extension (add a `target` field).
import type { Symbol as GameSymbol } from './types';
import type { Rng } from './rng';
import { nextFloat, nextInt, shuffle } from './rng';

export interface Placed {
  symbolId: string | null;
}

function range(n: number): number[] {
  const a: number[] = [];
  for (let i = 0; i < n; i++) a.push(i);
  return a;
}

/** True if `symbol` is referenced by `ref` (an id or a tag). */
function matchesRef(symbol: GameSymbol, ref: string): boolean {
  return symbol.id === ref || symbol.tags.includes(ref);
}

/**
 * Fill a cols×rows board from a pool (multiset of symbol ids). Symbols and their cells are
 * both randomized (two seeded shuffles: pool order, then cell positions). Empty cells if the
 * pool is smaller than the board.
 */
export function placeBoard(
  rng: Rng,
  pool: readonly string[],
  cols: number,
  rows: number,
): Placed[] {
  const n = cols * rows;
  const cells: Placed[] = range(n).map(() => ({ symbolId: null }));
  const count = Math.min(n, pool.length);
  if (count === 0) return cells;
  const symbols = shuffle(rng, pool).slice(0, count);
  const positions = shuffle(rng, range(n)).slice(0, count);
  for (let i = 0; i < count; i++) cells[positions[i]].symbolId = symbols[i];
  return cells;
}

interface Work {
  symbolId: string | null;
  payout: number;
}

function neighbors(index: number, cols: number, rows: number): number[] {
  const r = Math.floor(index / cols);
  const c = index % cols;
  const out: number[] = [];
  if (r > 0) out.push(index - cols);
  if (r < rows - 1) out.push(index + cols);
  if (c > 0) out.push(index - 1);
  if (c < cols - 1) out.push(index + 1);
  return out;
}

export interface ResolveResult {
  cells: Work[];
  total: number;
}

/**
 * Resolve a placed board into per-cell payouts and a total. `rng` is used only for spawn rolls
 * (in fixed cell-then-rule order), so the stream stays deterministic.
 */
export function resolveSpin(
  placed: readonly Placed[],
  cols: number,
  rows: number,
  symbolsById: ReadonlyMap<string, GameSymbol>,
  rng: Rng,
): ResolveResult {
  const n = placed.length;
  const sym = (id: string | null): GameSymbol | null => (id ? symbolsById.get(id) ?? null : null);

  // Phase 1 — base values.
  const work: Work[] = placed.map((p) => {
    const s = sym(p.symbolId);
    return { symbolId: p.symbolId, payout: s ? s.baseValue : 0 };
  });

  // Phase 2 — destroy (snapshot: decide from the base board, then remove).
  const destroyed = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i++) {
    const s = sym(work[i].symbolId);
    if (!s || s.destroys.length === 0) continue;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const t = sym(work[j].symbolId);
      if (t && s.destroys.some((ref) => matchesRef(t, ref))) destroyed[j] = true;
    }
  }
  for (let i = 0; i < n; i++) {
    if (destroyed[i]) {
      work[i].symbolId = null;
      work[i].payout = 0;
    }
  }

  // Phase 3 — transform (snapshot: read post-destroy board, apply simultaneously).
  const snapshot3 = work.map((w) => w.symbolId);
  const newIds = snapshot3.slice();
  for (let i = 0; i < n; i++) {
    const s = sym(snapshot3[i]);
    if (!s || s.transforms.length === 0) continue;
    for (let j = 0; j < n; j++) {
      const t = sym(snapshot3[j]);
      if (!t) continue;
      for (const tr of s.transforms) {
        if (matchesRef(t, tr.from) && symbolsById.has(tr.to)) newIds[j] = tr.to;
      }
    }
  }
  for (let i = 0; i < n; i++) {
    if (newIds[i] !== snapshot3[i]) {
      const s = sym(newIds[i]);
      work[i].symbolId = newIds[i];
      work[i].payout = s ? s.baseValue : 0;
    }
  }

  // Phase 4 — spawn (snapshot: read post-transform board; fill random empty cells; drop if full).
  const snapshot4 = work.map((w) => w.symbolId);
  let empties = range(n).filter((i) => work[i].symbolId === null);
  for (let i = 0; i < n; i++) {
    const s = sym(snapshot4[i]);
    if (!s || s.spawnRules.length === 0) continue;
    for (const rule of s.spawnRules) {
      const roll = nextFloat(rng);
      if (roll < rule.chance && empties.length > 0 && symbolsById.has(rule.spawns)) {
        const pick = nextInt(rng, empties.length);
        const cell = empties[pick];
        empties = empties.filter((_, k) => k !== pick);
        const spawned = sym(rule.spawns);
        work[cell].symbolId = rule.spawns;
        work[cell].payout = spawned ? spawned.baseValue : 0;
      }
    }
  }

  // Phase 5 — synergy add / addPerAdjacent (self-buff, counts OTHER matching cells).
  for (let i = 0; i < n; i++) {
    const s = sym(work[i].symbolId);
    if (!s) continue;
    for (const syn of s.synergies) {
      if (syn.effect !== 'add' && syn.effect !== 'addPerAdjacent') continue;
      const cellsToCheck =
        syn.effect === 'addPerAdjacent' ? neighbors(i, cols, rows) : range(n);
      let count = 0;
      for (const j of cellsToCheck) {
        if (j === i) continue;
        const t = sym(work[j].symbolId);
        if (t && synergyMatches(syn, t)) count++;
      }
      work[i].payout += syn.value * count;
    }
  }

  // Phase 6 — synergy multiply (self-buff; applies if ≥1 matching partner present).
  for (let i = 0; i < n; i++) {
    const s = sym(work[i].symbolId);
    if (!s) continue;
    for (const syn of s.synergies) {
      if (syn.effect !== 'multiply') continue;
      let present = false;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const t = sym(work[j].symbolId);
        if (t && synergyMatches(syn, t)) {
          present = true;
          break;
        }
      }
      if (present) work[i].payout = Math.round(work[i].payout * syn.value);
    }
  }

  let total = 0;
  for (const w of work) total += w.payout;
  return { cells: work, total };
}

function synergyMatches(syn: { withTag?: string; withId?: string }, t: GameSymbol): boolean {
  if (syn.withId != null) return t.id === syn.withId;
  if (syn.withTag != null) return t.tags.includes(syn.withTag);
  return false;
}
