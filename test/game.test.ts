import { describe, it, expect } from 'vitest';
import { createGame, makeConfig, spin, resolveDrafts } from '../src/engine/game';
import type { GameState, GameConfig } from '../src/engine/state';
import type { SymbolsFile, Economy } from '../src/engine/types';
import realSymbols from '../data/symbols.json';
import realEconomy from '../data/economy.json';

const config = makeConfig(realSymbols as SymbolsFile, realEconomy as unknown as Economy);

/** Play one full round (spin → resolve both drafts) with fixed choices. */
function round(s: GameState, c: GameConfig, own: number | null, shared: number | null): GameState {
  return resolveDrafts(spin(s, c), c, own, shared);
}

describe('game loop', () => {
  it('advances phases spin → draft → ready, offering both draws', () => {
    let s = createGame(1, config);
    expect(s.phase).toBe('ready');
    s = spin(s, config);
    expect(s.phase).toBe('draft');
    expect(s.ownOffer).toHaveLength(3);
    expect(s.sharedOffer).toHaveLength(3);
    s = resolveDrafts(s, config, 0, 0);
    expect(['ready', 'won', 'lost']).toContain(s.phase);
  });

  it('is fully deterministic: same seed + same intents → identical state', () => {
    const play = () => {
      let s = createGame(12345, config);
      for (let i = 0; i < 10 && s.phase === 'ready'; i++) {
        s = round(s, config, 0, 0);
      }
      return s;
    };
    expect(play()).toEqual(play());
  });

  it('banks payouts into the coffer on each spin', () => {
    let s = createGame(2, config);
    const before = s.coffer;
    s = spin(s, config);
    expect(s.coffer).toBeGreaterThanOrEqual(before);
    expect(s.lastSpin).not.toBeNull();
  });

  it('property: own ≤ shared + maxGap after every transition (always draft own, skip shared)', () => {
    const maxGap = (realEconomy as unknown as Economy).guardrail.maxGap;
    let s = createGame(7, config);
    for (let i = 0; i < 40; i++) {
      if (s.phase !== 'ready') break;
      s = round(s, config, 0, null); // draft own, skip shared → pushes the gap up
      expect(s.ownPool.length - s.sharedPool.length).toBeLessThanOrEqual(maxGap);
    }
    // the cap must have actually engaged at some point
    expect(s.ownPool.length - s.sharedPool.length).toBe(maxGap);
  });
});

// A tiny hand-built economy to force deterministic win/lose without long runs.
function miniConfig(rentBase: number): GameConfig {
  const symbols: SymbolsFile = {
    $schemaVersion: 1,
    symbols: [
      { id: 'gem', name: 'Gem', rarity: 'common', baseValue: 100, tags: [], synergies: [], destroys: [], transforms: [], spawnRules: [], artRef: '', soundRef: '' },
    ],
  };
  const economy = {
    version: 1,
    run: { deadlines: 1, spinsPerDeadline: [1] },
    rent: { model: 'base*growth^d', base: rentBase, growth: 1, growthPerDeadline: null },
    boardGrowth: [{ afterDeadline: 0, cols: 2, rows: 2 }],
    guardrail: { maxGap: 5, softRampStart: 3, dilutionPerGap: 0.15 },
    draft: { cardsOffered: 1, rarityWeights: { common: 1, uncommon: 1, rare: 1, 'very-rare': 1, special: 1 } },
    starter: { own: ['gem'], shared: ['gem'] },
  } as unknown as Economy;
  return makeConfig(symbols, economy);
}

describe('deadline resolution', () => {
  it('wins when the coffer covers rent at the final deadline', () => {
    const c = miniConfig(50); // 2 gems * 100 = 200 banked >= 50
    const s = resolveDrafts(spin(createGame(1, c), c), c, null, null);
    expect(s.phase).toBe('won');
  });

  it('loses when the coffer cannot cover rent', () => {
    const c = miniConfig(10_000); // way more than 200
    const s = resolveDrafts(spin(createGame(1, c), c), c, null, null);
    expect(s.phase).toBe('lost');
  });
});
