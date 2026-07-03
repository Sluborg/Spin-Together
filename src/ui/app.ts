// Solo playable UI (Phase 2 + polish). Thin DOM view over the pure engine: render(state)
// rebuilds the screen; user actions dispatch pure reducers and re-render. No game logic here.
// Draft selections appear as a CENTERED overlay with a hide/show toggle so the board stays
// peekable. Symbols render as CC0 icons (artRef) with an emoji fallback if the image is missing.
import type { GameConfig, SpinResult } from '../engine/state';
import type { Symbol as GameSymbol } from '../engine/types';
import { createGame, spin, resolveDrafts } from '../engine/game';
import { rentFor, roundsForDeadline } from '../engine/economy';
import { glyphFor } from './glyph';

export function mountApp(root: HTMLElement, config: GameConfig, initialSeed: number): void {
  let seed = initialSeed;
  let state = createGame(seed, config);
  let draftHidden = false; // UI-only: is the centered draft overlay collapsed?
  let spinning = false; // UI-only: reels are mid-animation
  let ownSel: number | null = null; // UI-only: selected own-draft index (null = skip)
  let sharedSel: number | null = null; // UI-only: selected shared-draft index (null = skip)

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

  // Render the current board (state.cols × state.rows) as a slot-machine cabinet of vertical reels.
  // The board grows over the run; we only show what's currently in play.
  function boardArea(): HTMLElement {
    const area = el('main', 'board-area');
    const machine = el('div', 'machine');
    const reels = el('div', 'reels');
    const aCols = state.cols;
    const aRows = state.rows;
    reels.style.setProperty('--reelcount', String(aCols));
    const cells = state.lastSpin && state.lastSpin.cells.length === aCols * aRows ? state.lastSpin.cells : null;

    for (let c = 0; c < aCols; c++) {
      const reel = el('div', 'reel');
      reel.style.setProperty('--slots', String(aRows));
      for (let r = 0; r < aRows; r++) {
        const slot = el('div', 'slot');
        const placed = cells ? cells[r * aCols + c] : null;
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

  // A selectable draft card. `selected` highlights it; disabled cards can't be picked.
  function card(id: string, kind: 'own' | 'shared', selected: boolean, onSelect: () => void, disabled: boolean): HTMLElement {
    const s = sym(id);
    const cls = `card card--${kind}` + (selected ? ' card--selected' : '') + (disabled ? ' card--disabled' : '');
    const c = el('button', cls) as HTMLButtonElement;
    if (selected) c.append(el('span', 'card__check', '✓'));
    c.append(glyphNode(s, 'in-card'));
    c.append(el('span', 'card__name', s?.name ?? id));
    c.append(el('span', `card__rarity card__rarity--${s?.rarity ?? 'common'}`, s?.rarity ?? ''));
    c.append(el('span', 'card__hint', s?.synergies[0]?.note ?? (s ? `Pays ${s.baseValue}` : '')));
    if (disabled) c.disabled = true;
    else c.addEventListener('click', onSelect);
    return c;
  }

  // One draft section (own or shared): a titled row of selectable cards. Tapping toggles selection
  // (tap again to deselect = skip). Own is locked when the pool is at the guardrail cap.
  function draftSection(kind: 'own' | 'shared'): HTMLElement {
    const isOwn = kind === 'own';
    const offers = isOwn ? state.ownOffer : state.sharedOffer;
    const sel = isOwn ? ownSel : sharedSel;
    const locked = isOwn && !state.canDraftOwn;
    const sec = el('section', `draft-sec draft-sec--${kind}`);
    const head = el('div', 'draft-sec__head');
    head.append(el('span', 'draft-sec__title', isOwn ? '🧑 Your pool' : '🤝 Shared pool'));
    head.append(el('span', 'draft-sec__tag', locked ? 'at cap — skipped' : sel === null ? 'tap to draft · or skip' : 'drafting'));
    sec.append(head);
    const row = el('div', 'cards');
    offers.forEach((id, i) => {
      const selected = sel === i && !locked;
      row.append(
        card(id, kind, selected, () => {
          if (isOwn) ownSel = ownSel === i ? null : i;
          else sharedSel = sharedSel === i ? null : i;
          render();
        }, locked),
      );
    });
    sec.append(row);
    return sec;
  }

  /** The combined draft overlay: both pools at once, select in each, then Confirm. */
  function draftOverlay(): HTMLElement {
    if (draftHidden) {
      const pill = el('button', 'pill', '▲ Show picks');
      pill.addEventListener('click', () => { draftHidden = false; render(); });
      return pill;
    }
    const backdrop = el('div', 'overlay');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) { draftHidden = true; render(); }
    });
    const panel = el('div', 'panel panel--draft');
    const head = el('div', 'panel__head');
    head.append(el('span', 'panel__title', 'Draft'));
    const hide = el('button', 'panel__toggle', 'Hide ▾');
    hide.addEventListener('click', () => { draftHidden = true; render(); });
    head.append(hide);
    panel.append(head, draftSection('own'), draftSection('shared'));

    const confirm = el('button', 'btn btn--confirm', 'Confirm');
    confirm.addEventListener('click', () => {
      state = resolveDrafts(state, config, ownSel, sharedSel);
      ownSel = null;
      sharedSel = null;
      draftHidden = false;
      render();
    });
    panel.append(confirm);
    backdrop.append(panel);
    return backdrop;
  }

  function actions(): HTMLElement | null {
    if (state.phase === 'ready') {
      const area = el('section', 'actions');
      const btn = el('button', 'btn btn--spin', spinning ? 'Spinning…' : '🎰 Spin') as HTMLButtonElement;
      if (spinning) btn.disabled = true;
      else btn.addEventListener('click', () => void runSpin());
      area.append(btn);
      return area;
    }
    if (state.phase === 'draft') return draftOverlay();
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

  const wait = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

  function randomId(): string {
    const ids = config.allSymbolIds;
    return ids[Math.floor(Math.random() * ids.length)];
  }

  /**
   * Spin the reels: compute the result, roll each active reel (staggered left→right), then land
   * on the final symbols with a bounce, and finally open the draft. UI-only; engine is unchanged.
   */
  async function runSpin(): Promise<void> {
    if (spinning || state.phase !== 'ready') return;
    const result = spin(state, config);
    const final = result.lastSpin;
    spinning = true;
    render(); // disable the button; board still shows the prior result
    if (final) await animateReels(final, state.cols, state.rows);
    await wait(900); // hold on the result so it can be read before the draft opens
    spinning = false;
    state = result;
    ownSel = null;
    sharedSel = null;
    draftHidden = false;
    render();
  }

  // A reel scroll: symbols travel DOWN the column one position per tick (new symbol enters at the
  // top, the bottom one falls off), then the final symbols feed in from the top and settle.
  function animateReels(final: SpinResult, aCols: number, aRows: number): Promise<void> {
    const reelsEl = root.querySelector('.reels');
    if (!reelsEl) return Promise.resolve();
    const reels = Array.from(reelsEl.children) as HTMLElement[];

    const fill = (slot: HTMLElement, id: string | null, rolling: boolean, payout = 0): void => {
      slot.textContent = '';
      slot.classList.toggle('slot--rolling', rolling);
      if (id) {
        slot.appendChild(glyphNode(sym(id), 'in-cell'));
        if (!rolling && payout > 0) slot.appendChild(el('span', 'slot__pay', `+${payout}`));
      } else {
        slot.appendChild(el('span', 'slot__dot'));
      }
    };

    const perReel = async (c: number): Promise<void> => {
      const reel = reels[c];
      if (!reel) return;
      const slots = (Array.from(reel.children) as HTMLElement[]).slice(0, aRows); // active (top-left) rows
      const finals: (string | null)[] = [];
      for (let r = 0; r < aRows; r++) finals.push(final.cells[r * aCols + c]?.symbolId ?? null);

      let col: (string | null)[] = Array.from({ length: aRows }, () => randomId());
      const paint = (): void => col.forEach((id, r) => fill(slots[r], id, true));

      const spinTicks = 7 + c; // later reels spin longer → staggered stops (left→right)
      for (let t = 0; t < spinTicks; t++) {
        col = [randomId(), ...col.slice(0, aRows - 1)]; // shift DOWN; new symbol in at the top
        paint();
        await wait(55);
      }
      // feed the real result in from the top (bottom row first) so it settles into place
      for (let r = aRows - 1; r >= 0; r--) {
        col = [finals[r], ...col.slice(0, aRows - 1)];
        paint();
        await wait(60 + (aRows - 1 - r) * 22); // decelerate as it lands
      }
      // settle: final symbols + coin badges + a little bounce
      for (let r = 0; r < aRows; r++) {
        const cell = final.cells[r * aCols + c];
        fill(slots[r], cell?.symbolId ?? null, false, cell?.payout ?? 0);
        if (cell?.symbolId) {
          slots[r].classList.add('slot--land');
          setTimeout(() => slots[r].classList.remove('slot--land'), 220);
        }
      }
    };

    return Promise.all(Array.from({ length: aCols }, (_, c) => perReel(c))).then(() => undefined);
  }

  function render(): void {
    root.textContent = '';
    root.append(hud(), boardArea(), logView());
    const a = actions();
    if (a) root.append(a); // overlay/pill are position:fixed; inline sections flow normally
  }

  render();
}
