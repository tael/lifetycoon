import { describe, it, expect } from 'vitest';
import { computePensionYearly, PENSION_START_AGE } from '../domain/pension';

describe('computePensionYearly', () => {
  it('PENSION_START_AGE 미만에서는 0', () => {
    expect(computePensionYearly(64, 3, 1.68, 1)).toBe(0);
    expect(computePensionYearly(10, 1, 1, 1)).toBe(0);
    expect(computePensionYearly(PENSION_START_AGE - 1, 10, 2, 1)).toBe(0);
  });

  it('PENSION_START_AGE 정확히 65에서 지급 시작', () => {
    // 경력 1 (최소), inflation 1.0, delta 1 → 400,000
    expect(computePensionYearly(65, 1, 1, 1)).toBe(400_000);
  });

  it('경력 상한 5로 캡', () => {
    const six = computePensionYearly(65, 6, 1, 1); // 6이어도 5로 캡
    const five = computePensionYearly(65, 5, 1, 1);
    expect(six).toBe(five);
    expect(five).toBe(2_000_000); // 400k × 5
  });

  it('경력 0·음수 입력은 1로 올림', () => {
    expect(computePensionYearly(65, 0, 1, 1)).toBe(400_000);
    expect(computePensionYearly(65, -10, 1, 1)).toBe(400_000);
  });

  it('인플레이션 배수가 반영된다', () => {
    const base = computePensionYearly(65, 1, 1, 1);
    const inflated = computePensionYearly(65, 1, 1.5, 1);
    expect(inflated).toBe(Math.round(base * 1.5));
  });

  it('deltaYears가 2 이상이면 선형 비례', () => {
    const one = computePensionYearly(70, 3, 1.8, 1);
    const two = computePensionYearly(70, 3, 1.8, 2);
    expect(two).toBe(Math.round(one * 2));
  });
});
