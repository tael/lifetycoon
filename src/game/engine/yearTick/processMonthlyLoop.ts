import type { Character, StockDef } from '../../types';
import type { YearTickState, YearTickContext, AgeAndDecayResult, MonthlyLoopResult } from './types';
import { ageSalaryMultiplier } from '../../domain/salaryCurve';
import { getEffectiveInterestRate } from '../economyCycle';
import {
  ACADEMY_RATIO,
  getYearlyParentalAllowance,
} from '../../domain/household';
import { computeCostOfLiving } from '../../domain/costOfLiving';
import { computePensionYearly } from '../../domain/pension';
import {
  REPAYMENT_START_AGE,
  computeParentalRepaymentBase,
  parentalRepaymentForAge,
} from '../../domain/parentalRepayment';
import {
  CASH_FLOOR,
  ADULT_STUDENT_MONTHLY,
  ANNUAL_INFLATION_RATE,
  STAT_DECAY_LOW_THRESHOLD,
  STAT_DECAY_HIGH_THRESHOLD,
  SIDE_JOB_MONTHLY,
  NEGOTIATION_BONUS,
  CASH_INTEREST_RATE,
  OVERDRAFT_RATE_PREMIUM,
} from '../../constants';

function decayRandomStat(character: Character, rng: number): Character {
  if (rng < STAT_DECAY_LOW_THRESHOLD) return { ...character, happiness: Math.max(0, character.happiness - 1) };
  if (rng < STAT_DECAY_HIGH_THRESHOLD) return { ...character, health: Math.max(0, character.health - 1) };
  return { ...character, charisma: Math.max(0, character.charisma - 1) };
}

