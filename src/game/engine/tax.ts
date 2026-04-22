import {
  INCOME_TAX_BRACKET_1, INCOME_TAX_BRACKET_2, INCOME_TAX_BRACKET_3, INCOME_TAX_BRACKET_4,
  INCOME_TAX_RATE_1, INCOME_TAX_RATE_2, INCOME_TAX_RATE_3, INCOME_TAX_RATE_4, INCOME_TAX_RATE_5,
  PROPERTY_TAX_RATE,
} from '../constants';

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

  if (yearlyIncome <= INCOME_TAX_BRACKET_1) {
    return Math.round(yearlyIncome * INCOME_TAX_RATE_1);
  }
  if (yearlyIncome <= INCOME_TAX_BRACKET_2) {
    return Math.round(INCOME_TAX_BRACKET_1 * INCOME_TAX_RATE_1 + (yearlyIncome - INCOME_TAX_BRACKET_1) * INCOME_TAX_RATE_2);
  }
  if (yearlyIncome <= INCOME_TAX_BRACKET_3) {
    return Math.round(
      INCOME_TAX_BRACKET_1 * INCOME_TAX_RATE_1 +
      (INCOME_TAX_BRACKET_2 - INCOME_TAX_BRACKET_1) * INCOME_TAX_RATE_2 +
      (yearlyIncome - INCOME_TAX_BRACKET_2) * INCOME_TAX_RATE_3,
    );
  }
  if (yearlyIncome <= INCOME_TAX_BRACKET_4) {
    return Math.round(
      INCOME_TAX_BRACKET_1 * INCOME_TAX_RATE_1 +
      (INCOME_TAX_BRACKET_2 - INCOME_TAX_BRACKET_1) * INCOME_TAX_RATE_2 +
      (INCOME_TAX_BRACKET_3 - INCOME_TAX_BRACKET_2) * INCOME_TAX_RATE_3 +
      (yearlyIncome - INCOME_TAX_BRACKET_3) * INCOME_TAX_RATE_4,
    );
  }
  return Math.round(
    INCOME_TAX_BRACKET_1 * INCOME_TAX_RATE_1 +
    (INCOME_TAX_BRACKET_2 - INCOME_TAX_BRACKET_1) * INCOME_TAX_RATE_2 +
    (INCOME_TAX_BRACKET_3 - INCOME_TAX_BRACKET_2) * INCOME_TAX_RATE_3 +
    (INCOME_TAX_BRACKET_4 - INCOME_TAX_BRACKET_3) * INCOME_TAX_RATE_4 +
    (yearlyIncome - INCOME_TAX_BRACKET_4) * INCOME_TAX_RATE_5,
  );
}

/**
 * 재산세 계산 (부동산 총가치 기준)
 * 부동산 총가치의 0.3%
 */
export function calculatePropertyTax(totalRealEstateValue: number): number {
  if (totalRealEstateValue <= 0) return 0;
  return Math.round(totalRealEstateValue * PROPERTY_TAX_RATE);
}
