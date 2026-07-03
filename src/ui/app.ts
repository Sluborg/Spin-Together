// Solo playable UI (Phase 2 + polish). Thin DOM view over the pure engine: render(state)
// rebuilds the screen; user actions dispatch pure reducers and re-render. No game logic here.
// Draft selections appear as a CENTERED overlay with a hide/show toggle so the board stays
// peekable. Symbols render as CC0 icons (artRef) with an emoji fallback if the image is missing.
import type { GameConfig } from '../engine/state';
import type { Symbol as GameSymbol } from '../engine/types';
import { createGame, spin, chooseOwn, chooseShared } from '../engine/game';
import { rentFor, roundsForDeadline } from '../engine/economy';
import { glyphFor } from './glyph';

export function mountApp(root: HTMLElement, config: GameConfig, initialSeed: number): void {
  let seed = initialSeed;
  let state = createGame(seed, config);
  let draftHidden = false; // UI-only: is the centered draft overlay collapsed?

  const sym = (id: string | null): GameSymbol | undefined => (id ? config.symbolsById.get(id) : undefined);

  function el(tag: string, className?: string, text?: string): HTMLElement {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  /** A symbol's visual: its CC0 icon, falling back to an emoji glyph if the image fails to load. */
  function glyphNode(s: GameSymbol | undefined, where: 'in-cell' | 'in-card'): HTMLElement {
    if (s?.artRef) {
      const img = document.createElement('img');
      img.className = `sym-img ${where}`;
      img.src = import.meta.env.BASE_URL + s.artRef;
      img.alt = s.name;
      img.decoding = 'async';
      img.addEventListener('error', () => img.replaceWith(el('span', `sym-glyph ${where}`, glyphFor(s))));
      return img;
    }
    return el('span', `sym-glyph ${where}`, glyphFor(s));
  }

  function newRun(): void {
    seed = (seed + 0x9e3779b1) >>> 0;
    state = createGame(seed, config);
    draftHidden = false;
    render();
  }

  function hud(): HTMLElement {
    const rent = rentFor(config.economy, state.deadline);
    const spinsThis = roundsForDeadline(config.economy, state.deadline);
    const wrap = el('header', 'hud');
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
    wrap.append(el('h1', 'hud__title', 'Spin-Together'), stats);
    return wrap;
  }

  const maxCols = Math.max(...config.economy.boardGrowth.map((g) => g.cols));
  const maxRows = Math.max(...config.economy.boardGrowth.map((g) => g.rows));

  // Render the full maxCols×maxRows cabinet as vertical reels; the current board region is
  // centered and "active", the surrounding slots preview the growth (dimmed).
  function boardArea(): HTMLElement {
    const area = el('main', 'board-area');
    const machine = el('div', 'machine');
    const reels = el('div', 'reels');
    reels.style.setProperty('--reelcount', String(maxCols));

    const aCols = state.cols;
    const aRows = state.rows;
    const colStart = Math.floor((maxCols - aCols) / 2);
    const rowStart = Math.floor((maxRows - aRows) / 2);
    const cells = state.lastSpin && state.lastSpin.cells.length === aCols * aRows ? state.lastSpin.cells : null;

    for (let c = 0; c < maxCols; c++) {
      const reel = el('div', 'reel');
      reel.style.setProperty('--slots', String(maxRows));
      for (let r = 0; r < maxRows; r++) {
        const active = c >= colStart && c < colStart + aCols && r >= rowStart && r < rowStart + aRows;
        const slot = el('div', active ? 'slot' : 'slot slot--inactive');
        const placed = active && cells ? cells[(r - rowStart) * aCols + (c - colStart)] : null;
        if (placed && placed.symbolId) {
          slot.append(glyphNode(sym(placed.symbolId), 'in-cell'));
          if (placed.payout > 0) slot.append(el('span', 'slot__pay', `+${placed.payout}`));
        } else {
          slot.append(el('span', 'slot__dot'));
        }
        reel.append(slot);
      }
      reels.append(reel);
    }
    machine.append(reels);
    area.append(machine);
    return area;
  }

  function card(id: string, onPick: () => void, disabled: boolean): HTMLElement {
    const s = sym(id);
    const c = el('button', 'card');
    c.append(glyphNode(s, 'in-card'));
    c.append(el('span', 'card__name', s?.name ?? id));
    c.append(el('span', `card__rarity card__rarity--${s?.rarity ?? 'common'}`, s?.rarity ?? ''));
    c.append(el('span', 'card__hint', s?.synergies[0]?.note ?? (s ? `Pays ${s.baseValue}` : '')));
    if (disabled) (c as HTMLButtonElement).disabled = true;
    else c.addEventListener('click', onPick);
    return c;
  }

  function skipBtn(onClick: () => void): HTMLElement {
    const b = el('button', 'btn btn--skip', 'Skip');
    b.addEventListener('click', onClick);
    return b;
  }

  /** The centered draft overlay (or a small "show" pill when collapsed). */
  function draftOverlay(kind: 'own' | 'shared'): HTMLElement {
    const offers = kind === 'own' ? state.ownOffer : state.sharedOffer;
    const disabled = kind === 'own' && !state.canDraftOwn;
    const pick = (i: number): void => {
      state = kind === 'own' ? chooseOwn(state, config, i) : chooseShared(state, config, i);
      draftHidden = false;
      render();
    };
    const skip = (): void => {
      state = kind === 'own' ? chooseOwn(state, config, null) : chooseShared(state, config, null);
      draftHidden = false;
      render();
    };

    if (draftHidden) {
      const pill = el('button', 'pill', '▲ Show picks');
      pill.addEventListener('click', () => { draftHidden = false; render(); });
      return pill;
    }

    const backdrop = el('div', 'overlay');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) { draftHidden = true; render(); }
    });
    const panel = el('div', 'panel');
    const head = el('div', 'panel__head');
    head.append(el('span', 'panel__title', kind === 'own' ? 'Draft to YOUR pool' : 'Agree on a SHARED symbol'));
    const hide = el('button', 'panel__toggle', 'Hide ▾');
    hide.addEventListener('click', () => { draftHidden = true; render(); });
    head.append(hide);
    panel.append(head);
    if (disabled) panel.append(el('p', 'panel__note', 'Your pool is at the cap — skip only'));
    const row = el('div', 'cards');
    offers.forEach((id, i) => row.append(card(id, () => pick(i), disabled)));
    panel.append(row, skipBtn(skip));
    backdrop.append(panel);
    return backdrop;
  }

  function actions(): HTMLElement | null {
    if (state.phase === 'ready') {
      const area = el('section', 'actions');
      const btn = el('button', 'btn btn--spin', '🎰 Spin');
      btn.addEventListener('click', () => { state = spin(state, config); draftHidden = false; render(); });
      area.append(btn);
      return area;
    }
    if (state.phase === 'draftOwn') return draftOverlay('own');
    if (state.phase === 'draftShared') return draftOverlay('shared');
    if (state.phase === 'won' || state.phase === 'lost') {
      const area = el('section', 'actions');
      area.append(el('p', `endscreen endscreen--${state.phase}`, state.phase === 'won' ? '🎉 You win together!' : '💀 Evicted'));
      const btn = el('button', 'btn', 'New run');
      btn.addEventListener('click', newRun);
      area.append(btn);
      return area;
    }
    return null;
  }

  function logView(): HTMLElement {
    const wrap = el('footer', 'log');
    state.log.slice(-4).forEach((line) => wrap.append(el('div', 'log__line', line)));
    return wrap;
  }

  function render(): void {
    root.textContent = '';
    root.append(hud(), boardArea(), logView());
    const a = actions();
    if (a) root.append(a); // overlay/pill are position:fixed; inline sections flow normally
  }

  render();
}