export function processMonthlyLoop(
  st: YearTickState,
  intAge: number,
  deltaYears: number,
  ageResult: AgeAndDecayResult,
  ctx: YearTickContext,
): MonthlyLoopResult {
  const { job, statPenalty, economyCycle } = ageResult;

  const educationEndAge = st.educationEndAge ?? 19;
  const totalMonths = Math.round(deltaYears * 12);

  // 연초에 한 번 계산하는 상수들
  const effectiveInterestRate = getEffectiveInterestRate(
    st.bank.interestRate,
    economyCycle.phase,
    st.unlockedSkills.includes('finance_101'),
  );
  const monthlyInterestRate = Math.pow(1 + effectiveInterestRate, 1 / 12) - 1;
  const salaryBonus = st.unlockedSkills.includes('negotiation') ? NEGOTIATION_BONUS : 1;
  const inflationMultiplier = intAge > 30 ? 1 + ANNUAL_INFLATION_RATE * (intAge - 30) : 1;
  // 성인(19세+) 학생은 용돈 3만이 아니라 아르바이트 월 200만(연 2400만) 적용
  const effectiveMonthlySalary = job
    ? (job.id === 'student' && intAge >= 19 ? ADULT_STUDENT_MONTHLY : job.salary)
    : 0;
  const baseSalaryYearly = job ? Math.round(job.salary * ageSalaryMultiplier(intAge, job.id) * 12) : 0;
  const monthlySalary = effectiveMonthlySalary > 0
    ? Math.round(effectiveMonthlySalary * ageSalaryMultiplier(intAge, job!.id) * salaryBonus * inflationMultiplier * statPenalty.salaryMult)
    : 0;
  const careerCount = st.usedScenarioIds.filter(
    (id) => id.includes('job') || id.includes('career') || id.includes('part_time'),
  ).length + 1;
  const pensionYearly = computePensionYearly(intAge, careerCount, inflationMultiplier, 1);
  const monthlyPension = Math.round(pensionYearly / 12);
  const monthlyRental = st.realEstate.reduce((sum, re) => sum + re.monthlyRent, 0);

  const isChildhood = intAge >= 10 && intAge < educationEndAge;
  const householdClassForTick = ageResult.character.householdClass;
  const yearlyAllowanceForAge = isChildhood && householdClassForTick
    ? getYearlyParentalAllowance(householdClassForTick, intAge)
    : 0;
  const monthlyAllowance = Math.round(yearlyAllowanceForAge / 12);
  const monthlyAcademy = Math.round(yearlyAllowanceForAge * ACADEMY_RATIO / 12);

  const jobId = job?.id;
  const costOfLivingYearly = computeCostOfLiving(intAge, baseSalaryYearly, jobId);
  const monthlyCostOfLiving = Math.round(costOfLivingYearly / 12);

  const monthlyUpkeep = job?.upkeepCost ?? 0;
  const isStudent = job?.id === 'student';
  let parentalRepaymentBase = st.parentalRepaymentBase;
  if (!isStudent && parentalRepaymentBase == null && intAge >= REPAYMENT_START_AGE) {
    parentalRepaymentBase = computeParentalRepaymentBase(
      st.parentalInvestment,
      inflationMultiplier,
    );
  }
  const repaymentYearly = !isStudent && parentalRepaymentBase != null
    ? parentalRepaymentForAge(intAge, parentalRepaymentBase)
    : 0;
  const monthlyRepayment = Math.round(repaymentYearly / 12);

  // STOCKS 사전 매핑 (O(N)→O(1))
  const stockMap: Record<string, StockDef> = Object.fromEntries(
    ctx.stocks.map((s) => [s.ticker, s]),
  );

  // 월별 누적 변수
  let mCash = st.cash;
  let mBankBalance = st.bank.balance;
  let mLoanBalance = st.bank.loanBalance;
  let mHoldings = [...st.holdings];
  let mTotalAllowance = 0;
  let mTotalSalaryIncome = 0;
  let mTotalDividendIncome = 0;
  let mTotalPensionIncome = 0;
  let mTotalRentalIncome = 0;
  let mTotalExpenses = 0;
  let mDripSpent = 0;
  let character: Character = ageResult.character;

  for (let m = 0; m < totalMonths; m++) {
    // ── 월 수입 ──
    mCash += monthlySalary;
    mTotalSalaryIncome += monthlySalary;

    // 예금 이자 (월 복리)
    if (mBankBalance > 0) {
      const monthlyInterest = Math.round(mBankBalance * monthlyInterestRate);
      mBankBalance += monthlyInterest;
    }

    // 배당 (연 배당률 / 12)
    let monthlyDividend = 0;
    for (const h of mHoldings) {
      const stockDef = stockMap[h.ticker];
      const divRate = (st.dividendRates[h.ticker] ?? stockDef?.dividendRate) ?? 0;
      if (divRate <= 0) continue;
      const basePriceForDiv = stockDef?.basePrice ?? (st.prices[h.ticker] ?? 0);
      const div = Math.round(basePriceForDiv * h.shares * divRate / 12);
      monthlyDividend += div;
    }
    mCash += monthlyDividend;
    mTotalDividendIncome += monthlyDividend;

    // 임대 수입
    mCash += monthlyRental;
    mTotalRentalIncome += monthlyRental;

    // 연금
    mCash += monthlyPension;
    mTotalPensionIncome += monthlyPension;

    // 부모님 용돈 (유년기)
    mCash += monthlyAllowance;
    mTotalAllowance += monthlyAllowance;

    // ── 월 지출 ──
    const monthExpense = monthlyCostOfLiving + monthlyAcademy + monthlyUpkeep + monthlyRepayment;
    mCash -= monthlyCostOfLiving;
    mCash -= monthlyAcademy;
    mCash -= monthlyUpkeep;
    mCash -= monthlyRepayment;
    mTotalExpenses += monthExpense;

    // 성인 순현금흐름 마이너스 대응
    const monthlyBankInterest = mBankBalance > 0 ? Math.round(mBankBalance * monthlyInterestRate) : 0;
    const monthlyNetFlow = monthlySalary + monthlyBankInterest + monthlyDividend + monthlyRental + monthlyPension + monthlyAllowance - monthExpense;
    if (intAge >= 19 && monthlyNetFlow < 0) {
      character = decayRandomStat(character, ctx.streams.misc());

      const costRefund = Math.round(monthlyCostOfLiving * 0.5);
      mCash += costRefund;
      mTotalExpenses -= costRefund;

      mCash += SIDE_JOB_MONTHLY;
      mTotalSalaryIncome += SIDE_JOB_MONTHLY;
    }

    // 대출 이자
    if (mLoanBalance > 0) {
      const loanMonthlyRate = st.bank.loanInterestRate / 12;
      const loanInterest = Math.round(mLoanBalance * loanMonthlyRate);
      if (mCash >= loanInterest) {
        mCash -= loanInterest;
        mTotalExpenses += loanInterest;
      } else {
        mLoanBalance += loanInterest;
      }
    }

    // 자유입출금통장 이자
    if (mCash > 0) {
      const cashInterest = Math.round(mCash * CASH_INTEREST_RATE / 12);
      mCash += cashInterest;
    } else if (mCash < 0) {
      const overdraftRate = st.bank.loanInterestRate + OVERDRAFT_RATE_PREMIUM;
      const overdraftInterest = Math.round(Math.abs(mCash) * overdraftRate / 12);
      mCash = Math.max(mCash - overdraftInterest, CASH_FLOOR);
    }

    // DRIP (월 배당분으로 매수)
    if (st.dripEnabled && monthlyDividend > 0 && mCash > 0) {
      for (let hi = 0; hi < mHoldings.length; hi++) {
        const h = mHoldings[hi];
        const stockDef = stockMap[h.ticker];
        const divRate = (st.dividendRates[h.ticker] ?? stockDef?.dividendRate) ?? 0;
        if (divRate <= 0) continue;
        const price = st.prices[h.ticker] ?? 0;
        if (price <= 0) continue;
        const basePriceForDiv = stockDef?.basePrice ?? price;
        const div = Math.round(basePriceForDiv * h.shares * divRate / 12);
        const additionalShares = Math.floor(div / price);
        if (additionalShares <= 0) continue;
        const cost = additionalShares * price;
        if (mCash < cost) continue;
        mCash -= cost;
        mDripSpent += cost;
        const totalShares = h.shares + additionalShares;
        const newAvg = Math.round(
          (h.avgBuyPrice * h.shares + price * additionalShares) / totalShares,
        );
        mHoldings[hi] = { ticker: h.ticker, shares: totalShares, avgBuyPrice: newAvg };
      }
    }
  }
  // ── 월별 루프 종료 ──

  // 마이너스통장 로그
  const overdraftLog: MonthlyLoopResult['overdraftLog'] = [];
  if (mCash < 0 && st.cash >= 0) {
    overdraftLog.push({
      age: intAge,
      text: `⚠️ 마이너스 잔고 발생`,
      timestamp: Date.now(),
    });
  }

  // 연간 합계 (세금/위기 판정용)
  const academyExpense = Math.round(yearlyAllowanceForAge * ACADEMY_RATIO * deltaYears);
  const costOfLivingExpense = Math.round(costOfLivingYearly * deltaYears);
  const upkeepExpense = job?.upkeepCost
    ? Math.round(job.upkeepCost * 12 * deltaYears)
    : 0;
  const repaymentExpense = Math.round(repaymentYearly * deltaYears);
  const grossPeriodIncome = mTotalSalaryIncome + mTotalDividendIncome + mTotalPensionIncome + Math.round(mTotalRentalIncome);

  return {
    cash: mCash,
    bankBalance: Math.round(mBankBalance),
    loanBalance: Math.round(mLoanBalance),
    holdings: mHoldings,
    character,
    parentalInvestment: st.parentalInvestment + mTotalAllowance,
    parentalRepaymentBase,
    totalSalaryIncome: mTotalSalaryIncome,
    totalDividendIncome: mTotalDividendIncome,
    totalPensionIncome: mTotalPensionIncome,
    totalRentalIncome: mTotalRentalIncome,
    totalAllowanceIncome: mTotalAllowance,
    totalExpenses: mTotalExpenses,
    dripSpent: mDripSpent,
    overdraftLog,
    academyExpense,
    costOfLivingExpense,
    upkeepExpense,
    repaymentExpense,
    grossPeriodIncome,
  };
}
