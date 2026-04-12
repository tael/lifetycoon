/**
 * 세금 계산 모듈
 * - 소득세: 연 소득 구간별 누진세
 * - 재산세: 부동산 총가치의 0.3%
 */

/**
 * 소득세 계산 (연 소득 기준) — v0.3.0 V3-10 5단계 누진세
 *
 * 한국 종합소득세(2024)를 단순화한 5단계.
 * 0~1400만: 6%
 * 1400만~5000만: 15%
 * 5000만~8800만: 24%
 * 8800만~1억5천만: 35%
 * 1억5천만+: 42%
 *
 * v0.2 이전 면세 구간(0~1200만)은 폐지. 이제 1원이라도 소득이면 6%부터
 * 시작한다. 단 부모 용돈은 비과세이며 gameStore.advanceYear의
 * taxableIncome 산정에서 제외된다.
 */
export function calculateIncomeTax(yearlyIncome: number): number {
  if (yearlyIncome <= 0) return 0;

  const B1 = 14_000_000;   // 1400만
  const B2 = 50_000_000;   // 5000만
  const B3 = 88_000_000;   // 8800만
  const B4 = 150_000_000;  // 1억5000만

  if (yearlyIncome <= B1) {
    return Math.round(yearlyIncome * 0.06);
  }
  if (yearlyIncome <= B2) {
    return Math.round(B1 * 0.06 + (yearlyIncome - B1) * 0.15);
  }
  if (yearlyIncome <= B3) {
    return Math.round(
      B1 * 0.06 +
      (B2 - B1) * 0.15 +
      (yearlyIncome - B2) * 0.24,
    );
  }
  if (yearlyIncome <= B4) {
    return Math.round(
      B1 * 0.06 +
      (B2 - B1) * 0.15 +
      (B3 - B2) * 0.24 +
      (yearlyIncome - B3) * 0.35,
    );
  }
  return Math.round(
    B1 * 0.06 +
    (B2 - B1) * 0.15 +
    (B3 - B2) * 0.24 +
    (B4 - B3) * 0.35 +
    (yearlyIncome - B4) * 0.42,
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
