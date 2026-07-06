// Solo playable UI (Phase 2 + polish). Thin DOM view over the pure engine: render(state)
// rebuilds the screen; user actions dispatch pure reducers and re-render. No game logic here.
// Draft selections appear as a CENTERED overlay with a hide/show toggle so the board stays
// peekable. Symbols render as CC0 icons (artRef) with an emoji fallback if the image is missing.
import type { GameConfig, GameState, SpinResult } from '../engine/state';
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
  let pendingResult: GameState | null = null; // spun result being shown; player taps Continue to draft
  let infoSym: GameSymbol | null = null; // UI-only: symbol whose info card is open (tap to inspect)
  let infoAnchor: DOMRect | null = null; // where the info card should point (the tapped element)
  let invOpen = false; // UI-only: inventory panel open

  const BASE = import.meta.env.BASE_URL;
  const sym = (id: string | null): GameSymbol | undefined => (id ? config.symbolsById.get(id) : undefined);
  const nameOf = (id: string): string => config.symbolsById.get(id)?.name ?? id;

  function el(tag: string, className?: string, text?: string): HTMLElement {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  // A coin amount, LBAL-style: silver coin icon THEN the number (e.g. ●30), vertically centered.
  // Silver (not the gold copper-coin symbol) so currency never reads as a board piece.
  function coinAmt(n: number, cls: string): HTMLElement {
    const s = el('span', `coinamt ${cls}`);
    const ic = document.createElement('img');
    ic.className = 'coinamt__ic';
    ic.src = BASE + 'assets/ui/coin-silver.png';
    ic.alt = '';
    ic.setAttribute('aria-hidden', 'true');
    s.append(ic, el('span', 'coinamt__n', String(n)));
    return s;
  }

  // Only "group/category" tags are surfaced to players; functional tags (spawner/scaler/…) are internal.
  const VISIBLE_TAGS = new Set(['animal', 'food', 'mineral', 'plant', 'human', 'tool', 'weapon', 'vehicle', 'potion', 'treasure']);

  // Human-readable "what it does" lines, from the authored player-facing notes.
  function effectLines(s: GameSymbol): string[] {
    const lines: string[] = [];
    for (const syn of s.synergies) {
      lines.push(syn.note ?? `${syn.effect} ${syn.value} (${syn.withTag ?? nameOf(syn.withId ?? '')})`);
    }
    for (const tr of s.transforms) lines.push(tr.note ?? `Transforms ${nameOf(tr.from)} → ${nameOf(tr.to)}`);
    for (const sp of s.spawnRules) lines.push(sp.note ?? `${Math.round(sp.chance * 100)}% to spawn ${nameOf(sp.spawns)}`);
    for (const d of s.destroys) lines.push(`Destroys ${nameOf(d)}`);
    return lines;
  }

  function openInfo(s: GameSymbol | undefined, anchor?: HTMLElement): void {
    if (!s) return;
    infoSym = s;
    infoAnchor = anchor ? anchor.getBoundingClientRect() : null;
    render();
  }
  function closeInfo(): void {
    infoSym = null;
    infoAnchor = null;
    render();
  }

  // Place the info card near the tapped element (below if it fits, else above), clamped to viewport.
  function positionInfo(panel: HTMLElement, rect: DOMRect): void {
    panel.classList.add('panel--anchored');
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const m = 8;
    let top = rect.bottom + m;
    if (top + ph > vh - m) top = rect.top - ph - m; // flip above
    if (top < m) top = Math.max(m, (vh - ph) / 2); // last resort
    let left = rect.left + rect.width / 2 - pw / 2;
    left = Math.max(m, Math.min(left, vw - pw - m));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  // Symbol detail card: icon, name, rarity (with rarity divider), base pay in coins, tags, effects.
  function infoOverlay(s: GameSymbol): HTMLElement {
    const anchor = infoAnchor;
    const backdrop = el('div', 'overlay overlay--info');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeInfo();
    });
    const panel = el('div', `panel panel--info card--rar-${s.rarity}`); // carries --rar for rarity tint
    const head = el('div', 'info__head');
    head.append(glyphNode(s, 'in-card'));
    const titles = el('div', 'info__titles');
    titles.append(el('span', 'info__name', s.name));
    titles.append(el('span', `card__rarity card__rarity--${s.rarity}`, s.rarity));
    titles.append(el('span', `card__rule card__rule--${s.rarity}`));
    head.append(titles);
    const close = el('button', 'panel__toggle', 'Close');
    close.addEventListener('click', closeInfo);
    head.append(close);
    panel.append(head);

    // base pay, then (only group) tags to the right of a vertical divider
    const pay = el('div', 'info__pay');
    pay.append(el('span', 'info__paylabel', 'Base pay'), coinAmt(s.baseValue, 'coinamt--info'));
    const vis = s.tags.filter((t) => VISIBLE_TAGS.has(t));
    if (vis.length) {
      pay.append(el('span', 'info__vdiv'));
      pay.append(el('span', 'info__tags', vis.join(' · ')));
    }
    panel.append(pay);

    const lines = effectLines(s);
    const ul = el('ul', 'info__effects');
    if (lines.length) for (const l of lines) ul.append(el('li', 'info__effect', l));
    else ul.append(el('li', 'info__effect info__effect--none', 'No special effect — pays its base value.'));
    panel.append(ul);

    backdrop.append(panel);
    if (anchor) requestAnimationFrame(() => positionInfo(panel, anchor));
    return backdrop;
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
    const view = pendingResult ?? state;
    const won = view.phase === 'won';
    const rent = rentFor(config.economy, view.deadline);
    const total = roundsForDeadline(config.economy, view.deadline);
    const done = Math.min(view.roundInDeadline, total);
    const left = Math.max(0, total - done);
    const covered = view.coffer >= rent;
    const pct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));

    const wrap = el('header', 'hud');

    // Top bar (LBAL-style): inventory on the left, your money (silver coin) on the right.
    const top = el('div', 'hud__top');
    const inv = el('button', 'hud__inv', 'Inventory');
    inv.addEventListener('click', () => { invOpen = true; render(); });
    top.append(inv, coinAmt(view.coffer, 'money'));
    wrap.append(top);

    // Rent — the goal: how much is due, when, and whether you're covered.
    const rentCard = el('div', 'rent');
    const rhead = el('div', 'rent__head');
    rhead.append(
      el('span', 'rent__label', 'RENT'),
      el('span', 'rent__deadline', `Deadline ${Math.min(view.deadline, config.economy.run.deadlines)}/${config.economy.run.deadlines}`),
    );
    rentCard.append(rhead, el('span', 'rent__val', won ? 'PAID' : String(rent)));
    if (!won) {
      const prog = el('div', 'rent__prog');
      const track = el('div', 'rent__track');
      const fill = el('i');
      fill.style.width = `${pct}%`;
      track.append(fill);
      prog.append(track, el('span', 'rent__spins', left > 0 ? `${left} spin${left === 1 ? '' : 's'} left` : 'due now'));
      const status = el('span', `rent__status ${covered ? 'rent__status--ok' : ''}`, covered ? '✓ covered — bank extra' : `need ${rent - view.coffer} more`);
      rentCard.append(prog, status);
    }

    wrap.append(rentCard);
    return wrap;
  }

  // Inventory: the symbols you own (own + shared pools), with counts; tap one to inspect it.
  function inventoryOverlay(): HTMLElement {
    const view = pendingResult ?? state;
    const backdrop = el('div', 'overlay');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) { invOpen = false; render(); }
    });
    const panel = el('div', 'panel panel--inv');
    const head = el('div', 'panel__head');
    head.append(el('span', 'panel__title', 'Inventory'));
    const close = el('button', 'panel__toggle', 'Close');
    close.addEventListener('click', () => { invOpen = false; render(); });
    head.append(close);
    panel.append(head);
    panel.append(poolSection('Your pool', view.ownPool));
    panel.append(poolSection('Shared pool', view.sharedPool));
    backdrop.append(panel);
    return backdrop;
  }

  function poolSection(title: string, pool: readonly string[]): HTMLElement {
    const sec = el('div', 'inv__sec');
    sec.append(el('div', 'inv__title', `${title} · ${pool.length}`));
    const counts = new Map<string, number>();
    for (const id of pool) counts.set(id, (counts.get(id) ?? 0) + 1);
    const grid = el('div', 'inv__grid');
    for (const [id, n] of counts) {
      const cell = el('button', 'inv__cell');
      cell.append(glyphNode(sym(id), 'in-cell'));
      if (n > 1) cell.append(el('span', 'inv__count', `×${n}`));
      cell.append(el('span', 'inv__name', nameOf(id)));
      cell.addEventListener('click', (e) => openInfo(sym(id), e.currentTarget as HTMLElement));
      grid.append(cell);
    }
    if (counts.size === 0) sec.append(el('div', 'inv__empty', '—'));
    sec.append(grid);
    return sec;
  }

  // Render the current board (state.cols × state.rows) as a slot-machine cabinet of vertical reels.
  // The board grows over the run; we only show what's currently in play.
  function boardArea(): HTMLElement {
    const view = pendingResult ?? state;
    const area = el('main', 'board-area');
    const machine = el('div', 'machine');
    const reels = el('div', 'reels');
    const aCols = view.cols;
    const aRows = view.rows;
    reels.style.setProperty('--reelcount', String(aCols));
    const cells = view.lastSpin && view.lastSpin.cells.length === aCols * aRows ? view.lastSpin.cells : null;

    for (let c = 0; c < aCols; c++) {
      const reel = el('div', 'reel');
      reel.style.setProperty('--slots', String(aRows));
      for (let r = 0; r < aRows; r++) {
        const slot = el('div', 'slot');
        const placed = cells ? cells[r * aCols + c] : null;
        if (placed && placed.symbolId) {
          const cellSym = sym(placed.symbolId);
          slot.append(glyphNode(cellSym, 'in-cell'));
          if (placed.payout > 0) slot.append(coinAmt(placed.payout, 'slot__pay'));
          slot.classList.add('slot--tappable');
          slot.addEventListener('click', (e) => openInfo(cellSym, e.currentTarget as HTMLElement)); // tap a symbol → what it does
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
    const rarity = s?.rarity ?? 'common';
    const cls = `card card--${kind} card--rar-${rarity}` + (selected ? ' card--selected' : '') + (disabled ? ' card--disabled' : '');
    const c = el('button', cls) as HTMLButtonElement;
    // tap-to-inspect corner (span, not a nested button — invalid HTML); stops select propagation
    const info = el('span', 'card__info', 'i');
    info.setAttribute('role', 'button');
    info.title = 'What does this do?';
    info.addEventListener('click', (e) => {
      e.stopPropagation();
      openInfo(s, c);
    });
    c.append(info);
    c.append(glyphNode(s, 'in-card'));
    c.append(el('span', 'card__name', s?.name ?? id));
    c.append(el('span', `card__rarity card__rarity--${rarity}`, s?.rarity ?? ''));
    c.append(el('span', `card__rule card__rule--${rarity}`)); // rarity divider line (LBAL-style)
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
      const pill = el('button', 'pill', 'Show picks');
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
    const hide = el('button', 'panel__toggle', 'Hide');
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
    if (pendingResult) {
      // post-spin: let the result read, then continue to the draft on tap
      const area = el('section', 'actions');
      const paid = pendingResult.lastSpin?.total ?? 0;
      const prompt = el('p', 'actions__prompt');
      if (paid > 0) {
        prompt.append(el('span', undefined, 'Spin paid '), coinAmt(paid, 'coinamt--prompt'));
      } else {
        prompt.textContent = 'No payout this spin';
      }
      area.append(prompt);
      const btn = el('button', 'btn btn--spin', 'Continue');
      btn.addEventListener('click', openDraft);
      area.append(btn);
      return area;
    }
    if (state.phase === 'ready') {
      const area = el('section', 'actions');
      const btn = el('button', 'btn btn--spin', spinning ? 'Spinning…' : 'Spin') as HTMLButtonElement;
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
    if (spinning || pendingResult || state.phase !== 'ready') return;
    const result = spin(state, config);
    const final = result.lastSpin;
    spinning = true;
    render(); // disable the button; board still shows the prior result
    if (final) await animateReels(final, state.cols, state.rows);
    spinning = false;
    pendingResult = result; // hold on the landed result; player taps Continue to open the draft
    render();
  }

  function openDraft(): void {
    if (!pendingResult) return;
    state = pendingResult;
    pendingResult = null;
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
        if (!rolling && payout > 0) slot.appendChild(coinAmt(payout, 'slot__pay'));
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
    root.append(hud(), boardArea());
    const a = actions();
    if (a) root.append(a); // overlay/pill are position:fixed; inline sections flow normally
    if (invOpen) root.append(inventoryOverlay());
    if (infoSym) root.append(infoOverlay(infoSym)); // symbol detail card, above everything
  }

  render();
}
