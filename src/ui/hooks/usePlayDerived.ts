import { useMemo, useState, useCallback } from 'react';
import { useGameStore, STOCKS } from '../../store/gameStore';
import { computeCashflow } from '../../game/domain/cashflow';
import { getEffectiveInterestRate } from '../../game/engine/economyCycle';
import { ANNUAL_INFLATION_RATE, NEGOTIATION_BONUS } from '../../game/constants';

/**
 * PlayScreen에서 사용하는 파생값 계산을 모아둔 커스텀 hook.
 * gameStore 셀렉터로 필요한 상태를 직접 구독하므로 props drilling 불필요.
 */
export function usePlayDerived() {
  const character = useGameStore((s) => s.character);
  const cash = useGameStore((s) => s.cash);
  const bank = useGameStore((s) => s.bank);
  const holdings = useGameStore((s) => s.holdings);
  const prices = useGameStore((s) => s.prices);
  const job = useGameStore((s) => s.job);
  const realEstate = useGameStore((s) => s.realEstate);
  const bonds = useGameStore((s) => s.bonds);
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const usedScenarioIds = useGameStore((s) => s.usedScenarioIds);
  const economyCycle = useGameStore((s) => s.economyCycle);
  const parentalRepaymentBase = useGameStore((s) => s.parentalRepaymentBase);

  // 자산 계산 (useMemo — holdings/prices/cash/bank/realEstate 변경 시만 재계산)
  const { stocksValue, realEstateValue, totalAssets, totalCost } = useMemo(() => {
    const sv = holdings.reduce((s, h) => s + (prices[h.ticker] ?? 0) * h.shares, 0);
    const rev = realEstate.reduce((s, re) => s + re.currentValue, 0);
    const tc = holdings.reduce((s, h) => s + h.avgBuyPrice * h.shares, 0);
    return { stocksValue: sv, realEstateValue: rev, totalAssets: cash + bank.balance + sv + rev, totalCost: tc };
  }, [holdings, prices, cash, bank.balance, realEstate]);

  // 배당 계산 — processMonthlyLoop와 동일하게 basePrice 기준 (시장가 아님)
  const dividendIncome = useMemo(() => holdings.reduce((sum, h) => {
    const def = STOCKS.find((s) => s.ticker === h.ticker);
    const divRate = def?.dividendRate ?? 0;
    const basePriceForDiv = def?.basePrice ?? (prices[h.ticker] ?? 0);
    return sum + Math.round(basePriceForDiv * h.shares * divRate);
  }, 0), [holdings, prices]);

  const stockReturnPct = useMemo(
    () => totalCost > 0 ? `${((stocksValue / totalCost - 1) * 100).toFixed(1)}%` : undefined,
    [stocksValue, totalCost],
  );

  // 유효 이자율
  const effectiveInterestRate = economyCycle
    ? getEffectiveInterestRate(
        bank.interestRate,
        economyCycle.phase,
        unlockedSkills.includes('finance_101'),
      )
    : bank.interestRate;

  const intAge = Math.floor(character.age);

  // 연금 공식 입력
  const careerCount = useMemo(
    () => usedScenarioIds.filter(
      (id) => id.includes('job') || id.includes('career') || id.includes('part_time'),
    ).length + 1,
    [usedScenarioIds],
  );
  const inflationMultiplier = intAge > 30 ? 1 + ANNUAL_INFLATION_RATE * (intAge - 30) : 1;
  // processMonthlyLoop와 동일한 salaryBonus 계산
  const salaryBonus = unlockedSkills.includes('negotiation') ? NEGOTIATION_BONUS : 1;

  // 캐시플로
  const cashflow = useMemo(
    () => computeCashflow({
      age: character.age,
      job,
      bank,
      effectiveInterestRate,
      holdings,
      prices,
      stocks: STOCKS,
      realEstate,
      bonds,
      careerCount,
      inflationMultiplier,
      householdClass: character.householdClass,
      parentalRepaymentBase,
      salaryBonus,
    }),
    [character.age, character.householdClass, job, bank, effectiveInterestRate, holdings, prices, realEstate, bonds, careerCount, inflationMultiplier, parentalRepaymentBase, salaryBonus],
  );

  // 월 단위 표시용 float age
  const [displayAge, setDisplayAge] = useState(character.age);
  const onDisplayAgeChange = useCallback((age: number) => {
    setDisplayAge(age);
  }, []);

  return {
    stocksValue,
    realEstateValue,
    totalAssets,
    totalCost,
    dividendIncome,
    stockReturnPct,
    effectiveInterestRate,
    intAge,
    careerCount,
    inflationMultiplier,
    cashflow,
    displayAge,
    onDisplayAgeChange,
  };
}
