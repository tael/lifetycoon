import { describe, it, expect } from 'vitest';
import {
  ACADEMY_RATIO,
  HOUSEHOLD_ALLOWANCE_YEARLY,
  householdLabel,
  pickRandomHouseholdClass,
  type HouseholdClass,
} from '../domain/household';

describe('household — 가정 형편 시스템', () => {
  it('연간 용돈 테이블이 검소 600만/평범 900만/넉넉 1200만으로 정의된다', () => {
    expect(HOUSEHOLD_ALLOWANCE_YEARLY.thrifty).toBe(6_000_000);
    expect(HOUSEHOLD_ALLOWANCE_YEARLY.average).toBe(9_000_000);
    expect(HOUSEHOLD_ALLOWANCE_YEARLY.affluent).toBe(12_000_000);
  });

  it('학원비 비율은 용돈의 65%', () => {
    expect(ACADEMY_RATIO).toBeCloseTo(0.65, 5);
  });

  it('라벨은 한글 3종 (검소/평범/넉넉)', () => {
    expect(householdLabel('thrifty')).toBe('검소한 가정');
    expect(householdLabel('average')).toBe('평범한 가정');
    expect(householdLabel('affluent')).toBe('넉넉한 가정');
  });

  it('pickRandomHouseholdClass는 r<1/3=thrifty, <2/3=average, 그 외=affluent', () => {
    expect(pickRandomHouseholdClass(() => 0)).toBe('thrifty');
    expect(pickRandomHouseholdClass(() => 0.32)).toBe('thrifty');
    expect(pickRandomHouseholdClass(() => 0.34)).toBe('average');
    expect(pickRandomHouseholdClass(() => 0.66)).toBe('average');
    expect(pickRandomHouseholdClass(() => 0.68)).toBe('affluent');
    expect(pickRandomHouseholdClass(() => 0.99)).toBe('affluent');
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
    // 각 분포가 대략 N/3 ± 10% 범위 안
    for (const c of ['thrifty', 'average', 'affluent'] as const) {
      expect(counts[c]).toBeGreaterThan(N / 3 - N / 10);
      expect(counts[c]).toBeLessThan(N / 3 + N / 10);
    }
  });
});
