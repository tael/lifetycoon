import type { BankAccount, Holding } from '../types';
import { holdingsValue } from './stock';

export function totalAssets(
  cash: number,
  bank: BankAccount,
  holdings: Holding[],
  prices: Record<string, number>,
): number {
  return cash + bank.balance + holdingsValue(holdings, prices);
}

/**
 * 한국식 금액 포맷.
 * - 1조 이상: "X.Y조원"
 * - 1억 이상: "X.Y억원"
 * - 1만 이상: "X.Y만원"
 * - 1만 미만: toLocaleString (원 단위)
 * 소수점 첫째 자리 반올림. 음수 처리. ".0" 은 제거.
 */
export function formatWon(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) {
    const v = (abs / 1_000_000_000_000).toFixed(1);
    return `${sign}${v.endsWith('.0') ? v.slice(0, -2) : v}조원`;
  }
  if (abs >= 100_000_000) {
    const v = (abs / 100_000_000).toFixed(1);
    return `${sign}${v.endsWith('.0') ? v.slice(0, -2) : v}억원`;
  }
  if (abs >= 10_000) {
    const v = (abs / 10_000).toFixed(1);
    return `${sign}${v.endsWith('.0') ? v.slice(0, -2) : v}만원`;
  }
  return `${sign}${abs.toLocaleString()}원`;
}

/** formatWon의 별칭 — 한국식 만/억/조 포맷 */
export const formatKoreanWon = formatWon;
