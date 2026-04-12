import { describe, it, expect } from 'vitest';
import {
  ADULT_COST_OF_LIVING_RATIO,
  UNEMPLOYED_MIN_YEARLY,
  computeCostOfLiving,
} from '../domain/costOfLiving';

describe('costOfLiving — 성인 기본 생활비 (v0.4.0)', () => {
  it('상수값: 비율 42%, 무직 최저 1,680만 (월 140만)', () => {
    expect(ADULT_COST_OF_LIVING_RATIO).toBeCloseTo(0.42, 5);
    expect(UNEMPLOYED_MIN_YEARLY).toBe(16_800_000);
  });

  it('19세 미만: 항상 0 (부모 부담)', () => {
    expect(computeCostOfLiving(10, 0)).toBe(0);
    expect(computeCostOfLiving(18, 5_000_000)).toBe(0);
    expect(computeCostOfLiving(18.99, 9_000_000)).toBe(0);
  });

  it('19세+ 직업 있음: 연봉의 42%, 단 최저선(1,680만) 클램프', () => {
    // 연봉 6천만 × 42% = 2520만 (최저선 초과)
    expect(computeCostOfLiving(25, 60_000_000)).toBe(25_200_000);
    // 연봉 1억 × 42% = 4200만
    expect(computeCostOfLiving(40, 100_000_000)).toBe(42_000_000);
  });

  it('19세+ 무직: 연 1,680만 최저액', () => {
    expect(computeCostOfLiving(20, 0)).toBe(16_800_000);
    expect(computeCostOfLiving(50, 0)).toBe(16_800_000);
  });

  it('저연봉이라 42%가 1,680만에 못 미치면 1,680만으로 클램프', () => {
    // 연봉 3천만 × 42% = 1260만 < 1680만 → 1680만
    expect(computeCostOfLiving(22, 30_000_000)).toBe(16_800_000);
  });

  it('경계: 19세 정확히는 성인 처리', () => {
    expect(computeCostOfLiving(19, 0)).toBe(16_800_000);
    // 연봉 5천만 × 42% = 2100만 (최저선 초과)
    expect(computeCostOfLiving(19, 50_000_000)).toBe(21_000_000);
  });
});
