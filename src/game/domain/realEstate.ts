import type { RealEstate } from '../types';
import { randFloat } from '../engine/prng';

export type RealEstateDef = {
  id: string;
  name: string;
  price: number;
  monthlyRent: number;
};

export const REAL_ESTATE_LISTINGS: RealEstateDef[] = [
  { id: 'small_apt',  name: '소형 아파트', price: 30000000, monthlyRent: 0 },
  { id: 'commercial', name: '상가',         price: 50000000, monthlyRent: 300000 },
  { id: 'large_apt',  name: '대형 아파트',  price: 100000000, monthlyRent: 0 },
];

/** 연 3~5% 가치 상승 (PRNG 기반) */
export function appreciateValue(re: RealEstate, years: number, rng: () => number): RealEstate {
  const annualRate = randFloat(rng, 0.03, 0.05);
  const newValue = Math.round(re.currentValue * Math.pow(1 + annualRate, years));
  return { ...re, currentValue: newValue };
}

/** 매각 차익 계산 */
export function sellProfit(re: RealEstate): number {
  return re.currentValue - re.purchasePrice;
}
