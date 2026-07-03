// CI data-integrity gate. Run via `npm run validate-data` (vite-node).
// Exits non-zero (loud) on any dangling reference / bad enum / out-of-range value.
import symbolsFile from '../data/symbols.json';
import itemsFile from '../data/items.json';
import { validateData } from '../src/engine/validate';
import type { SymbolsFile, ItemsFile } from '../src/engine/types';

const errors = validateData(symbolsFile as SymbolsFile, itemsFile as ItemsFile);

if (errors.length > 0) {
  console.error(`✗ data validation failed with ${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const count = (symbolsFile as SymbolsFile).symbols.length;
const itemCount = (itemsFile as ItemsFile).items.length;
console.log(`✓ data valid: ${count} symbols, ${itemCount} items`);
