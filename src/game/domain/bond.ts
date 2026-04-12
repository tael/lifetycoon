import type { Bond } from '../types';

export type BondDef = {
  id: string;
  name: string;
  faceValue: number;
  couponRate: number;
  maturityYears: number;
};

export const BOND_LISTINGS: BondDef[] = [
  { id: 'short_bond',  name: '단기 국채 (3년)',  faceValue: 10_000_000, couponRate: 0.03, maturityYears: 3 },
  { id: 'mid_bond',   name: '중기 국채 (5년)',  faceValue: 10_000_000, couponRate: 0.04, maturityYears: 5 },
  { id: 'long_bond',  name: '장기 국채 (10년)', faceValue: 10_000_000, couponRate: 0.05, maturityYears: 10 },
];

/**
 * 매년 쿠폰 이자 지급 + 만기 도달 시 matured = true 설정
 * @returns { bonds: Bond[]; couponCash: number; principalCash: number }
 */
export function applyBondCoupon(
  bonds: Bond[],
  currentAge: number,
  deltaYears: number,
): { bonds: Bond[]; couponCash: number; principalCash: number } {
  let couponCash = 0;
  let principalCash = 0;

  const updated = bonds.map((b) => {
    if (b.matured) return b;

    const yearsSincePurchase = currentAge - b.purchasedAtAge;
    const coupon = Math.round(b.faceValue * b.couponRate * deltaYears);
    couponCash += coupon;

    if (yearsSincePurchase >= b.maturityYears) {
      principalCash += b.faceValue;
      return { ...b, matured: true };
    }
    return b;
  });

  return { bonds: updated, couponCash, principalCash };
}
