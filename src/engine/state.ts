// Game state + intent types for the solo core loop (Phase 2).
// Pure data. The 2-player round sync (Phase 4) will wrap this same engine.
import type { Economy, Symbol as GameSymbol } from './types';

/** A placed board after a spin: symbolId per cell (null = empty), row-major. */
export interface PlacedCell {
  symbolId: string | null;
  payout: number;
}

export interface SpinResult {
  cols: number;
  rows: number;
  cells: PlacedCell[];
  total: number;
}

export type Phase =
  | 'ready' // awaiting a spin
  | 'draft' // choosing 1-of-3 for own AND 1-of-3 for shared (either skippable), then confirm
  | 'won'
  | 'lost';

export interface GameState {
  seed: number;
  rngState: number;
  // pools are multisets of symbol ids (one entry per owned instance)
  ownPool: string[];
  sharedPool: string[];
  deadline: number; // 1-based index of the deadline currently being worked toward
  roundInDeadline: number; // rounds (spins) completed toward the current deadline
  coffer: number;
  cols: number;
  rows: number;
  phase: Phase;
  lastSpin: SpinResult | null;
  ownOffer: string[]; // symbol ids offered for the own draft (empty unless phase draftOwn)
  sharedOffer: string[];
  canDraftOwn: boolean; // guardrail: false => own draft is skip-only
  log: string[]; // short human-readable event log (most recent last)
}

/** Static lookups derived from data, passed alongside state to the reducers. */
export interface GameConfig {
  economy: Economy;
  symbolsById: Map<string, GameSymbol>;
  allSymbolIds: string[]; // draftable pool (every symbol id, for offers)
}
