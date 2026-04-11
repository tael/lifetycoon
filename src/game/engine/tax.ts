/**
 * 세금 계산 모듈
 * - 소득세: 연 소득 구간별 누진세
 * - 재산세: 부동산 총가치의 0.3%
 */

/**
 * 소득세 계산 (연 소득 기준)
 * 0~1200만: 0% (면세)
 * 1200~5000만: 6%
 * 5000만~1억: 15%
 * 1억+: 24%
 */
export function calculateIncomeTax(yearlyIncome: number): number {
  if (yearlyIncome <= 0) return 0;

  const BRACKET_1 = 12_000_000;  // 1200만
  const BRACKET_2 = 50_000_000;  // 5000만
  const BRACKET_3 = 100_000_000; // 1억

  if (yearlyIncome <= BRACKET_1) return 0;

  if (yearlyIncome <= BRACKET_2) {
    return Math.round((yearlyIncome - BRACKET_1) * 0.06);
  }

  if (yearlyIncome <= BRACKET_3) {
    return Math.round(
      (BRACKET_2 - BRACKET_1) * 0.06 +
      (yearlyIncome - BRACKET_2) * 0.15,
    );
  }

  return Math.round(
    (BRACKET_2 - BRACKET_1) * 0.06 +
    (BRACKET_3 - BRACKET_2) * 0.15 +
    (yearlyIncome - BRACKET_3) * 0.24,
  );
}

/**
 * 재산세 계산 (부동산 총가치 기준)
 * 부동산 총가치의 0.3%
 */
export function calculatePropertyTax(totalRealEstateValue: number): number {
  if (totalRealEstateValue <= 0) return 0;
  return Math.round(totalRealEstateValue * 0.003);
}
