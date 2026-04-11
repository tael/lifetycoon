import { describe, it, expect } from 'vitest';
import { applyChoice, type EffectContext } from '../scenario/scenarioEngine';
import type { Character, EventChoice, Job, Holding } from '../types';

const baseCharacter: Character = {
  name: '테스트',
  age: 30,
  happiness: 50,
  health: 50,
  wisdom: 50,
  charisma: 50,
  gender: 'male',
  traits: [],
  emoji: '🧑',
};

function makeCtx(overrides: Partial<EffectContext> = {}): EffectContext {
  return {
    character: baseCharacter,
    cash: 100000,
    bank: { balance: 0, interestRate: 0.03, loanBalance: 0, loanInterestRate: 0.08 },
    holdings: [],
    prices: { DDUK: 1000, RAIN: 2000 },
    job: null,
    jobs: [] as Job[],
    traits: [],
    keyMoments: [],
    warnings: [],
    ...overrides,
  };
}

function choice(effects: EventChoice['effects']): EventChoice {
  return { label: '테스트', effects, importance: 0.5 };
}

describe('buyStock effect', () => {
  it('actually adds shares to holdings and deducts cash', () => {
    const ctx = makeCtx({ cash: 100000 });
    const result = applyChoice(ctx, choice([{ kind: 'buyStock', ticker: 'DDUK', shares: 20 }]), 30);
    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0]).toMatchObject({ ticker: 'DDUK', shares: 20, avgBuyPrice: 1000 });
    expect(result.cash).toBe(100000 - 20000);
    expect(result.warnings).toEqual([]);
  });

  it('merges with existing holding and recomputes average', () => {
    const existing: Holding = { ticker: 'DDUK', shares: 10, avgBuyPrice: 800 };
    const ctx = makeCtx({ cash: 100000, holdings: [existing] });
    const result = applyChoice(ctx, choice([{ kind: 'buyStock', ticker: 'DDUK', shares: 10 }]), 30);
    // (800*10 + 1000*10)/20 = 900
    expect(result.holdings[0]).toMatchObject({ ticker: 'DDUK', shares: 20, avgBuyPrice: 900 });
    expect(result.cash).toBe(100000 - 10000);
  });

  it('skips and emits warning when cash is insufficient', () => {
    const ctx = makeCtx({ cash: 5000 });
    const result = applyChoice(ctx, choice([{ kind: 'buyStock', ticker: 'DDUK', shares: 20 }]), 30);
    expect(result.holdings).toHaveLength(0);
    expect(result.cash).toBe(5000);
    expect(result.warnings?.length).toBe(1);
    expect(result.warnings?.[0]).toContain('DDUK');
  });

  it('buys at pre-shock price when ordered before stockShock', () => {
    const ctx = makeCtx({ cash: 100000 });
    const result = applyChoice(
      ctx,
      choice([
        { kind: 'buyStock', ticker: 'DDUK', shares: 10 },
        { kind: 'stockShock', ticker: 'DDUK', multiplier: 1.5 },
      ]),
      30,
    );
    // Buy at 1000, cost 10000. Then shock price to 1500.
    expect(result.cash).toBe(90000);
    expect(result.holdings[0].avgBuyPrice).toBe(1000);
    expect(result.prices.DDUK).toBe(1500);
  });
});

describe('sellStock effect', () => {
  it('removes shares and credits cash at current price', () => {
    const ctx = makeCtx({
      cash: 50000,
      holdings: [{ ticker: 'DDUK', shares: 30, avgBuyPrice: 800 }],
    });
    const result = applyChoice(ctx, choice([{ kind: 'sellStock', ticker: 'DDUK', shares: 10 }]), 30);
    expect(result.holdings[0].shares).toBe(20);
    expect(result.cash).toBe(50000 + 10000);
    expect(result.warnings).toEqual([]);
  });

  it('removes holding entirely when selling all shares', () => {
    const ctx = makeCtx({
      cash: 0,
      holdings: [{ ticker: 'DDUK', shares: 10, avgBuyPrice: 800 }],
    });
    const result = applyChoice(ctx, choice([{ kind: 'sellStock', ticker: 'DDUK', shares: 10 }]), 30);
    expect(result.holdings).toHaveLength(0);
    expect(result.cash).toBe(10000);
  });

  it('skips and emits warning when holdings are insufficient', () => {
    const ctx = makeCtx({ cash: 0, holdings: [] });
    const result = applyChoice(ctx, choice([{ kind: 'sellStock', ticker: 'DDUK', shares: 10 }]), 30);
    expect(result.cash).toBe(0);
    expect(result.holdings).toHaveLength(0);
    expect(result.warnings?.length).toBe(1);
    expect(result.warnings?.[0]).toContain('DDUK');
  });
});
