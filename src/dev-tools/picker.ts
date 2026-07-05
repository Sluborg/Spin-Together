// Dev-tools asset picker + symbol builder (open with ?dev=1). Browse the pre-filtered Kenney CC0
// tiles, then CREATE or edit symbols with the picked art, and export a full symbol set. Not part
// of the game bundle. Export → apply (script/orchestrator) writes symbols.json + copies art.
import type { GameConfig } from '../engine/state';
import { RARITIES, TAGS } from '../engine/types';

interface Manifest {
  packs: { slug: string; name: string; tiles: string[] }[];
}

interface Work {
  id: string;
  name: string;
  rarity: string;
  baseValue: number;
  tags: string[];
  art?: string; // "slug/tile" of a picked dev-asset (else keep existing artRef)
  artRef: string;
  // preserved so editing basic fields never drops the richer data:
  synergies: unknown[];
  destroys: unknown[];
  transforms: unknown[];
  spawnRules: unknown[];
  soundRef: string;
  devNotes: string;
}

export async function mountPicker(root: HTMLElement, config: GameConfig): Promise<void> {
  const base = import.meta.env.BASE_URL;
  const manifest = (await fetch(`${base}dev-assets/manifest.json`).then((r) => r.json())) as Manifest;

  const el = (tag: string, cls?: string, text?: string): HTMLElement => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const tileUrl = (slug: string, t: string): string => `${base}dev-assets/${slug}/${t}.png`;
  const artUrl = (w: Work): string => {
    if (w.art) {
      const [slug, t] = w.art.split('/');
      return tileUrl(slug, t);
    }
    return base + w.artRef;
  };
  const imgEl = (src: string, cls: string): HTMLImageElement => {
    const i = document.createElement('img');
    i.className = cls;
    i.src = src;
    return i;
  };

  // Working symbol set. Seeded from the live game data, then overlaid with any locally-saved
  // draft so edits survive page reloads (Export is still how it becomes live).
  const syms = new Map<string, Work>();
  const LS_KEY = 'spin-together:symbol-draft:v1';

  function seedFromConfig(): void {
    syms.clear();
    for (const id of config.allSymbolIds) {
      const s = config.symbolsById.get(id);
      if (!s) continue;
      syms.set(id, {
        id,
        name: s.name,
        rarity: s.rarity,
        baseValue: s.baseValue,
        tags: [...s.tags],
        artRef: s.artRef,
        synergies: s.synergies,
        destroys: s.destroys,
        transforms: s.transforms,
        spawnRules: s.spawnRules,
        soundRef: s.soundRef,
        devNotes: s.devNotes ?? '',
      });
    }
  }

  const asStr = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
  const asNum = (v: unknown, d = 0): number => (typeof v === 'number' ? v : Number(v) || d);
  const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  function normWork(r: Record<string, unknown>): Work | null {
    const id = asStr(r.id);
    if (!id) return null;
    return {
      id,
      name: asStr(r.name, id),
      rarity: asStr(r.rarity, 'common'),
      baseValue: asNum(r.baseValue, 0),
      tags: asArr(r.tags).map((t) => asStr(t)).filter(Boolean),
      art: typeof r.art === 'string' ? r.art : undefined,
      artRef: asStr(r.artRef, `assets/symbols/${id}.png`),
      synergies: asArr(r.synergies),
      destroys: asArr(r.destroys),
      transforms: asArr(r.transforms),
      spawnRules: asArr(r.spawnRules),
      soundRef: asStr(r.soundRef),
      devNotes: asStr(r.devNotes),
    };
  }
  function persist(): void {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(Array.from(syms.values())));
    } catch {
      /* private mode / quota — draft just won't persist */
    }
  }
  function loadDraft(): boolean {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;
      const arr = JSON.parse(raw) as unknown;
      if (!Array.isArray(arr) || arr.length === 0) return false;
      syms.clear();
      for (const r of arr) {
        const w = normWork(r as Record<string, unknown>);
        if (w) syms.set(w.id, w);
      }
      return true;
    } catch {
      return false;
    }
  }

  seedFromConfig();
  const hasDraft = loadDraft();

  let packIdx = 0;
  let selTile: string | null = null;
  let editId: string | null = null; // id of the symbol being edited (null = new; id derives from name)

  const slug = (s: string): string =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const currentId = (): string => editId ?? slug(nameIn.value);

  // ---- static layout (built once so the form keeps focus/values when picking tiles) ----
  root.textContent = '';
  const wrap = el('div', 'dev');

  const head = el('header', 'dev__head');
  head.append(el('h1', 'dev__title', '🎛 Asset Picker & Symbol Builder'));
  const backLink = el('a', 'dev__back', '← back to game') as HTMLAnchorElement;
  backLink.href = base;
  head.append(backLink);
  wrap.append(head);

  // pack dropdown only (grid is the image picker)
  const packSel = el('select', 'dev__select') as HTMLSelectElement;
  manifest.packs.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = `${p.name} (${p.tiles.length})`;
    packSel.append(o);
  });
  const packField = el('label', 'dev__field');
  packField.append(el('span', 'dev__label', 'Kenney set'), packSel);
  wrap.append(packField);

  const gridEl = el('div', 'dev__grid');
  wrap.append(gridEl);

  // preview of the currently picked tile (sits above the form; empty = dashed hint, no broken img)
  const previewImg = imgEl('', 'dev__big');
  const previewEmpty = el('div', 'dev__previewempty', 'pick a tile');
  const previewRef = el('div', 'dev__ref', '');
  const previewMedia = el('div', 'dev__previewmedia');
  previewMedia.append(previewImg, previewEmpty);
  const preview = el('div', 'dev__preview');
  preview.append(previewMedia, previewRef);

  // ---- symbol form ----
  const form = el('div', 'dev__form');
  const nameIn = el('input', 'dev__in') as HTMLInputElement;
  nameIn.placeholder = 'Name (e.g. Odd Egg)';
  const idPreview = el('span', 'dev__idpreview', 'id: —'); // auto kebab-case id
  const rarSel = el('select', 'dev__in') as HTMLSelectElement;
  RARITIES.forEach((r) => {
    const o = document.createElement('option');
    o.value = r;
    o.textContent = r;
    rarSel.append(o);
  });
  const baseIn = el('input', 'dev__in') as HTMLInputElement;
  baseIn.type = 'number';
  baseIn.min = '0';
  // default base payout per rarity (data-driven); changing rarity snaps base to this
  const rarityBase = config.economy.rarityBaseValue;
  const baseForRarity = (r: string): number => Number(rarityBase[r as keyof typeof rarityBase]) || 1;
  baseIn.value = String(baseForRarity('common'));
  const tagsIn = el('input', 'dev__in dev__lc') as HTMLInputElement;
  tagsIn.placeholder = `tags, comma-sep (e.g. ${TAGS.slice(0, 3).join(', ')})`;
  tagsIn.setAttribute('autocapitalize', 'none');
  tagsIn.setAttribute('autocorrect', 'off');
  tagsIn.setAttribute('spellcheck', 'false');
  tagsIn.setAttribute('list', 'dev-taglist');
  const tagList = el('datalist') as HTMLDataListElement; // reuse existing tags
  tagList.id = 'dev-taglist';
  const refreshTagList = (): void => {
    const all = new Set<string>(TAGS as readonly string[]);
    for (const w of syms.values()) for (const t of w.tags) all.add(t);
    tagList.textContent = '';
    for (const t of Array.from(all).sort()) {
      const o = document.createElement('option');
      o.value = t;
      tagList.append(o);
    }
  };
  const notesIn = el('textarea', 'dev__in dev__notes') as HTMLTextAreaElement;
  notesIn.rows = 5;
  notesIn.placeholder = 'Notes — describe the mechanic in shorthand, I\'ll code it later. Use #tag and @id, e.g. "+1 to adjacent #plants; ×2 while @gemstone on board".';

  const addBtn = el('button', 'btn dev__btn', 'Save symbol');
  const newBtn = el('button', 'dev__link', '＋ New (clear form)');

  const nameField = field('name', nameIn, true);
  nameField.append(idPreview); // live auto-id under the name
  const tagsField = field('tags', tagsIn, true);
  tagsField.append(el('span', 'dev__fieldhint', 'lowercase · singular — e.g. food, animal, mineral'));
  form.append(
    nameField,
    field('rarity', rarSel),
    field('base value', baseIn),
    tagsField,
    field('notes (I\'ll code these later)', notesIn, true),
  );
  const formActions = el('div', 'dev__formActions');
  const formStatus = el('span', 'dev__status', ''); // "Editing …" indicator
  formActions.append(addBtn, newBtn, formStatus);

  // preview above the inputs so the form fields get full horizontal room
  wrap.append(preview, form, formActions, tagList);

  // ---- symbol list + export ----
  const listEl = el('div', 'dev__assigned');
  wrap.append(listEl);
  root.append(wrap);

  // transient save confirmation
  const toast = el('div', 'dev__toast');
  toast.setAttribute('role', 'status');
  root.append(toast);
  let toastT = 0;
  function flash(msg: string): void {
    toast.textContent = msg;
    toast.classList.add('dev__toast--show');
    clearTimeout(toastT);
    toastT = window.setTimeout(() => toast.classList.remove('dev__toast--show'), 1900);
  }
  function updateStatus(): void {
    formStatus.textContent = editId ? `editing “${syms.get(editId)?.name ?? editId}”` : 'new symbol';
  }

  function field(label: string, control: HTMLElement, wide = false): HTMLElement {
    const w = el('label', 'dev__field' + (wide ? ' dev__field--wide' : ''));
    w.append(el('span', 'dev__label', label), control);
    return w;
  }

  function selectTile(t: string | null): void {
    selTile = t;
    for (const b of Array.from(gridEl.children)) {
      b.classList.toggle('dev__tile--sel', b.getAttribute('data-tile') === t);
    }
    if (t) {
      previewImg.src = tileUrl(manifest.packs[packIdx].slug, t);
      previewImg.hidden = false;
      previewEmpty.hidden = true;
      previewRef.textContent = `${manifest.packs[packIdx].slug}/${t}`;
      previewRef.hidden = false;
    } else {
      previewImg.removeAttribute('src');
      previewImg.hidden = true;
      previewEmpty.hidden = false;
      previewRef.hidden = true; // the dashed "pick a tile" box already says it
    }
  }

  // map of picked art ("slug/tile") -> the symbol name using it, so the grid can flag used tiles
  function usedArt(): Map<string, string> {
    const m = new Map<string, string>();
    for (const w of syms.values()) if (w.art) m.set(w.art, w.name);
    return m;
  }

  // flag tiles already assigned to a symbol (✓ badge + tint) without rebuilding the grid
  function markUsed(): void {
    const used = usedArt();
    const slug = manifest.packs[packIdx].slug;
    for (const b of Array.from(gridEl.children) as HTMLElement[]) {
      const tile = b.getAttribute('data-tile') ?? '';
      const owner = used.get(`${slug}/${tile}`);
      b.classList.toggle('dev__tile--used', !!owner);
      b.title = owner ? `in use — ${owner}` : '';
      let badge = b.querySelector('.dev__usedbadge');
      if (owner && !badge) {
        badge = el('span', 'dev__usedbadge', '✓');
        b.append(badge);
      } else if (!owner && badge) {
        badge.remove();
      }
    }
  }

  function renderGrid(): void {
    gridEl.textContent = '';
    for (const t of manifest.packs[packIdx].tiles) {
      const b = el('button', 'dev__tile');
      b.setAttribute('data-tile', t);
      b.append(imgEl(tileUrl(manifest.packs[packIdx].slug, t), 'dev__thumb'));
      b.addEventListener('click', () => selectTile(t));
      gridEl.append(b);
    }
    markUsed();
    selectTile(null);
  }

  function loadForm(w: Work): void {
    editId = w.id;
    nameIn.value = w.name;
    rarSel.value = w.rarity;
    baseIn.value = String(w.baseValue);
    tagsIn.value = w.tags.join(', ');
    notesIn.value = w.devNotes;
    // reflect the symbol's own art selection in the picker (or clear it)
    if (w.art) {
      const [aslug, tile] = w.art.split('/');
      const idx = manifest.packs.findIndex((p) => p.slug === aslug);
      if (idx >= 0) {
        packIdx = idx;
        packSel.value = String(idx);
        renderGrid();
        selectTile(tile);
      }
    } else {
      selectTile(null);
    }
    updateIdPreview();
    updateStatus();
    nameIn.focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function updateIdPreview(): void {
    idPreview.textContent = `id: ${currentId() || '—'}`;
  }

  function renderList(): void {
    listEl.textContent = '';
    listEl.append(el('h2', 'dev__subtitle', `Symbols (${syms.size})`));
    listEl.append(el('div', 'dev__fieldhint', 'Auto-saved in this browser. Export the JSON to make it live in the game.'));
    for (const w of syms.values()) {
      const row = el('div', 'dev__arow');
      row.append(imgEl(artUrl(w), 'dev__thumb'));
      const meta = el('div', 'dev__ameta');
      meta.append(el('span', 'dev__aname', `${w.name}`), el('span', 'dev__aref', `${w.id} · ${w.rarity} · ${w.baseValue}g · [${w.tags.join(', ')}]${w.art ? ' · ' + w.art : ''}`));
      if (w.devNotes) meta.append(el('span', 'dev__anote', `📝 ${w.devNotes}`));
      row.append(meta);
      const edit = el('button', 'dev__rm', '✎');
      edit.title = 'edit';
      edit.addEventListener('click', () => loadForm(w));
      const rm = el('button', 'dev__rm', '✕');
      rm.title = 'remove';
      rm.addEventListener('click', () => {
        syms.delete(w.id);
        persist();
        markUsed(); // freed its art — update grid badges
        renderList();
      });
      row.append(edit, rm);
      listEl.append(row);
    }
    const actions = el('div', 'dev__listactions');
    const exp = el('button', 'btn dev__btn', 'Export symbol set JSON');
    exp.addEventListener('click', exportSet);
    const reset = el('button', 'dev__link', '↺ Reset to live data');
    reset.title = 'Discard the local draft and reload the symbols currently in the game';
    reset.addEventListener('click', () => {
      if (!confirm('Discard your local draft and reset to the symbols currently live in the game?')) return;
      try {
        localStorage.removeItem(LS_KEY);
      } catch {
        /* ignore */
      }
      seedFromConfig();
      refreshTagList();
      markUsed();
      clearForm();
      renderList();
      flash('Reset to live data');
    });
    actions.append(exp, reset);
    listEl.append(actions);
  }

  function addOrUpdate(): void {
    const name = nameIn.value.trim();
    const id = editId ?? slug(name);
    if (!name || !id) {
      nameIn.focus();
      return;
    }
    const existing = syms.get(id);
    const w: Work = existing ?? {
      id,
      name,
      rarity: 'common',
      baseValue: 1,
      tags: [],
      artRef: `assets/symbols/${id}.png`,
      synergies: [],
      destroys: [],
      transforms: [],
      spawnRules: [],
      soundRef: '',
      devNotes: '',
    };
    w.id = id;
    w.name = name;
    w.rarity = rarSel.value;
    w.baseValue = Number(baseIn.value) || 0;
    // tags: lowercase + de-duped, matching the roster convention (lowercase, singular)
    w.tags = [...new Set(tagsIn.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))];
    w.devNotes = notesIn.value.trim();
    if (selTile) w.art = `${manifest.packs[packIdx].slug}/${selTile}`;
    syms.set(id, w);
    persist(); // keep the draft across reloads
    refreshTagList();
    markUsed(); // this tile is now in use — flag it in the grid
    renderList();
    flash(`${existing ? 'Updated' : 'Saved'} “${name}” ✓  (${syms.size} symbols)`);
    clearForm(); // saved — reset to a blank "new symbol" so the next entry starts clean
  }

  function clearForm(): void {
    editId = null;
    nameIn.value = '';
    rarSel.value = 'common';
    baseIn.value = String(baseForRarity('common'));
    tagsIn.value = '';
    notesIn.value = '';
    selectTile(null);
    updateIdPreview();
    updateStatus();
    nameIn.focus();
  }

  function exportSet(): void {
    const symbols = Array.from(syms.values()).map((w) => ({
      id: w.id,
      name: w.name,
      rarity: w.rarity,
      baseValue: w.baseValue,
      tags: w.tags,
      synergies: w.synergies,
      destroys: w.destroys,
      transforms: w.transforms,
      spawnRules: w.spawnRules,
      artRef: w.art ? `assets/symbols/${w.id}.png` : w.artRef,
      soundRef: w.soundRef,
      devNotes: w.devNotes,
    }));
    const art: Record<string, string> = {};
    for (const w of syms.values()) if (w.art) art[w.id] = w.art;
    const blob = new Blob([JSON.stringify({ symbols, art }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'symbol-set.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  packSel.addEventListener('change', () => {
    packIdx = Number(packSel.value);
    renderGrid();
  });
  nameIn.addEventListener('input', updateIdPreview);
  rarSel.addEventListener('change', () => {
    // snap base value to the picked rarity's default (user can still override after)
    baseIn.value = String(baseForRarity(rarSel.value));
  });
  addBtn.addEventListener('click', addOrUpdate);
  newBtn.addEventListener('click', clearForm);

  refreshTagList();
  updateStatus();
  renderGrid();
  renderList();
  if (hasDraft) flash(`Restored your local draft (${syms.size} symbols)`);
}
