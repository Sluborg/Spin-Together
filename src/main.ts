import './styles.css';
import symbolsFile from '../data/symbols.json';
import itemsFile from '../data/items.json';
import economyFile from '../data/economy.json';
import type { SymbolsFile, ItemsFile, Economy } from './engine/types';
import { validateData } from './engine/validate';
import { boardSizeFor, renderBoard } from './ui/board';
import { renderHud } from './ui/hud';

const symbols = symbolsFile as SymbolsFile;
const items = itemsFile as ItemsFile;
const economy = economyFile as unknown as Economy;

// Dev-only integrity check: fail loud in the console if data drifted out of schema.
if (import.meta.env.DEV) {
  const errors = validateData(symbols, items);
  if (errors.length > 0) {
    console.error(`[spin-together] data validation failed:\n- ${errors.join('\n- ')}`);
  }
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app mount not found');

const size = boardSizeFor(economy.boardGrowth, 0);

const hudMount = document.createElement('div');
const boardMount = document.createElement('main');
boardMount.className = 'board-area';
app.append(hudMount, boardMount);

renderHud(hudMount, economy, size);
renderBoard(boardMount, size);

const footer = document.createElement('footer');
footer.className = 'footer';
footer.textContent = `Phase 1 scaffold — ${symbols.symbols.length} symbols loaded. Spin coming in Phase 2.`;
app.append(footer);
