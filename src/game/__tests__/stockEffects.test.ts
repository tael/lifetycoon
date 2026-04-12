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
    cash: 10_000_000,
    bank: { balance: 0, interestRate: 0.03, loanBalance: 0, loanInterestRate: 0.05 },
    holdings: [],
    prices: { SBE: 10_000, SKHM: 20_000 },
    job: null,
    jobs: [] as Job[],
    traits: [],
    keyMoments: [],
    realEstate: [],
    warnings: [],
    ...overrides,
  };
}

function choice(effects: EventChoice['effects']): EventChoice {
  return { label: '테스트', effects, importance: 0.5 };
}

describe('buyStock effect', () => {
  it('actually adds shares to holdings and deducts cash', () => {
    const ctx = makeCtx({ cash: 10_000_000 });
    const result = applyChoice(ctx, choice([{ kind: 'buyStock', ticker: 'SBE', shares: 20 }]), 30);
    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0]).toMatchObject({ ticker: 'SBE', shares: 20, avgBuyPrice: 10_000 });
    expect(result.cash).toBe(10_000_000 - 200_000);
    expect(result.warnings).toEqual([]);
  });

  it('merges with existing holding and recomputes average', () => {
    const existing: Holding = { ticker: 'SBE', shares: 10, avgBuyPrice: 8_000 };
    const ctx = makeCtx({ cash: 10_000_000, holdings: [existing] });
    const result = applyChoice(ctx, choice([{ kind: 'buyStock', ticker: 'SBE', shares: 10 }]), 30);
    // (8000*10 + 10000*10)/20 = 9000
    expect(result.holdings[0]).toMatchObject({ ticker: 'SBE', shares: 20, avgBuyPrice: 9_000 });
    expect(result.cash).toBe(10_000_000 - 100_000);
  });

  it('forces a loan (100만원 단위 올림) when cash is short but loan limit allows', () => {
    // cost = 20 * 10000 = 200,000. cash = 50,000. shortfall = 150,000 → loan 1,000,000 (올림).
    // totalAssets (cash 50k + bank 4M) = 4,050,000 → maxLoan = 2,025,000. 1M < 2,025,000 → OK.
    const ctx = makeCtx({
      cash: 50_000,
      bank: { balance: 4_000_000, interestRate: 0.03, loanBalance: 0, loanInterestRate: 0.05 },
    });
    const result = applyChoice(ctx, choice([{ kind: 'buyStock', ticker: 'SBE', shares: 20 }]), 30);
    expect(result.holdings[0]).toMatchObject({ ticker: 'SBE', shares: 20 });
    // cash flow: 50,000 + 1,000,000 loan - 200,000 cost = 850,000
    expect(result.cash).toBe(850_000);
    expect(result.bank.loanBalance).toBe(1_000_000);
    expect(result.warnings?.length).toBe(1);
    expect(result.warnings?.[0]).toMatch(/대출.*SBE 20주/);
  });

  it('rounds shortfall UP to next 100만원 loan unit', () => {
    // cost = 1 * 10000 = 10,000. cash = 0. shortfall 10,000 → loan 1,000,000 (올림).
    // totalAssets (cash 0 + bank 5M) = 5M → maxLoan = 2,500,000. 1M < 2.5M → OK.
    const ctx = makeCtx({
      cash: 0,
      bank: { balance: 5_000_000, interestRate: 0.03, loanBalance: 0, loanInterestRate: 0.05 },
    });
    const result = applyChoice(ctx, choice([{ kind: 'buyStock', ticker: 'SBE', shares: 1 }]), 30);
    expect(result.bank.loanBalance).toBe(1_000_000);
    expect(result.cash).toBe(990_000); // 0 + 1,000,000 loan - 10,000 cost
  });

  it('skips and emits warning when even max loan cannot cover the purchase', () => {
    // cost = 20 * 10000 = 200,000. cash = 0. bank = 100,000.
    // totalAssets = 100,000 → maxLoan = 50,000. shortfall 200,000 → loan unit 1,000,000.
    // remainingLimit 50,000 < 1,000,000 → skip.
    const ctx = makeCtx({
      cash: 0,
      bank: { balance: 100_000, interestRate: 0.03, loanBalance: 0, loanInterestRate: 0.05 },
    });
    const result = applyChoice(ctx, choice([{ kind: 'buyStock', ticker: 'SBE', shares: 20 }]), 30);
    expect(result.holdings).toHaveLength(0);
    expect(result.cash).toBe(0);
    expect(result.bank.loanBalance).toBe(0);
    expect(result.warnings?.[0]).toContain('한도 부족');
  });

  it('buys at pre-shock price when ordered before stockShock', () => {
    const ctx = makeCtx({ cash: 10_000_000 });
    const result = applyChoice(
      ctx,
      choice([
        { kind: 'buyStock', ticker: 'SBE', shares: 10 },
        { kind: 'stockShock', ticker: 'SBE', multiplier: 1.5 },
      ]),
      30,
    );
    // Buy at 10000, cost 100000. Then shock price to 15000.
    expect(result.cash).toBe(9_900_000);
    expect(result.holdings[0].avgBuyPrice).toBe(10_000);
    expect(result.prices.SBE).toBe(15_000);
  });
});

describe('sellStock effect', () => {
  it('removes shares and credits cash at current price', () => {
    const ctx = makeCtx({
      cash: 5_000_000,
      holdings: [{ ticker: 'SBE', shares: 30, avgBuyPrice: 8_000 }],
    });
    const result = applyChoice(ctx, choice([{ kind: 'sellStock', ticker: 'SBE', shares: 10 }]), 30);
    expect(result.holdings[0].shares).toBe(20);
    expect(result.cash).toBe(5_000_000 + 100_000);
    expect(result.warnings).toEqual([]);
  });

  it('removes holding entirely when selling all shares', () => {
    const ctx = makeCtx({
      cash: 0,
      holdings: [{ ticker: 'SBE', shares: 10, avgBuyPrice: 8_000 }],
    });
    const result = applyChoice(ctx, choice([{ kind: 'sellStock', ticker: 'SBE', shares: 10 }]), 30);
    expect(result.holdings).toHaveLength(0);
    expect(result.cash).toBe(100_000);
  });

  it('skips and emits warning when holdings are insufficient', () => {
    const ctx = makeCtx({ cash: 0, holdings: [] });
    const result = applyChoice(ctx, choice([{ kind: 'sellStock', ticker: 'SBE', shares: 10 }]), 30);
    expect(result.cash).toBe(0);
    expect(result.holdings).toHaveLength(0);
    expect(result.warnings?.length).toBe(1);
    expect(result.warnings?.[0]).toContain('SBE');
  });
});
