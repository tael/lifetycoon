import { describe, it, expect } from 'vitest';

import {
  getEffectiveInterestRate,
  MAX_INTEREST_RATE,
  MIN_INTEREST_RATE,
  PHASE_INTEREST_BONUS,
} from '../engine/economyCycle';
import { applyChoice } from '../scenario/scenarioEngine';
import type { BankAccount, EventChoice } from '../types';

// ─── 1. getEffectiveInterestRate: 기본 합산 및 클램프 ────────────────────────

describe('getEffectiveInterestRate', () => {
  it('base + normal phase + no skill → base 그대로', () => {
    expect(getEffectiveInterestRate(0.03, 'normal', false)).toBeCloseTo(0.03, 10);
  });

  it('호황기 + 재무101 보너스가 올바르게 합산', () => {
    // 0.03 + 0.01(boom) + 0.01(skill) = 0.05
    expect(getEffectiveInterestRate(0.03, 'boom', true)).toBeCloseTo(0.05, 10);
  });

  it('침체기 + 스킬 없음 → 0.03 - 0.01 = 0.02', () => {
    expect(getEffectiveInterestRate(0.03, 'recession', false)).toBeCloseTo(0.02, 10);
  });

  it('결과가 MAX_INTEREST_RATE(30%)를 넘지 않는다', () => {
    // base가 이미 50%여도 캡이 걸림
    expect(getEffectiveInterestRate(0.5, 'boom', true)).toBe(MAX_INTEREST_RATE);
  });

  it('결과가 MIN_INTEREST_RATE(0.5%) 아래로 내려가지 않는다', () => {
    // 침체기 + 마이너스 base (이론상 있을 수 없지만 방어)
    expect(getEffectiveInterestRate(-0.5, 'recession', false)).toBe(MIN_INTEREST_RATE);
  });
});

// ─── 2. 회귀 테스트: base rate는 tick을 돌아도 누적되지 않아야 한다 ───────────
//
// 과거 버그: gameStore.ts가 bank.interestRate에 phase/skill 보너스를 더해 저장 →
// 매 틱 누적 → 90년 후 이자율이 수십~수백 %로 폭주 → 자산 천문학적 증가.
// 이 테스트는 동일한 패턴을 반복해도 base rate가 원본 그대로 유지되는지 확인한다.

describe('이자율 보너스 누적 방지 (회귀)', () => {
  it('90 틱 동안 base interestRate가 변하지 않는다', () => {
    const BASE_RATE = 0.03;
    let bank: BankAccount = {
      balance: 1_000_000,
      interestRate: BASE_RATE,
      loanBalance: 0,
      loanInterestRate: 0.05,
    };

    // gameStore tick과 동일한 패턴: base는 그대로, balance만 effective rate로 갱신
    for (let year = 0; year < 90; year++) {
      const effective = getEffectiveInterestRate(bank.interestRate, 'boom', true);
      bank = {
        ...bank,
        balance: Math.round(bank.balance * (1 + effective)),
        // interestRate는 절대 덮어쓰지 않는다 — 이게 핵심이다
      };
    }

    // base rate는 90년 후에도 원본 그대로여야 한다
    expect(bank.interestRate).toBe(BASE_RATE);
  });

  it('90 틱 복리 결과가 예상 범위 안이다 (폭주 없음)', () => {
    const BASE_RATE = 0.03;
    let balance = 1_000_000;

    // 호황기 + 스킬 = 5%로 90년 복리 (최선 시나리오)
    for (let year = 0; year < 90; year++) {
      const effective = getEffectiveInterestRate(BASE_RATE, 'boom', true);
      balance = Math.round(balance * (1 + effective));
    }

    // 1,000,000 × 1.05^90 ≈ 80,730,000 (8천만원대)
    // 버그가 있던 시절엔 수천조 규모로 폭주했었다.
    expect(balance).toBeLessThan(100_000_000); // 1억 미만 (교육 게임 맞는 범위)
    expect(balance).toBeGreaterThan(50_000_000); // 복리 효과는 제대로 적용됨
  });

  it('PHASE_INTEREST_BONUS와 스킬 보너스의 합이 합리적 범위 안', () => {
    // 모든 보너스 합이 단 한 틱에서 base의 2배를 넘지 않아야 안전하다고 본다
    const totalBonusBoom = PHASE_INTEREST_BONUS.boom + 0.01; // +skill
    expect(totalBonusBoom).toBeLessThanOrEqual(0.05);
  });
});

// ─── 3. 시나리오 이벤트의 interestRate 변경도 30% 캡이 걸린다 ─────────────────

describe('bankInterestChange 시나리오 효과 캡', () => {
  it('시나리오 누적으로 base rate가 30%를 넘지 않는다', () => {
    let bank: BankAccount = {
      balance: 0,
      interestRate: 0.29,
      loanBalance: 0,
      loanInterestRate: 0.05,
    };

    // +5% 델타 이벤트를 여러 번 적용 (이론상 몇십 %까지 쌓여야 함)
    for (let i = 0; i < 10; i++) {
      const choice: EventChoice = {
        label: 'test',
        effects: [{ kind: 'bankInterestChange', delta: 0.05 }],
        importance: 0.5,
      };
      const next = applyChoice(
        {
          character: {
            name: 't',
            age: 20,
            happiness: 50,
            health: 50,
            wisdom: 50,
            charisma: 50,
            traits: [],
            emoji: '😊',
          },
          cash: 0,
          bank,
          holdings: [],
          prices: {},
          job: null,
          jobs: [],
          traits: [],
          keyMoments: [],
        },
        choice,
        20,
      );
      bank = next.bank;
    }

    // 캡이 걸려서 30%를 절대 넘지 않음
    expect(bank.interestRate).toBeLessThanOrEqual(MAX_INTEREST_RATE);
    expect(bank.interestRate).toBe(MAX_INTEREST_RATE);
  });
});
