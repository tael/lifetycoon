import { describe, it, expect } from 'vitest';
import { calculateIncomeTax, calculatePropertyTax } from '../engine/tax';

describe('calculateIncomeTax — V3-10 5단계 누진세', () => {
  it('소득 0 또는 음수: 세금 0', () => {
    expect(calculateIncomeTax(0)).toBe(0);
    expect(calculateIncomeTax(-100)).toBe(0);
  });

  it('1구간 0~1400만 6%: 1000만 → 60만', () => {
    expect(calculateIncomeTax(10_000_000)).toBe(600_000);
    expect(calculateIncomeTax(14_000_000)).toBe(840_000);
  });

  it('2구간 1400만~5000만 15%: 3000만 → 84만 + 1600만×15% = 324만', () => {
    expect(calculateIncomeTax(30_000_000)).toBe(840_000 + 16_000_000 * 0.15);
    // 5000만 경계: 84만 + 3600만×15% = 624만
    expect(calculateIncomeTax(50_000_000)).toBe(840_000 + 36_000_000 * 0.15);
  });

  it('3구간 5000만~8800만 24%: 7000만', () => {
    // 14M*6% + 36M*15% + 20M*24% = 840k + 5400k + 4800k = 11,040,000
    expect(calculateIncomeTax(70_000_000)).toBe(840_000 + 5_400_000 + 4_800_000);
  });

  it('4구간 8800만~1.5억 35%: 1.2억', () => {
    // 14M*6% + 36M*15% + 38M*24% + 32M*35% = 840k + 5400k + 9120k + 11200k
    expect(calculateIncomeTax(120_000_000)).toBe(840_000 + 5_400_000 + 9_120_000 + 11_200_000);
  });

  it('5구간 1.5억+ 42%: 2억', () => {
    // 14M*6% + 36M*15% + 38M*24% + 62M*35% + 50M*42%
    const expected = 840_000 + 5_400_000 + 9_120_000 + 21_700_000 + 21_000_000;
    expect(calculateIncomeTax(200_000_000)).toBe(expected);
  });

  it('구간 경계는 단조 증가 (소득이 늘면 세금도 절대 줄지 않는다)', () => {
    let prev = -1;
    for (const inc of [0, 1_000_000, 14_000_000, 14_000_001, 50_000_000, 50_000_001, 88_000_000, 88_000_001, 150_000_000, 150_000_001, 1_000_000_000]) {
      const t = calculateIncomeTax(inc);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });
});

describe('calculatePropertyTax', () => {
  it('부동산 가치 0이면 0', () => {
    expect(calculatePropertyTax(0)).toBe(0);
  });
  it('1억 → 30만 (0.3%)', () => {
    expect(calculatePropertyTax(100_000_000)).toBe(300_000);
  });
});
