import {
  ACQ_TAX_COMMERCIAL, ACQ_TAX_1ST_HOME, ACQ_TAX_2ND_HOME, ACQ_TAX_3RD_PLUS_HOME,
  CAP_GAINS_TAX_SHORT, CAP_GAINS_TAX_MID, CAP_GAINS_TAX_LONG_MULTI,
} from '../constants';

/**
 * 부동산 취득세 / 양도세 계산 모듈
 *
 * 취득세 (매수 시):
 *   1주택: 매입가 × 2%
 *   2주택: 매입가 × 8%
 *   3주택+: 매입가 × 12%
 *   상가: 매입가 × 4%
 *
 * 양도세 (매도 시):
 *   보유 2년 이상 + 1주택: 0% (비과세)
 *   보유 2년 이상 + 다주택: 차익 × 20%
 *   보유 1~2년: 차익 × 40%
 *   보유 1년 미만: 차익 × 70%
 */

/**
 * 취득세 계산
 * @param price 매입가
 * @param ownedCountAfter 매수 완료 후 총 보유 주택 수 (이미 +1 된 값)
 * @param isCommercial 상가 여부
 * @returns 취득세 금액 (정수, 원 단위)
 */
export function calculateAcquisitionTax(
  price: number,
  ownedCountAfter: number,
  isCommercial: boolean,
): number {
  if (price <= 0) return 0;
  let rate: number;
  if (isCommercial) {
    rate = ACQ_TAX_COMMERCIAL;
  } else if (ownedCountAfter === 1) {
    rate = ACQ_TAX_1ST_HOME;
  } else if (ownedCountAfter === 2) {
    rate = ACQ_TAX_2ND_HOME;
  } else {
    rate = ACQ_TAX_3RD_PLUS_HOME;
  }
  return Math.round(price * rate);
}

/**
 * 양도세 계산
 * @param sellPrice 매도가 (현재 시세)
 * @param buyPrice 매입가
 * @param yearsHeld 보유 연수 (소수 가능)
 * @param totalOwnedBeforeSell 매도 전 총 보유 부동산 수
 * @returns 양도세 금액 (정수, 원 단위). 차익이 없거나 음수이면 0.
 */
export function calculateCapitalGainsTax(
  sellPrice: number,
  buyPrice: number,
  yearsHeld: number,
  totalOwnedBeforeSell: number,
): number {
  const gain = sellPrice - buyPrice;
  if (gain <= 0) return 0;

  let rate: number;
  if (yearsHeld < 1) {
    rate = CAP_GAINS_TAX_SHORT;
  } else if (yearsHeld < 2) {
    rate = CAP_GAINS_TAX_MID;
  } else {
    // 2년 이상 보유
    if (totalOwnedBeforeSell === 1) {
      rate = 0; // 1주택 비과세
    } else {
      rate = CAP_GAINS_TAX_LONG_MULTI;
    }
  }
  return Math.round(gain * rate);
}
