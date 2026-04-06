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

export function formatWon(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 100000000) return `${sign}${(abs / 100000000).toFixed(1)}억`;
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}만`;
  return `${sign}${abs.toLocaleString()}`;
}
