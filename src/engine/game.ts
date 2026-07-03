// Solo core-loop state machine (GAME_DESIGN §2). Pure reducers: given a state + config (+ an
// intent), return the next state. All RNG flows through state.rngState so the whole run is
// reproducible from the seed. The 2-player round sync (Phase 4) reuses these reducers verbatim.
import type { SymbolsFile, Economy } from './types';
import type { GameState, GameConfig, SpinResult } from './state';
import { makeRng } from './rng';
import { placeBoard, resolveSpin } from './payout';
import { offerSymbols, resolveDraftConstraints } from './draft';
import { rentFor, boardSizeFor, roundsForDeadline } from './economy';

export function makeConfig(symbolsFile: SymbolsFile, economy: Economy): GameConfig {
  const symbolsById = new Map(symbolsFile.symbols.map((s) => [s.id, s]));
  return { economy, symbolsById, allSymbolIds: symbolsFile.symbols.map((s) => s.id) };
}

function pushLog(log: string[], msg: string): string[] {
  return [...log, msg].slice(-8);
}

export function createGame(seed: number, config: GameConfig): GameState {
  const { economy } = config;
  const size = boardSizeFor(economy.boardGrowth, 0);
  return {
    seed,
    rngState: seed >>> 0,
    ownPool: [...economy.starter.own],
    sharedPool: [...economy.starter.shared],
    deadline: 1,
    roundInDeadline: 0,
    coffer: 0,
    cols: size.cols,
    rows: size.rows,
    phase: 'ready',
    lastSpin: null,
    ownOffer: [],
    sharedOffer: [],
    canDraftOwn: true,
    log: [`Run started. First rent: ${rentFor(economy, 1)} in ${roundsForDeadline(economy, 1)} spins.`],
  };
}

/** Spin the board, bank the payout, then offer the individual (own) draft. */
export function spin(state: GameState, config: GameConfig): GameState {
  if (state.phase !== 'ready') return state;
  const { economy, symbolsById } = config;
  const rng = makeRng(state.rngState);
  const pool = [...state.ownPool, ...state.sharedPool];
  const placed = placeBoard(rng, pool, state.cols, state.rows);
  const resolved = resolveSpin(placed, state.cols, state.rows, symbolsById, rng);
  const lastSpin: SpinResult = {
    cols: state.cols,
    rows: state.rows,
    cells: resolved.cells.map((c) => ({ symbolId: c.symbolId, payout: c.payout })),
    total: resolved.total,
  };
  const ownOffer = offerSymbols(rng, config.allSymbolIds, symbolsById, economy, economy.draft.cardsOffered);
  const { canDraftOwn } = resolveDraftConstraints(
    state.ownPool.length,
    state.sharedPool.length,
    economy.guardrail.maxGap,
  );
  return {
    ...state,
    rngState: rng.state,
    coffer: state.coffer + resolved.total,
    roundInDeadline: state.roundInDeadline + 1,
    lastSpin,
    ownOffer,
    sharedOffer: [],
    canDraftOwn,
    phase: 'draftOwn',
    log: pushLog(state.log, `Spin paid ${resolved.total}. Coffer ${state.coffer + resolved.total}.`),
  };
}

/** Individual draft: pick an offered index for the OWN pool, or null to skip. */
export function chooseOwn(state: GameState, config: GameConfig, choice: number | null): GameState {
  if (state.phase !== 'draftOwn') return state;
  const { economy, symbolsById } = config;
  let ownPool = state.ownPool;
  let log = state.log;
  if (choice !== null && state.canDraftOwn && choice >= 0 && choice < state.ownOffer.length) {
    const picked = state.ownOffer[choice];
    ownPool = [...ownPool, picked];
    log = pushLog(log, `Drafted ${symbolsById.get(picked)?.name ?? picked} to your pool.`);
  } else {
    log = pushLog(log, state.canDraftOwn ? 'Skipped own draft.' : 'Own pool at cap — skipped.');
  }
  const rng = makeRng(state.rngState);
  const sharedOffer = offerSymbols(rng, config.allSymbolIds, symbolsById, economy, economy.draft.cardsOffered);
  return { ...state, rngState: rng.state, ownPool, sharedOffer, ownOffer: [], phase: 'draftShared', log };
}

/**
 * Communal draft: pick an offered index for the SHARED pool, or null to skip. Then resolve the
 * deadline if this round completed it (pay rent / grow board / win / lose).
 */
export function chooseShared(state: GameState, config: GameConfig, choice: number | null): GameState {
  if (state.phase !== 'draftShared') return state;
  const { economy, symbolsById } = config;
  let sharedPool = state.sharedPool;
  let log = state.log;
  if (choice !== null && choice >= 0 && choice < state.sharedOffer.length) {
    const picked = state.sharedOffer[choice];
    sharedPool = [...sharedPool, picked];
    log = pushLog(log, `Added ${symbolsById.get(picked)?.name ?? picked} to the shared pool.`);
  } else {
    log = pushLog(log, 'Skipped shared draft.');
  }

  let { deadline, roundInDeadline, coffer, cols, rows } = state;
  let phase: GameState['phase'] = 'ready';

  if (roundInDeadline >= roundsForDeadline(economy, deadline)) {
    const rent = rentFor(economy, deadline);
    if (coffer >= rent) {
      coffer -= rent;
      log = pushLog(log, `Rent ${rent} paid! Coffer ${coffer}.`);
      deadline += 1;
      roundInDeadline = 0;
      const size = boardSizeFor(economy.boardGrowth, deadline - 1);
      if (size.cols !== cols || size.rows !== rows) {
        log = pushLog(log, `Board grew to ${size.cols}×${size.rows}.`);
      }
      cols = size.cols;
      rows = size.rows;
      if (deadline > economy.run.deadlines) {
        phase = 'won';
        log = pushLog(log, 'All rents paid — you win together! 🎉');
      } else {
        log = pushLog(log, `Next rent: ${rentFor(economy, deadline)} in ${roundsForDeadline(economy, deadline)} spins.`);
      }
    } else {
      phase = 'lost';
      log = pushLog(log, `Rent ${rent} due, only ${coffer} banked — evicted. 💀`);
    }
  }

  return {
    ...state,
    sharedPool,
    sharedOffer: [],
    deadline,
    roundInDeadline,
    coffer,
    cols,
    rows,
    phase,
    log,
  };
}
