import { describe, it, expect } from 'vitest';
import { applyChoice, type EffectContext } from '../scenario/scenarioEngine';
import type { Character, EventChoice, Holding, RealEstate } from '../types';

const baseCharacter: Character = {
  name: '테스트',
  age: 60,
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
    bank: { balance: 20_000_000, interestRate: 0.03, loanBalance: 5_000_000, loanInterestRate: 0.05 },
    holdings: [],
    prices: { DDUK: 1000 },
    job: null,
    jobs: [],
    traits: [],
    keyMoments: [],
    realEstate: [],
    warnings: [],
    ...overrides,
  };
}

const halveChoice: EventChoice = {
  label: '되돌린다',
  effects: [{ kind: 'halveWealth' }],
  importance: 1.0,
};

describe('halveWealth effect ("회상의 댓가")', () => {
  it('cash·bank·holdings·realEstate를 절반으로 줄인다', () => {
    const ctx = makeCtx({
      holdings: [{ ticker: 'DDUK', shares: 10, avgBuyPrice: 1000 }],
      realEstate: [{
        id: 'shop',
        name: '상가',
        purchasePrice: 10_000_000,
        currentValue: 10_000_000,
        monthlyRent: 100_000,
        purchasedAtAge: 40,
      }],
    });
    const next = applyChoice(ctx, halveChoice, 60);
    expect(next.cash).toBe(5_000_000);
    expect(next.bank.balance).toBe(10_000_000);
    expect(next.holdings[0].shares).toBe(5);
    expect(next.realEstate?.[0].currentValue).toBe(5_000_000);
  });

  it('대출 잔액은 절대 건드리지 않는다 (게임오버 트랩 방지)', () => {
    const ctx = makeCtx();
    const next = applyChoice(ctx, halveChoice, 60);
    expect(next.bank.loanBalance).toBe(5_000_000);
    expect(next.bank.interestRate).toBe(0.03);
    expect(next.bank.loanInterestRate).toBe(0.05);
  });

  it('홀수 shares는 내림되고 1주짜리는 제거된다', () => {
    const ctx = makeCtx({
      holdings: [
        { ticker: 'DDUK', shares: 5, avgBuyPrice: 1000 },
        { ticker: 'RAIN', shares: 1, avgBuyPrice: 2000 },
      ],
      prices: { DDUK: 1000, RAIN: 2000 },
    });
    const next = applyChoice(ctx, halveChoice, 60);
    // DDUK 5→2 (floor), RAIN 1→0 → 필터 제거
    expect(next.holdings.length).toBe(1);
    expect(next.holdings[0]).toMatchObject({ ticker: 'DDUK', shares: 2 });
  });

  it('realEstate 배열이 없어도 안전하게 동작한다', () => {
    const ctx = makeCtx({ realEstate: undefined });
    const next = applyChoice(ctx, halveChoice, 60);
    expect(next.cash).toBe(5_000_000);
    expect(next.realEstate).toEqual([]);
  });

  it('cash가 음수여도 절반 처리된다 (Math.floor 동작 확인)', () => {
    const ctx = makeCtx({ cash: -1_000_000 });
    const next = applyChoice(ctx, halveChoice, 60);
    // Math.floor(-1000000/2) = -500000
    expect(next.cash).toBe(-500_000);
  });
});
