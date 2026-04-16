import type { Holding, StockDef } from '../types';
import { gaussian } from '../engine/prng';

// Simulated GBM with discrete yearly steps (for simplicity)
// drift: annual expected return, volatility: annual stddev
export function nextPrice(
  prev: number,
  def: StockDef,
  rng: () => number,
  stepYears: number,
): number {
  const mu = def.drift * stepYears;
  const sigma = def.volatility * Math.sqrt(stepYears);
  const z = gaussian(rng);
  const change = mu + sigma * z;
  const next = prev * Math.exp(change);
  // Safety: NaN guard + floor at 1 (stocks can't go to zero, kids friendly)
  if (!Number.isFinite(next) || next <= 0) return Math.max(1, Math.round(prev));
  return Math.max(1, Math.round(next));
}

export function buyShares(
  cash: number,
  holdings: Holding[],
  ticker: string,
  price: number,
  sharesToBuy: number,
): { cash: number; holdings: Holding[]; executed: boolean } {
  const cost = price * sharesToBuy;
  if (cost > cash || sharesToBuy <= 0) {
    return { cash, holdings, executed: false };
  }
  const existing = holdings.find((h) => h.ticker === ticker);
  let newHoldings: Holding[];
  if (existing) {
    const totalShares = existing.shares + sharesToBuy;
    const newAvg =
      (existing.avgBuyPrice * existing.shares + price * sharesToBuy) /
      totalShares;
    newHoldings = holdings.map((h) =>
      h.ticker === ticker
        ? { ticker, shares: totalShares, avgBuyPrice: Math.round(newAvg) }
        : h,
    );
  } else {
    newHoldings = [...holdings, { ticker, shares: sharesToBuy, avgBuyPrice: price }];
  }
  return { cash: cash - cost, holdings: newHoldings, executed: true };
}

export function sellShares(
  cash: number,
  holdings: Holding[],
  ticker: string,
  price: number,
  sharesToSell: number,
): { cash: number; holdings: Holding[]; executed: boolean; profit: number } {
  const existing = holdings.find((h) => h.ticker === ticker);
  if (!existing || existing.shares < sharesToSell || sharesToSell <= 0) {
    return { cash, holdings, executed: false, profit: 0 };
  }
  const proceeds = price * sharesToSell;
  const profit = (price - existing.avgBuyPrice) * sharesToSell;
  const remaining = existing.shares - sharesToSell;
  const newHoldings =
    remaining === 0
      ? holdings.filter((h) => h.ticker !== ticker)
      : holdings.map((h) =>
          h.ticker === ticker ? { ...h, shares: remaining } : h,
        );
  return { cash: cash + proceeds, holdings: newHoldings, executed: true, profit };
}

export function shockPrice(price: number, multiplier: number): number {
  return Math.max(1, Math.round(price * multiplier));
}

export function holdingsValue(
  holdings: Holding[],
  prices: Record<string, number>,
): number {
  return holdings.reduce(
    (sum, h) => sum + (prices[h.ticker] ?? h.avgBuyPrice) * h.shares,
    0,
  );
}

/**
 * 주식 액면분할 판정 — 가격이 임계값 초과 시 분할 비율 반환.
 * 분할 없으면 1 반환.
 */
export function splitRatioFor(price: number, basePrice: number): number {
  // basePrice의 10배 초과 시 10:1 분할
  if (price >= basePrice * 10) return 10;
  // basePrice의 5배 초과 시 5:1 분할
  if (price >= basePrice * 5) return 5;
  // basePrice의 3배 초과 시 2:1 분할
  if (price >= basePrice * 3) return 2;
  return 1;
}
