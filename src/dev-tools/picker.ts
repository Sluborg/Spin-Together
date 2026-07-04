// Dev-tools asset picker (open with ?dev=1). Browse the pre-filtered Kenney CC0 tiles by pack,
// pick images, assign them to symbols, and export the mapping. Not part of the game bundle.
import type { GameConfig } from '../engine/state';

interface Manifest {
  packs: { slug: string; name: string; tiles: string[] }[];
}

export async function mountPicker(root: HTMLElement, config: GameConfig): Promise<void> {
  const base = import.meta.env.BASE_URL;
  const manifest = (await fetch(`${base}dev-assets/manifest.json`).then((r) => r.json())) as Manifest;

  let packIdx = 0;
  let tile: string | null = null;
  const assignments: Record<string, string> = {}; // symbolId -> "slug/tile"

  const el = (tag: string, cls?: string, text?: string): HTMLElement => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const tileUrl = (slug: string, t: string): string => `${base}dev-assets/${slug}/${t}.png`;
  const img = (slug: string, t: string, cls: string): HTMLImageElement => {
    const i = document.createElement('img');
    i.className = cls;
    i.src = tileUrl(slug, t);
    i.alt = t;
    return i;
  };

  function download(name: string, text: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function render(): void {
    root.textContent = '';
    const pack = manifest.packs[packIdx];
    const wrap = el('div', 'dev');

    // Header
    const head = el('header', 'dev__head');
    head.append(el('h1', 'dev__title', '🎛 Asset Picker'));
    const backLink = el('a', 'dev__back', '← back to game') as HTMLAnchorElement;
    backLink.href = base;
    head.append(backLink);
    wrap.append(head);

    // Controls: two dropdowns — Kenney set + image
    const controls = el('div', 'dev__controls');
    const packSel = el('select', 'dev__select') as HTMLSelectElement;
    manifest.packs.forEach((p, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = `${p.name} (${p.tiles.length})`;
      if (i === packIdx) o.selected = true;
      packSel.append(o);
    });
    packSel.addEventListener('change', () => {
      packIdx = Number(packSel.value);
      tile = null;
      render();
    });

    const tileSel = el('select', 'dev__select') as HTMLSelectElement;
    const none = document.createElement('option');
    none.value = '';
    none.textContent = `image… (${pack.tiles.length})`;
    tileSel.append(none);
    pack.tiles.forEach((t) => {
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t;
      if (t === tile) o.selected = true;
      tileSel.append(o);
    });
    tileSel.addEventListener('change', () => {
      tile = tileSel.value || null;
      render();
    });

    controls.append(labelled('Kenney set', packSel), labelled('Image', tileSel));
    wrap.append(controls);

    // Visual grid of the filtered tiles (click to pick)
    const grid = el('div', 'dev__grid');
    pack.tiles.forEach((t) => {
      const b = el('button', 'dev__tile' + (t === tile ? ' dev__tile--sel' : ''));
      b.append(img(pack.slug, t, 'dev__thumb'));
      b.addEventListener('click', () => {
        tile = t;
        render();
      });
      grid.append(b);
    });
    wrap.append(grid);

    // Preview + assign
    const bottom = el('div', 'dev__bottom');
    const preview = el('div', 'dev__preview');
    if (tile) {
      preview.append(img(pack.slug, tile, 'dev__big'));
      preview.append(el('div', 'dev__ref', `${pack.slug}/${tile}`));
    } else {
      preview.append(el('div', 'dev__hint', 'Pick an image →'));
    }

    const assign = el('div', 'dev__assign');
    const symSel = el('select', 'dev__select') as HTMLSelectElement;
    config.allSymbolIds.forEach((id) => {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = `${config.symbolsById.get(id)?.name ?? id} (${id})`;
      symSel.append(o);
    });
    const assignBtn = el('button', 'btn dev__btn', 'Assign selected image →') as HTMLButtonElement;
    assignBtn.disabled = !tile;
    assignBtn.addEventListener('click', () => {
      if (!tile) return;
      assignments[symSel.value] = `${pack.slug}/${tile}`;
      render();
    });
    assign.append(labelled('Assign to symbol', symSel), assignBtn);

    bottom.append(preview, assign);
    wrap.append(bottom);

    // Current assignments + export
    const keys = Object.keys(assignments);
    if (keys.length) {
      const list = el('div', 'dev__assigned');
      list.append(el('h2', 'dev__subtitle', 'Assignments'));
      keys.forEach((id) => {
        const [slug, t] = assignments[id].split('/');
        const row = el('div', 'dev__arow');
        row.append(img(slug, t, 'dev__thumb'));
        row.append(el('span', 'dev__aname', `${config.symbolsById.get(id)?.name ?? id}`));
        row.append(el('span', 'dev__aref', assignments[id]));
        const rm = el('button', 'dev__rm', '✕');
        rm.addEventListener('click', () => {
          delete assignments[id];
          render();
        });
        row.append(rm);
        list.append(row);
      });
      const exp = el('button', 'btn dev__btn', 'Export assignments JSON');
      exp.addEventListener('click', () => download('symbol-art.json', JSON.stringify(assignments, null, 2)));
      list.append(exp);
      wrap.append(list);
    }

    root.append(wrap);
  }

  function labelled(label: string, control: HTMLElement): HTMLElement {
    const w = el('label', 'dev__field');
    w.append(el('span', 'dev__label', label), control);
    return w;
  }

  render();
}
