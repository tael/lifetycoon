import { describe, it, expect } from 'vitest';
import {
  FILIAL_MULTIPLIER,
  REPAYMENT_DURATION,
  REPAYMENT_END_AGE,
  REPAYMENT_START_AGE,
  computeParentalRepaymentBase,
  parentalRepaymentForAge,
} from '../domain/parentalRepayment';

describe('parentalRepayment — 부모님 용돈 되돌림', () => {
  it('상수: 20~60세, 40년 균등 상환, 효 배수 1.5', () => {
    expect(REPAYMENT_START_AGE).toBe(20);
    expect(REPAYMENT_END_AGE).toBe(60);
    expect(REPAYMENT_DURATION).toBe(40);
    expect(FILIAL_MULTIPLIER).toBeCloseTo(1.5, 5);
  });

  it('parentalInvestment 0이면 base 0', () => {
    expect(computeParentalRepaymentBase(0, 1)).toBe(0);
    expect(computeParentalRepaymentBase(-100, 1)).toBe(0);
  });

  it('V3-09 검소: 5400만 × 1.5 / 40 = 202만5000', () => {
    expect(computeParentalRepaymentBase(54_000_000, 1)).toBe(2_025_000);
  });

  it('V3-09 평범: 8100만 × 1.5 / 40 = 303만7500', () => {
    expect(computeParentalRepaymentBase(81_000_000, 1)).toBe(3_037_500);
  });

  it('V3-09 넉넉: 1억800만 × 1.5 / 40 = 405만', () => {
    expect(computeParentalRepaymentBase(108_000_000, 1)).toBe(4_050_000);
  });

  it('인플레 배수가 곱해진다', () => {
    // 평범 가정 + 인플레 1.0 → 303만7500
    // 인플레 1.2 → ×1.2 = 364만5000
    expect(computeParentalRepaymentBase(81_000_000, 1.2)).toBe(3_645_000);
  });

  it('parentalRepaymentForAge: 20~59세에만 base, 그 외는 0', () => {
    const base = 3_037_500;
    expect(parentalRepaymentForAge(19, base)).toBe(0);
    expect(parentalRepaymentForAge(20, base)).toBe(base);
    expect(parentalRepaymentForAge(40, base)).toBe(base);
    expect(parentalRepaymentForAge(59, base)).toBe(base);
    expect(parentalRepaymentForAge(60, base)).toBe(0);
    expect(parentalRepaymentForAge(70, base)).toBe(0);
  });
});
