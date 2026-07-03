import './styles.css';
import symbolsFile from '../data/symbols.json';
import itemsFile from '../data/items.json';
import economyFile from '../data/economy.json';
import type { SymbolsFile, ItemsFile, Economy } from './engine/types';
import { validateData } from './engine/validate';
import { makeConfig } from './engine/game';
import { mountApp } from './ui/app';

const symbols = symbolsFile as SymbolsFile;
const items = itemsFile as ItemsFile;
const economy = economyFile as unknown as Economy;

if (import.meta.env.DEV) {
  const errors = validateData(symbols, items);
  if (errors.length > 0) console.error(`[spin-together] data validation failed:\n- ${errors.join('\n- ')}`);
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app mount not found');

const config = makeConfig(symbols, economy);
// Seed: URL ?seed=N for reproducible runs, else a time-derived seed (UI only — engine stays pure).
const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');
const seed = seedParam != null ? Number(seedParam) >>> 0 : (Date.now() & 0xffffffff) >>> 0;

mountApp(app, config, seed);
