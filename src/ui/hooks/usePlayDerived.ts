import { useMemo, useState, useCallback } from 'react';
import { useGameStore, STOCKS } from '../../store/gameStore';
import { computeCashflow } from '../../game/domain/cashflow';
import { getEffectiveInterestRate } from '../../game/engine/economyCycle';

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
  const insurance = useGameStore((s) => s.insurance);
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const usedScenarioIds = useGameStore((s) => s.usedScenarioIds);
  const economyCycle = useGameStore((s) => s.economyCycle);
  const parentalRepaymentBase = useGameStore((s) => s.parentalRepaymentBase);

  // 자산 계산
  const stocksValue = holdings.reduce((s, h) => s + (prices[h.ticker] ?? 0) * h.shares, 0);
  const realEstateValue = realEstate.reduce((s, re) => s + re.currentValue, 0);
  const totalAssets = cash + bank.balance + stocksValue + realEstateValue;

  // 주식 수익률 + 배당
  const totalCost = holdings.reduce((s, h) => s + h.avgBuyPrice * h.shares, 0);
  const dividendIncome = holdings.reduce((sum, h) => {
    const def = STOCKS.find((s) => s.ticker === h.ticker);
    const divRate = def?.dividendRate ?? 0;
    const price = prices[h.ticker] ?? 0;
    return sum + Math.round(price * h.shares * divRate);
  }, 0);
  const stockReturnPct = totalCost > 0
    ? `${((stocksValue / totalCost - 1) * 100).toFixed(1)}%`
    : undefined;

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
  const inflationMultiplier = intAge > 30 ? 1 + 0.02 * (intAge - 30) : 1;

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
      insurance,
      careerCount,
      inflationMultiplier,
      householdClass: character.householdClass,
      parentalRepaymentBase,
    }),
    [character.age, character.householdClass, job, bank, effectiveInterestRate, holdings, prices, realEstate, bonds, insurance, careerCount, inflationMultiplier, parentalRepaymentBase],
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
