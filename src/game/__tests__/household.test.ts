import { describe, it, expect } from 'vitest';
import {
  ACADEMY_RATIO,
  HOUSEHOLD_ALLOWANCE_MONTHLY_BY_AGE,
  allowanceBracket,
  getMonthlyParentalAllowance,
  getYearlyParentalAllowance,
  householdLabel,
  pickRandomHouseholdClass,
  type HouseholdClass,
} from '../domain/household';

describe('household — 가정 형편 시스템 (v0.4.0 연령대별)', () => {
  it('월 용돈 테이블: 10~12/13~15/16~18 연령대별 3단계', () => {
    expect(HOUSEHOLD_ALLOWANCE_MONTHLY_BY_AGE.thrifty.early).toBe(400_000);
    expect(HOUSEHOLD_ALLOWANCE_MONTHLY_BY_AGE.thrifty.mid).toBe(500_000);
    expect(HOUSEHOLD_ALLOWANCE_MONTHLY_BY_AGE.thrifty.late).toBe(600_000);

    expect(HOUSEHOLD_ALLOWANCE_MONTHLY_BY_AGE.average.early).toBe(600_000);
    expect(HOUSEHOLD_ALLOWANCE_MONTHLY_BY_AGE.average.mid).toBe(750_000);
    expect(HOUSEHOLD_ALLOWANCE_MONTHLY_BY_AGE.average.late).toBe(900_000);

    expect(HOUSEHOLD_ALLOWANCE_MONTHLY_BY_AGE.affluent.early).toBe(800_000);
    expect(HOUSEHOLD_ALLOWANCE_MONTHLY_BY_AGE.affluent.mid).toBe(1_000_000);
    expect(HOUSEHOLD_ALLOWANCE_MONTHLY_BY_AGE.affluent.late).toBe(1_200_000);
  });

  it('학원비 비율은 용돈의 65%', () => {
    expect(ACADEMY_RATIO).toBeCloseTo(0.65, 5);
  });

  it('라벨은 한글 3종 (검소/평범/넉넉)', () => {
    expect(householdLabel('thrifty')).toBe('검소한 가정');
    expect(householdLabel('average')).toBe('평범한 가정');
    expect(householdLabel('affluent')).toBe('넉넉한 가정');
  });

  it('allowanceBracket: 연령대 분류', () => {
    expect(allowanceBracket(9)).toBeNull();
    expect(allowanceBracket(10)).toBe('early');
    expect(allowanceBracket(12)).toBe('early');
    expect(allowanceBracket(13)).toBe('mid');
    expect(allowanceBracket(15)).toBe('mid');
    expect(allowanceBracket(16)).toBe('late');
    expect(allowanceBracket(18)).toBe('late');
    expect(allowanceBracket(19)).toBeNull();
  });

  it('getMonthlyParentalAllowance: 형편·연령대별 월 용돈', () => {
    expect(getMonthlyParentalAllowance('average', 10)).toBe(600_000);
    expect(getMonthlyParentalAllowance('average', 14)).toBe(750_000);
    expect(getMonthlyParentalAllowance('average', 17)).toBe(900_000);
    expect(getMonthlyParentalAllowance('average', 19)).toBe(0);
    expect(getMonthlyParentalAllowance('thrifty', 12)).toBe(400_000);
    expect(getMonthlyParentalAllowance('affluent', 18)).toBe(1_200_000);
  });

  it('getYearlyParentalAllowance: 월 용돈 × 12', () => {
    expect(getYearlyParentalAllowance('average', 10)).toBe(7_200_000);
    expect(getYearlyParentalAllowance('affluent', 18)).toBe(14_400_000);
  });

  it('pickRandomHouseholdClass는 r<1/3=thrifty, <2/3=average, 그 외=affluent', () => {
    expect(pickRandomHouseholdClass(() => 0)).toBe('thrifty');
    expect(pickRandomHouseholdClass(() => 0.32)).toBe('thrifty');
    expect(pickRandomHouseholdClass(() => 0.34)).toBe('average');
    expect(pickRandomHouseholdClass(() => 0.66)).toBe('average');
    expect(pickRandomHouseholdClass(() => 0.68)).toBe('affluent');
    expect(pickRandomHouseholdClass(() => 0.99)).toBe('affluent');
  });

  it('V4: 9년 유년기 누적 부모 용돈 (검소=5400만, 평범=8100만, 넉넉=10800만)', () => {
    // 10~12 (3년) + 13~15 (3년) + 16~18 (3년)
    const accum = (cls: HouseholdClass): number => {
      let total = 0;
      for (let age = 10; age <= 18; age++) {
        total += getYearlyParentalAllowance(cls, age);
      }
      return total;
    };
    // thrifty: (400+500+600)만 × 3년 × 12 = 1500만 × 3 × 12 / 만 환산
    // 수동 계산: 400만 × 3 + 500만 × 3 + 600만 × 3 = 1200+1500+1800 = 4500만 월 환산 아님.
    // 월 400 × 12 × 3 = 1440만, 500 × 12 × 3 = 1800만, 600 × 12 × 3 = 2160만, 합 5400만.
    expect(accum('thrifty')).toBe(54_000_000);
    expect(accum('average')).toBe(81_000_000);
    expect(accum('affluent')).toBe(108_000_000);
  });

  it('대량 샘플에서 1/3 균등 분포에 가깝다', () => {
    const counts: Record<HouseholdClass, number> = { thrifty: 0, average: 0, affluent: 0 };
    let seed = 1;
    const lcg = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const N = 9000;
    for (let i = 0; i < N; i++) counts[pickRandomHouseholdClass(lcg)]++;
    for (const c of ['thrifty', 'average', 'affluent'] as const) {
      expect(counts[c]).toBeGreaterThan(N / 3 - N / 10);
      expect(counts[c]).toBeLessThan(N / 3 + N / 10);
    }
  });
});
