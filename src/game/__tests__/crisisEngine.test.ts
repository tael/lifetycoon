import { describe, it, expect } from 'vitest';
import { computeCrisisLevel, type CrisisInput } from '../domain/crisisEngine';

describe('computeCrisisLevel', () => {
  it('safe: 흑자 상태 → safe', () => {
    const input: CrisisInput = {
      netCashflow: 100_000,
      monthlyExpense: 1_000_000,
      totalAssets: 5_000_000,
      cash: 2_000_000,
    };
    expect(computeCrisisLevel(input)).toBe('safe');
  });

  it('safe: 손익 분기(netCashflow=0) → safe', () => {
    const input: CrisisInput = {
      netCashflow: 0,
      monthlyExpense: 1_000_000,
      totalAssets: 1_000_000,
      cash: 500_000,
    };
    expect(computeCrisisLevel(input)).toBe('safe');
  });

  it('yellow: 적자지만 자산 풍부(6개월치 이상) → yellow', () => {
    const input: CrisisInput = {
      netCashflow: -100_000,
      monthlyExpense: 1_000_000,
      totalAssets: 6_000_000,
      cash: 1_000_000,
    };
    expect(computeCrisisLevel(input)).toBe('yellow');
  });

  it('orange: 적자 + 자산 부족(6개월치 미만) → orange', () => {
    const input: CrisisInput = {
      netCashflow: -100_000,
      monthlyExpense: 1_000_000,
      totalAssets: 5_999_999,
      cash: 500_000,
    };
    expect(computeCrisisLevel(input)).toBe('orange');
  });

  it('red: 현금 음수 + 자산 거의 없음 → red', () => {
    const input: CrisisInput = {
      netCashflow: -500_000,
      monthlyExpense: 1_000_000,
      totalAssets: 2_999_999,
      cash: -1_100_000,
    };
    expect(computeCrisisLevel(input)).toBe('red');
  });

  it('경계값: totalAssets === monthlyExpense * 6 → yellow', () => {
    const input: CrisisInput = {
      netCashflow: -1,
      monthlyExpense: 1_000_000,
      totalAssets: 6_000_000,
      cash: 1_000_000,
    };
    expect(computeCrisisLevel(input)).toBe('yellow');
  });

  it('경계값: totalAssets === monthlyExpense * 6 - 1 → orange', () => {
    const input: CrisisInput = {
      netCashflow: -1,
      monthlyExpense: 1_000_000,
      totalAssets: 5_999_999,
      cash: 1_000_000,
    };
    expect(computeCrisisLevel(input)).toBe('orange');
  });
});
