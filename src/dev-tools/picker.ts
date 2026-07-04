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

  // Working symbol set, seeded from the current game data (full fields preserved).
  const syms = new Map<string, Work>();
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

  let packIdx = 0;
  let selTile: string | null = null;

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

  // preview of the currently picked tile
  const previewImg = imgEl('', 'dev__big');
  const previewRef = el('div', 'dev__ref', '—');
  const preview = el('div', 'dev__preview');
  preview.append(previewImg, previewRef);

  // ---- symbol form ----
  const form = el('div', 'dev__form');
  const idIn = el('input', 'dev__in') as HTMLInputElement;
  idIn.placeholder = 'id (kebab-case)';
  const nameIn = el('input', 'dev__in') as HTMLInputElement;
  nameIn.placeholder = 'Name';
  const rarSel = el('select', 'dev__in') as HTMLSelectElement;
  RARITIES.forEach((r) => {
    const o = document.createElement('option');
    o.value = r;
    o.textContent = r;
    rarSel.append(o);
  });
  const baseIn = el('input', 'dev__in') as HTMLInputElement;
  baseIn.type = 'number';
  baseIn.value = '1';
  baseIn.min = '0';
  const tagsIn = el('input', 'dev__in') as HTMLInputElement;
  tagsIn.placeholder = `tags, comma-sep (e.g. ${TAGS.slice(0, 3).join(', ')})`;

  const addBtn = el('button', 'btn dev__btn', 'Add / update symbol');
  const newBtn = el('button', 'dev__link', '＋ new (clear form)');

  form.append(
    field('id', idIn),
    field('name', nameIn),
    field('rarity', rarSel),
    field('base value', baseIn),
    field('tags', tagsIn),
  );
  const formActions = el('div', 'dev__formActions');
  formActions.append(addBtn, newBtn);

  const bottom = el('div', 'dev__bottom');
  bottom.append(preview, form);
  wrap.append(bottom, formActions);

  // ---- symbol list + export ----
  const listEl = el('div', 'dev__assigned');
  wrap.append(listEl);
  root.append(wrap);

  function field(label: string, control: HTMLElement): HTMLElement {
    const w = el('label', 'dev__field');
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
      previewRef.textContent = `${manifest.packs[packIdx].slug}/${t}`;
    } else {
      previewImg.removeAttribute('src');
      previewRef.textContent = '—';
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
    selectTile(null);
  }

  function loadForm(w: Work): void {
    idIn.value = w.id;
    nameIn.value = w.name;
    rarSel.value = w.rarity;
    baseIn.value = String(w.baseValue);
    tagsIn.value = w.tags.join(', ');
  }

  function renderList(): void {
    listEl.textContent = '';
    listEl.append(el('h2', 'dev__subtitle', `Symbols (${syms.size})`));
    for (const w of syms.values()) {
      const row = el('div', 'dev__arow');
      row.append(imgEl(artUrl(w), 'dev__thumb'));
      const meta = el('div', 'dev__ameta');
      meta.append(el('span', 'dev__aname', `${w.name}`), el('span', 'dev__aref', `${w.id} · ${w.rarity} · ${w.baseValue}g · [${w.tags.join(', ')}]${w.art ? ' · ' + w.art : ''}`));
      row.append(meta);
      const edit = el('button', 'dev__rm', '✎');
      edit.title = 'edit';
      edit.addEventListener('click', () => loadForm(w));
      const rm = el('button', 'dev__rm', '✕');
      rm.title = 'remove';
      rm.addEventListener('click', () => {
        syms.delete(w.id);
        renderList();
      });
      row.append(edit, rm);
      listEl.append(row);
    }
    const exp = el('button', 'btn dev__btn', 'Export symbol set JSON');
    exp.addEventListener('click', exportSet);
    listEl.append(exp);
  }

  function addOrUpdate(): void {
    const id = idIn.value.trim();
    if (!id) {
      idIn.focus();
      return;
    }
    const existing = syms.get(id);
    const w: Work = existing ?? {
      id,
      name: id,
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
    w.name = nameIn.value.trim() || id;
    w.rarity = rarSel.value;
    w.baseValue = Number(baseIn.value) || 0;
    w.tags = tagsIn.value.split(',').map((t) => t.trim()).filter(Boolean);
    if (selTile) w.art = `${manifest.packs[packIdx].slug}/${selTile}`;
    syms.set(id, w);
    renderList();
  }

  function clearForm(): void {
    idIn.value = '';
    nameIn.value = '';
    rarSel.value = 'common';
    baseIn.value = '1';
    tagsIn.value = '';
    selectTile(null);
    idIn.focus();
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
  addBtn.addEventListener('click', addOrUpdate);
  newBtn.addEventListener('click', clearForm);

  renderGrid();
  renderList();
}
