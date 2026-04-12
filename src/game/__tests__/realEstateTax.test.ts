import { describe, it, expect } from 'vitest';
import { calculateAcquisitionTax, calculateCapitalGainsTax } from '../domain/realEstateTax';

describe('calculateAcquisitionTax — 취득세', () => {
  it('1주택: 매입가 × 2%', () => {
    expect(calculateAcquisitionTax(300_000_000, 1, false)).toBe(6_000_000);
  });

  it('2주택: 매입가 × 8%', () => {
    expect(calculateAcquisitionTax(300_000_000, 2, false)).toBe(24_000_000);
  });

  it('3주택+: 매입가 × 12%', () => {
    expect(calculateAcquisitionTax(300_000_000, 3, false)).toBe(36_000_000);
    expect(calculateAcquisitionTax(300_000_000, 4, false)).toBe(36_000_000);
  });

  it('상가: 매입가 × 4% (주택 수 무관)', () => {
    expect(calculateAcquisitionTax(500_000_000, 1, true)).toBe(20_000_000);
    expect(calculateAcquisitionTax(500_000_000, 3, true)).toBe(20_000_000);
  });

  it('매입가 0 또는 음수: 세금 0', () => {
    expect(calculateAcquisitionTax(0, 1, false)).toBe(0);
    expect(calculateAcquisitionTax(-1000, 1, false)).toBe(0);
  });
});

describe('calculateCapitalGainsTax — 양도세', () => {
  it('보유 2년 이상 + 1주택: 비과세 (0%)', () => {
    expect(calculateCapitalGainsTax(400_000_000, 300_000_000, 2, 1)).toBe(0);
    expect(calculateCapitalGainsTax(400_000_000, 300_000_000, 5, 1)).toBe(0);
  });

  it('보유 2년 이상 + 다주택: 차익 × 20%', () => {
    // 차익 1억, 세율 20% → 2000만
    expect(calculateCapitalGainsTax(400_000_000, 300_000_000, 2, 2)).toBe(20_000_000);
    expect(calculateCapitalGainsTax(400_000_000, 300_000_000, 3, 3)).toBe(20_000_000);
  });

  it('보유 1~2년: 차익 × 40%', () => {
    // 차익 1억, 세율 40% → 4000만
    expect(calculateCapitalGainsTax(400_000_000, 300_000_000, 1, 1)).toBe(40_000_000);
    expect(calculateCapitalGainsTax(400_000_000, 300_000_000, 1.9, 2)).toBe(40_000_000);
  });

  it('보유 1년 미만: 차익 × 70%', () => {
    // 차익 1억, 세율 70% → 7000만
    expect(calculateCapitalGainsTax(400_000_000, 300_000_000, 0.5, 1)).toBe(70_000_000);
    expect(calculateCapitalGainsTax(400_000_000, 300_000_000, 0, 1)).toBe(70_000_000);
  });

  it('차익이 없거나 손실이면 세금 0', () => {
    expect(calculateCapitalGainsTax(300_000_000, 300_000_000, 0.5, 1)).toBe(0);
    expect(calculateCapitalGainsTax(200_000_000, 300_000_000, 0.5, 1)).toBe(0);
  });
});
