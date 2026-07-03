// Phase 1: static placeholder HUD (no live values yet).
import type { Economy, BoardSize } from '../engine/types';

export function renderHud(mount: HTMLElement, economy: Economy, size: BoardSize): void {
  const rentD1 = Math.round(economy.rent.base * economy.rent.growth);
  mount.innerHTML = `
    <header class="hud">
      <h1 class="hud__title">Spin&#8288;-&#8288;Together</h1>
      <div class="hud__stats">
        <div class="stat"><span class="stat__label">Coffer</span><span class="stat__value">0</span></div>
        <div class="stat"><span class="stat__label">Rent (D1)</span><span class="stat__value">${rentD1}</span></div>
        <div class="stat"><span class="stat__label">Deadline</span><span class="stat__value">1 / ${economy.run.deadlines}</span></div>
        <div class="stat"><span class="stat__label">Board</span><span class="stat__value">${size.cols}&#215;${size.rows}</span></div>
      </div>
    </header>
  `;
}
