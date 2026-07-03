// Solo playable UI (Phase 2). Thin DOM view over the pure engine: render(state) rebuilds the
// screen; user actions dispatch pure reducers and re-render. No game logic lives here.
import type { GameConfig } from '../engine/state';
import type { Symbol as GameSymbol } from '../engine/types';
import { createGame, spin, chooseOwn, chooseShared } from '../engine/game';
import { rentFor, roundsForDeadline } from '../engine/economy';
import { glyphFor } from './glyph';

export function mountApp(root: HTMLElement, config: GameConfig, initialSeed: number): void {
  let seed = initialSeed;
  let state = createGame(seed, config);

  const sym = (id: string | null): GameSymbol | undefined => (id ? config.symbolsById.get(id) : undefined);

  function el(tag: string, className?: string, text?: string): HTMLElement {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  function newRun(): void {
    seed = (seed + 0x9e3779b1) >>> 0; // fresh seed each run
    state = createGame(seed, config);
    render();
  }

  function hud(): HTMLElement {
    const rent = rentFor(config.economy, state.deadline);
    const spinsThis = roundsForDeadline(config.economy, state.deadline);
    const wrap = el('header', 'hud');
    const title = el('h1', 'hud__title', 'Spin-Together');
    const stats = el('div', 'hud__stats');
    const stat = (label: string, value: string): HTMLElement => {
      const s = el('div', 'stat');
      s.append(el('span', 'stat__label', label), el('span', 'stat__value', value));
      return s;
    };
    stats.append(
      stat('Coffer', String(state.coffer)),
      stat(`Rent D${state.deadline}`, state.phase === 'won' ? '—' : String(rent)),
      stat('Spins', `${Math.min(state.roundInDeadline, spinsThis)} / ${spinsThis}`),
      stat('Board', `${state.cols}×${state.rows}`),
    );
    wrap.append(title, stats);
    return wrap;
  }

  function boardArea(): HTMLElement {
    const area = el('main', 'board-area');
    const board = el('div', 'board');
    board.style.setProperty('--cols', String(state.cols));
    board.style.setProperty('--rows', String(state.rows));
    const n = state.cols * state.rows;
    const cells = state.lastSpin && state.lastSpin.cells.length === n ? state.lastSpin.cells : null;
    for (let i = 0; i < n; i++) {
      const cell = el('div', 'cell');
      if (cells) {
        const c = cells[i];
        if (c.symbolId) {
          cell.classList.add('cell--filled');
          cell.append(el('span', 'cell__glyph', glyphFor(sym(c.symbolId))));
          if (c.payout > 0) cell.append(el('span', 'cell__pay', `+${c.payout}`));
        }
      }
      board.append(cell);
    }
    area.append(board);
    return area;
  }

  function card(id: string, onPick: () => void, disabled: boolean): HTMLElement {
    const s = sym(id);
    const c = el('button', 'card');
    c.append(el('span', 'card__glyph', glyphFor(s)));
    c.append(el('span', 'card__name', s?.name ?? id));
    c.append(el('span', `card__rarity card__rarity--${s?.rarity ?? 'common'}`, s?.rarity ?? ''));
    const hint = s?.synergies[0]?.note ?? (s ? `Pays ${s.baseValue}` : '');
    c.append(el('span', 'card__hint', hint));
    if (disabled) (c as HTMLButtonElement).disabled = true;
    else c.addEventListener('click', onPick);
    return c;
  }

  function actions(): HTMLElement {
    const area = el('section', 'actions');
    if (state.phase === 'ready') {
      const btn = el('button', 'btn btn--spin', '🎰 Spin');
      btn.addEventListener('click', () => {
        state = spin(state, config);
        render();
      });
      area.append(btn);
    } else if (state.phase === 'draftOwn') {
      area.append(el('p', 'actions__prompt', state.canDraftOwn ? 'Draft 1 to YOUR pool' : 'Your pool is at the cap — skip only'));
      const row = el('div', 'cards');
      state.ownOffer.forEach((id, i) =>
        row.append(card(id, () => { state = chooseOwn(state, config, i); render(); }, !state.canDraftOwn)),
      );
      area.append(row, skipBtn(() => { state = chooseOwn(state, config, null); render(); }));
    } else if (state.phase === 'draftShared') {
      area.append(el('p', 'actions__prompt', 'Agree on 1 for the SHARED pool'));
      const row = el('div', 'cards');
      state.sharedOffer.forEach((id, i) =>
        row.append(card(id, () => { state = chooseShared(state, config, i); render(); }, false)),
      );
      area.append(row, skipBtn(() => { state = chooseShared(state, config, null); render(); }));
    } else if (state.phase === 'won' || state.phase === 'lost') {
      const msg = state.phase === 'won' ? '🎉 You win together!' : '💀 Evicted';
      area.append(el('p', `endscreen endscreen--${state.phase}`, msg));
      const btn = el('button', 'btn', 'New run');
      btn.addEventListener('click', newRun);
      area.append(btn);
    }
    return area;
  }

  function skipBtn(onClick: () => void): HTMLElement {
    const b = el('button', 'btn btn--skip', 'Skip');
    b.addEventListener('click', onClick);
    return b;
  }

  function logView(): HTMLElement {
    const wrap = el('footer', 'log');
    state.log.slice(-4).forEach((line) => wrap.append(el('div', 'log__line', line)));
    return wrap;
  }

  function render(): void {
    root.textContent = '';
    root.append(hud(), boardArea(), actions(), logView());
  }

  render();
}
