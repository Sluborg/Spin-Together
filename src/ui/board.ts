// Phase 1: render an empty responsive board. No spin/payout logic yet (Phase 2).
import type { BoardSize } from '../engine/types';

/** Pick the board size in effect after `deadlinesCleared` (largest matching threshold). */
export function boardSizeFor(growth: BoardSize[], deadlinesCleared: number): BoardSize {
  let current = growth[0];
  for (const g of growth) {
    if (deadlinesCleared >= g.afterDeadline) current = g;
  }
  return current;
}

export function renderBoard(mount: HTMLElement, size: BoardSize): void {
  mount.textContent = '';
  const board = document.createElement('div');
  board.className = 'board';
  board.style.setProperty('--cols', String(size.cols));
  board.style.setProperty('--rows', String(size.rows));
  board.setAttribute('role', 'grid');
  board.setAttribute('aria-label', `${size.cols} by ${size.rows} slot board`);

  for (let i = 0; i < size.cols * size.rows; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('role', 'gridcell');
    board.appendChild(cell);
  }
  mount.appendChild(board);
}
