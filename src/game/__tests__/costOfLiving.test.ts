import { describe, it, expect } from 'vitest';
import {
  ADULT_COST_OF_LIVING_RATIO,
  UNEMPLOYED_MIN_YEARLY,
  computeCostOfLiving,
} from '../domain/costOfLiving';

describe('costOfLiving — 성인 기본 생활비', () => {
  it('상수값: 비율 35%, 무직 최저 360만', () => {
    expect(ADULT_COST_OF_LIVING_RATIO).toBeCloseTo(0.35, 5);
    expect(UNEMPLOYED_MIN_YEARLY).toBe(3_600_000);
  });

  it('19세 미만: 항상 0 (부모 부담)', () => {
    expect(computeCostOfLiving(10, 0)).toBe(0);
    expect(computeCostOfLiving(18, 5_000_000)).toBe(0);
    expect(computeCostOfLiving(18.99, 9_000_000)).toBe(0);
  });

  it('V3-06: 19세+ 직업 있음 → 연봉의 35%', () => {
    expect(computeCostOfLiving(25, 30_000_000)).toBe(10_500_000);
    expect(computeCostOfLiving(40, 60_000_000)).toBe(21_000_000);
  });

  it('V3-07: 19세+ 무직 → 연 360만 최저액', () => {
    expect(computeCostOfLiving(20, 0)).toBe(3_600_000);
    expect(computeCostOfLiving(50, 0)).toBe(3_600_000);
  });

  it('V3-07: 저연봉이라 35%가 360만에 못 미치면 360만으로 클램프', () => {
    // 연봉 800만 × 35% = 280만 < 360만 → 360만
    expect(computeCostOfLiving(22, 8_000_000)).toBe(3_600_000);
  });

  it('경계: 19세 정확히는 성인 처리', () => {
    expect(computeCostOfLiving(19, 0)).toBe(3_600_000);
    expect(computeCostOfLiving(19, 20_000_000)).toBe(7_000_000);
  });
});
