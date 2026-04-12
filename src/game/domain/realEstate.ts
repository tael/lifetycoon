import type { RealEstate } from '../types';
import { randFloat } from '../engine/prng';

export type RealEstateDef = {
  id: string;
  name: string;
  price: number;
  monthlyRent: number;
};

export const REAL_ESTATE_LISTINGS: RealEstateDef[] = [
  { id: 'small_apt',  name: '소형 아파트', price: 300_000_000, monthlyRent: 0 },
  { id: 'commercial', name: '상가',         price: 500_000_000, monthlyRent: 3_000_000 },
  { id: 'large_apt',  name: '대형 아파트',  price: 1_000_000_000, monthlyRent: 0 },
  { id: 'studio',     name: '원룸',        price: 250_000_000, monthlyRent: 1_200_000 },
  { id: 'villa',      name: '빌라',        price: 450_000_000, monthlyRent: 2_500_000 },
  { id: 'office',     name: '오피스',      price: 800_000_000, monthlyRent: 2_800_000 },
  { id: 'mall',       name: '쇼핑몰',      price: 1_500_000_000, monthlyRent: 5_000_000 },
  { id: 'hotel',      name: '호텔',        price: 2_000_000_000, monthlyRent: 8_000_000 },
  { id: 'resort',     name: '리조트',      price: 3_000_000_000, monthlyRent: 10_000_000 },
  { id: 'factory',    name: '공장',        price: 2_500_000_000, monthlyRent: 7_000_000 },
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
