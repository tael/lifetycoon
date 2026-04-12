import type { BankAccount, Holding, RealEstate } from '../types';

export type LiquidationResult = {
  cashRecovered: number;
  bankWithdrawn: number;
  stocksSold: { ticker: string; shares: number; proceeds: number }[];
  realEstateSold: { id: string; proceeds: number }[];
  warnings: string[];
};

/**
 * 생활비 위기 시 자산 강제 매각 (V5-05).
 * 매각 순서: 예금 → 주식(시가 높은 것부터) → 부동산 급매(80%, 싼 것부터).
 * 부족분만큼만 매각하며 과매각하지 않는다.
 */
export function forcedLiquidation(
  deficit: number,           // 부족한 금액 (양수)
  _cash: number,             // 현재 현금 (참조용, 직접 수정 안 함)
  bank: BankAccount,
  holdings: Holding[],
  prices: Record<string, number>,
  realEstate: RealEstate[],
): LiquidationResult {
  let remaining = deficit;
  let bankWithdrawn = 0;
  const stocksSold: LiquidationResult['stocksSold'] = [];
  const realEstateSold: LiquidationResult['realEstateSold'] = [];
  const warnings: string[] = [];

  // 1단계: 예금 인출
  if (remaining > 0 && bank.balance > 0) {
    bankWithdrawn = Math.min(remaining, bank.balance);
    remaining -= bankWithdrawn;
  }

  // 2단계: 주식 매도 (시가 높은 것부터)
  if (remaining > 0 && holdings.length > 0) {
    const sorted = [...holdings]
      .map((h) => ({ h, value: (prices[h.ticker] ?? 0) * h.shares }))
      .filter(({ value }) => value > 0)
      .sort((a, b) => b.value - a.value);

    for (const { h, value } of sorted) {
      if (remaining <= 0) break;
      const price = prices[h.ticker] ?? 0;
      if (price <= 0) continue;

      if (value <= remaining) {
        // 전량 매도
        stocksSold.push({ ticker: h.ticker, shares: h.shares, proceeds: value });
        remaining -= value;
        warnings.push(`⚠️ 위기: ${h.ticker} 전량 강제 매도 (${Math.round(value / 10000)}만원)`);
      } else {
        // 필요한 만큼만 매도 (주식은 1주 단위)
        const sharesToSell = Math.ceil(remaining / price);
        const capped = Math.min(sharesToSell, h.shares);
        const proceeds = capped * price;
        stocksSold.push({ ticker: h.ticker, shares: capped, proceeds });
        remaining -= proceeds;
        warnings.push(`⚠️ 위기: ${h.ticker} ${capped}주 강제 매도 (${Math.round(proceeds / 10000)}만원)`);
      }
    }
  }

  // 3단계: 부동산 급매 (currentValue * 0.8, 가장 싼 것부터)
  if (remaining > 0 && realEstate.length > 0) {
    const sorted = [...realEstate].sort((a, b) => a.currentValue - b.currentValue);

    for (const re of sorted) {
      if (remaining <= 0) break;
      const proceeds = Math.round(re.currentValue * 0.8);
      realEstateSold.push({ id: re.id, proceeds });
      remaining -= proceeds;
      warnings.push(`⚠️ 위기: ${re.name} 급매 (${Math.round(proceeds / 10000)}만원, 시세의 80%)`);
    }
  }

  const cashRecovered = bankWithdrawn
    + stocksSold.reduce((s, x) => s + x.proceeds, 0)
    + realEstateSold.reduce((s, x) => s + x.proceeds, 0);

  return { cashRecovered, bankWithdrawn, stocksSold, realEstateSold, warnings };
}
