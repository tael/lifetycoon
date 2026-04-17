import type { BankAccount, Holding, LifeEvent, RealEstate } from '../../types';
import type { YearTickState, AgeAndDecayResult, MonthlyLoopResult, AnnualSettlementResult, CrisisResult } from './types';
import { computeCrisisLevel } from '../../domain/crisisEngine';
import { forcedLiquidation } from '../../domain/forcedLiquidation';
import { formatWon } from '../../domain/asset';
import { MIN_GOV_LOAN } from '../../constants';

export function processCrisisAndLiquidation(
  st: YearTickState,
  intAge: number,
  deltaYears: number,
  _ageResult: AgeAndDecayResult,
  monthlyResult: MonthlyLoopResult,
  annualResult: AnnualSettlementResult,
): CrisisResult {
  const { character } = monthlyResult;

  // V5-04: 위기 레벨 계산
  const totalExpensesForCrisis = annualResult.totalTax + monthlyResult.academyExpense + monthlyResult.costOfLivingExpense + monthlyResult.upkeepExpense + monthlyResult.repaymentExpense;
  const stocksValForCrisis = annualResult.holdings.reduce((s, h) => s + (annualResult.prices[h.ticker] ?? 0) * h.shares, 0);
  const totalAssetsForCrisis = annualResult.finalCash + monthlyResult.bankBalance + stocksValForCrisis + annualResult.realEstate.reduce((s, re) => s + re.currentValue, 0);
  const crisisLevel = computeCrisisLevel({
    netCashflow: (monthlyResult.grossPeriodIncome - totalExpensesForCrisis) / 12,
    monthlyExpense: totalExpensesForCrisis / 12,
    totalAssets: totalAssetsForCrisis,
    cash: annualResult.finalCash,
  });

  let finalCash = annualResult.finalCash;
  const bank: BankAccount = {
    ...st.bank,
    balance: monthlyResult.bankBalance,
    loanBalance: monthlyResult.loanBalance,
  };

  // V5-05: 강제 매각 — red 위기 시
  const forcedSaleLog: LifeEvent[] = [];
  let postSaleHoldings: Holding[] = annualResult.holdings;
  let postSaleRealEstate: RealEstate[] = annualResult.realEstate;
  let postSaleBank = bank;
  if (finalCash < 0 && crisisLevel === 'red') {
    const deficit = Math.abs(finalCash);
    const liq = forcedLiquidation(
      deficit,
      finalCash,
      bank,
      annualResult.holdings,
      annualResult.prices,
      annualResult.realEstate,
    );
    finalCash += liq.cashRecovered;
    postSaleBank = { ...bank, balance: bank.balance - liq.bankWithdrawn };
    postSaleHoldings = annualResult.holdings
      .map((h) => {
        const sold = liq.stocksSold.find((s) => s.ticker === h.ticker);
        if (!sold) return h;
        const remaining = h.shares - sold.shares;
        return remaining > 0 ? { ...h, shares: remaining } : null;
      })
      .filter((h): h is NonNullable<typeof h> => h !== null);
    postSaleRealEstate = annualResult.realEstate.filter(
      (re) => !liq.realEstateSold.some((s) => s.id === re.id),
    );
    for (const warn of liq.warnings) {
      forcedSaleLog.push({ age: intAge, text: warn, timestamp: Date.now() });
    }
  }

  // V5-06: 정부 긴급 생활안정 대출
  const govLoanLog: LifeEvent[] = [];
  let postGovBank = postSaleBank;
  let govLoanRecord: CrisisResult['govLoanRecord'] = null;
  const isAdult = intAge >= 19;
  const noLiquidAssets =
    postSaleBank.balance <= 0 &&
    postSaleHoldings.length === 0 &&
    postSaleRealEstate.length === 0;
  if (finalCash < 0 && noLiquidAssets && isAdult && Math.abs(finalCash) >= MIN_GOV_LOAN) {
    const deficit = Math.abs(finalCash);
    const LOAN_UNIT = 1_000_000;
    const govLoanAmount = Math.ceil(deficit / LOAN_UNIT) * LOAN_UNIT;
    postGovBank = { ...postSaleBank, loanBalance: postSaleBank.loanBalance + govLoanAmount };
    finalCash += govLoanAmount;
    govLoanLog.push({
      age: intAge,
      text: `🏛️ 정부 긴급 생활안정 대출 ${formatWon(govLoanAmount)}이 실행됐습니다`,
      timestamp: Date.now(),
    });
    govLoanRecord = { age: intAge, amount: govLoanAmount, source: 'government', reason: '정부 긴급 생활안정 대출' };
  }

  // V5-04: 위기 스탯 차감
  const crisisTurns = (crisisLevel === 'orange' || crisisLevel === 'red')
    ? st.crisisTurns + deltaYears
    : st.crisisTurns;
  const crisisCharacter = (() => {
    if (crisisLevel === 'orange') {
      return {
        ...character,
        happiness: Math.max(0, Math.min(100, character.happiness - 3 * deltaYears)),
        health: Math.max(0, Math.min(100, character.health - 2 * deltaYears)),
        wisdom: Math.max(0, Math.min(100, character.wisdom - 1 * deltaYears)),
        charisma: Math.max(0, Math.min(100, character.charisma - 1 * deltaYears)),
      };
    }
    if (crisisLevel === 'red') {
      return {
        ...character,
        happiness: Math.max(0, Math.min(100, character.happiness - 6 * deltaYears)),
        health: Math.max(0, Math.min(100, character.health - 4 * deltaYears)),
        wisdom: Math.max(0, Math.min(100, character.wisdom - 2 * deltaYears)),
        charisma: Math.max(0, Math.min(100, character.charisma - 2 * deltaYears)),
      };
    }
    return character;
  })();

  return {
    crisisLevel,
    crisisTurns,
    character: crisisCharacter,
    finalCash,
    holdings: postSaleHoldings,
    realEstate: postSaleRealEstate,
    bank: postGovBank,
    forcedSaleLog,
    govLoanLog,
    govLoanRecord,
  };
}
