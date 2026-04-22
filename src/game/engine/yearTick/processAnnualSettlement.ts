import type { Holding, StockDef } from '../../types';
import type { YearTickState, YearTickContext, AgeAndDecayResult, MonthlyLoopResult, AnnualSettlementResult } from './types';
import { nextPrice, splitRatioFor } from '../../domain/stock';
import { appreciateValue } from '../../domain/realEstate';
import { applyBondCoupon } from '../../domain/bond';
import { stepNpc } from '../../domain/npc';
import { calculateIncomeTax, calculatePropertyTax } from '../tax';
import {
  DIVIDEND_GROWTH_BASE,
  DIVIDEND_GROWTH_BOOM,
  DIVIDEND_GROWTH_RECESSION,
  AUTO_INVEST_RATIO,
  AUTO_SAVE_RATIO,
} from '../../constants';

export function processAnnualSettlement(
  st: YearTickState,
  intAge: number,
  deltaYears: number,
  ageResult: AgeAndDecayResult,
  monthlyResult: MonthlyLoopResult,
  ctx: YearTickContext,
): AnnualSettlementResult {
  const { driftBonus, statPenalty, economyCycle } = ageResult;

  // 4) Stock price drift — 연 1회
  const prices: Record<string, number> = { ...st.prices };
  const driftAdj = driftBonus + statPenalty.returnMult;
  const splitEvents: { ticker: string; name: string; ratio: number }[] = [];
  for (const s of ctx.stocks) {
    const adjustedStock = driftAdj !== 0
      ? { ...s, drift: s.drift + driftAdj }
      : s;
    const newPrice = nextPrice(prices[s.ticker], adjustedStock, ctx.streams.stock, deltaYears);
    const splitRatio = splitRatioFor(newPrice, s.basePrice);
    if (splitRatio > 1) {
      prices[s.ticker] = Math.round(newPrice / splitRatio);
      splitEvents.push({ ticker: s.ticker, name: s.name, ratio: splitRatio });
    } else {
      prices[s.ticker] = newPrice;
    }
  }
  // 보유 주식 분할 반영
  let holdings = monthlyResult.holdings;
  for (const ev of splitEvents) {
    holdings = holdings.map((h) =>
      h.ticker === ev.ticker
        ? {
            ...h,
            shares: h.shares * ev.ratio,
            avgBuyPrice: Math.round(h.avgBuyPrice / ev.ratio),
          }
        : h,
    );
  }

  // 4b) 배당성장 — 연 1회
  const divGrowthBonus = economyCycle.phase === 'boom' ? DIVIDEND_GROWTH_BOOM : economyCycle.phase === 'recession' ? DIVIDEND_GROWTH_RECESSION : 0;
  const updatedDividendRates: Record<string, number> = { ...st.dividendRates };
  for (const s of ctx.stocks) {
    if (s.dividendRate <= 0) continue;
    const currentRate = updatedDividendRates[s.ticker] ?? s.dividendRate;
    const growth = 1 + DIVIDEND_GROWTH_BASE + divGrowthBonus;
    updatedDividendRates[s.ticker] = Math.min(currentRate * growth, s.dividendRate * 3);
  }

  // 5) NPC step — 연 1회
  const playerStocksVal = holdings.reduce((s, h) => s + (prices[h.ticker] ?? 0) * h.shares, 0);
  const playerAssets = monthlyResult.cash + monthlyResult.bankBalance + playerStocksVal + st.realEstate.reduce((s, re) => s + re.currentValue, 0) + st.bonds.reduce((s, b) => s + b.faceValue, 0);
  const npcs = st.npcs.map((n) => stepNpc(n, intAge, ctx.streams.npc, playerAssets));

  // 5b) Auto-invest — 연 1회
  let autoInvestSpent = 0;
  let autoHoldings = holdings;
  if (st.autoInvest && monthlyResult.totalSalaryIncome > 0) {
    const budget = Math.round(monthlyResult.totalSalaryIncome * AUTO_INVEST_RATIO);
    const affordable = ctx.stocks.filter((s: StockDef) => prices[s.ticker] <= budget);
    if (affordable.length > 0) {
      const pick = affordable[Math.floor(ctx.streams.misc() * affordable.length)];
      const shares = Math.max(1, Math.floor(budget / prices[pick.ticker]));
      const cost = shares * prices[pick.ticker];
      autoInvestSpent = cost;
      const existing = autoHoldings.find((h: Holding) => h.ticker === pick.ticker);
      if (existing) {
        const total = existing.shares + shares;
        const avg = Math.round((existing.avgBuyPrice * existing.shares + prices[pick.ticker] * shares) / total);
        autoHoldings = autoHoldings.map((h: Holding) =>
          h.ticker === pick.ticker ? { ticker: pick.ticker, shares: total, avgBuyPrice: avg } : h,
        );
      } else {
        autoHoldings = [...autoHoldings, { ticker: pick.ticker, shares, avgBuyPrice: prices[pick.ticker] }];
      }
    }
  }

  // Real estate: appreciate values — 연 1회
  const appreciatedRealEstate = st.realEstate.map((re) => appreciateValue(re, deltaYears, ctx.streams.misc));

  // 채권 쿠폰/원금 상환 — 연 1회
  const { bonds: updatedBonds, couponCash, principalCash } = applyBondCoupon(st.bonds, intAge, deltaYears);

  // 세금 계산 — 연말 1회 정산
  const realEstateValueForTax = st.realEstate.reduce((sum, re) => sum + re.currentValue, 0);
  const interestIncome = Math.max(0, monthlyResult.bankBalance - st.bank.balance);
  const taxableIncome = monthlyResult.grossPeriodIncome + interestIncome + couponCash;
  const avgYearlyTaxable = deltaYears > 0 ? taxableIncome / deltaYears : taxableIncome;
  const incomeTax = Math.round(calculateIncomeTax(avgYearlyTaxable) * deltaYears);
  const propertyTax = Math.round(calculatePropertyTax(realEstateValueForTax) * deltaYears);
  const totalTax = incomeTax + propertyTax;

  // 세금 + 채권 수입 + auto-invest를 최종 현금에 반영
  const bondIncome = couponCash + principalCash;
  let finalCash = monthlyResult.cash + bondIncome - autoInvestSpent - totalTax;

  // Auto-save — 연 급여의 AUTO_SAVE_RATIO를 예금에 자동 저축
  let autoSaveAmount = 0;
  if (st.autoSave && monthlyResult.totalSalaryIncome > 0) {
    const saveBudget = Math.round(monthlyResult.totalSalaryIncome * AUTO_SAVE_RATIO);
    if (saveBudget > 0 && finalCash >= saveBudget) {
      autoSaveAmount = saveBudget;
      finalCash -= autoSaveAmount;
    }
  }

  return {
    prices,
    holdings: autoHoldings,
    dividendRates: updatedDividendRates,
    splitEvents,
    npcs,
    realEstate: appreciatedRealEstate,
    bonds: updatedBonds,
    couponCash,
    principalCash,
    incomeTax,
    propertyTax,
    totalTax,
    autoInvestSpent,
    autoSaveAmount,
    finalCash,
    totalTaxPaid: st.totalTaxPaid + totalTax,
  };
}
