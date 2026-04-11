import type { BankAccount, Bond, Holding, Insurance, Job, RealEstate, StockDef } from '../types';
import { calculateIncomeTax, calculatePropertyTax } from '../engine/tax';
import { computePensionYearly, PENSION_START_AGE } from './pension';

export type IncomeItem = {
  label: string;
  emoji: string;
  amount: number;
  passive: boolean;
};

export type ExpenseItem = {
  label: string;
  emoji: string;
  amount: number;
};

export type CashflowBreakdown = {
  income: IncomeItem[];
  expense: ExpenseItem[];
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  activeIncome: number;
  passiveIncome: number;
  /**
   * passiveIncome / totalExpense.
   * - totalExpense=0 이고 passiveIncome>0 이면 1 (완전 자유로 취급)
   * - totalExpense=0 이고 passiveIncome=0 이면 0
   */
  freedomRatio: number;
  /** passiveIncome > 0 && passiveIncome >= totalExpense */
  financiallyFree: boolean;
};

export type CashflowInput = {
  age: number;
  job: Job | null;
  bank: BankAccount;
  /** 경기·스킬 보너스까지 반영된 유효 예금 이자율 (연). */
  effectiveInterestRate: number;
  holdings: Holding[];
  prices: Record<string, number>;
  stocks: StockDef[];
  realEstate: RealEstate[];
  bonds: Bond[];
  insurance: Insurance;
  /**
   * 연금 공식 입력. gameStore.advanceYear와 동일한 계산식을 쓰기 위해
   * 호출자가 직업/파트타임 경력 수와 인플레 배수를 넘겨준다. 둘 다 생략 시
   * 과거 단순화된 폴백(65세+에서 고정 500,000)을 유지한다.
   */
  careerCount?: number;
  inflationMultiplier?: number;
};

/**
 * 올해 예상 캐시플로를 도메인 층에서 해체(decompose)한다.
 *
 * 순수 함수 — 입력만으로 결정론적 결과가 나온다. gameStore.advanceYear 와
 * PlayScreen 에 중복된 연 수입/지출 계산을 한 곳으로 모으기 위한 단일 출처.
 *
 * - "연간" 기준이므로 월급은 ×12, 임대료도 ×12.
 * - 세금은 소득세(근로+연금+배당+임대 기준) + 재산세(부동산 평가액) 합계.
 * - 연금은 PENSION_START_AGE(65) 이상일 때만. careerCount/inflationMultiplier가
 *   주어지면 gameStore와 동일한 computePensionYearly 공식을 쓰고, 아니면 폴백으로
 *   단순 500,000원(이전 UI 노출값 호환).
 * - 채권 쿠폰은 만기 전 bond 전체 합. 원금 상환은 포함하지 않는다(올해 발생 플로우가 아님).
 * - deltaYears=1 을 가정 — 이번 사이클은 UI 노출용이라 가장 흔한 케이스만 다룬다.
 */
export function computeCashflow(input: CashflowInput): CashflowBreakdown {
  const {
    age,
    job,
    bank,
    effectiveInterestRate,
    holdings,
    prices,
    stocks,
    realEstate,
    bonds,
    insurance,
    careerCount,
    inflationMultiplier,
  } = input;

  const intAge = Math.floor(age);

  // --- Income --------------------------------------------------------------
  const salaryYearly = job ? Math.round(job.salary * 12) : 0;
  const interestYearly = bank.balance > 0
    ? Math.round(bank.balance * effectiveInterestRate)
    : 0;
  const dividendYearly = holdings.reduce((sum, h) => {
    const def = stocks.find((s) => s.ticker === h.ticker);
    const divRate = def?.dividendRate ?? 0;
    if (divRate <= 0) return sum;
    const price = prices[h.ticker] ?? 0;
    return sum + Math.round(price * h.shares * divRate);
  }, 0);
  const rentalYearly = realEstate.reduce((s, re) => s + re.monthlyRent * 12, 0);
  // 연금: 호출자가 careerCount/inflationMultiplier를 주면 gameStore와 동일 공식,
  // 아니면 과거 단순화 폴백 유지 (외부 테스트 호환).
  const pensionYearly =
    intAge < PENSION_START_AGE
      ? 0
      : careerCount != null && inflationMultiplier != null
        ? computePensionYearly(intAge, careerCount, inflationMultiplier, 1)
        : 500_000;
  const bondCouponYearly = bonds.reduce((sum, b) => {
    if (b.matured) return sum;
    return sum + Math.round(b.faceValue * b.couponRate);
  }, 0);

  const income: IncomeItem[] = [];
  if (salaryYearly > 0) income.push({ label: '월급', emoji: '💼', amount: salaryYearly, passive: false });
  if (interestYearly > 0) income.push({ label: '이자', emoji: '🏦', amount: interestYearly, passive: true });
  if (dividendYearly > 0) income.push({ label: '배당', emoji: '📈', amount: dividendYearly, passive: true });
  if (rentalYearly > 0) income.push({ label: '임대', emoji: '🏘', amount: rentalYearly, passive: true });
  if (pensionYearly > 0) income.push({ label: '연금', emoji: '💰', amount: pensionYearly, passive: true });
  if (bondCouponYearly > 0) income.push({ label: '채권 쿠폰', emoji: '💸', amount: bondCouponYearly, passive: true });

  const totalIncome = income.reduce((s, it) => s + it.amount, 0);
  const activeIncome = income.filter((it) => !it.passive).reduce((s, it) => s + it.amount, 0);
  const passiveIncome = income.filter((it) => it.passive).reduce((s, it) => s + it.amount, 0);

  // --- Expense -------------------------------------------------------------
  const realEstateValue = realEstate.reduce((s, re) => s + re.currentValue, 0);
  const incomeTaxYearly = Math.round(calculateIncomeTax(totalIncome));
  const propertyTaxYearly = Math.round(calculatePropertyTax(realEstateValue));
  const taxYearly = incomeTaxYearly + propertyTaxYearly;
  const insuranceYearly = insurance.premium ?? 0;
  const loanInterestYearly = bank.loanBalance > 0
    ? Math.round(bank.loanBalance * bank.loanInterestRate)
    : 0;

  const expense: ExpenseItem[] = [];
  if (taxYearly > 0) expense.push({ label: '세금', emoji: '🧾', amount: taxYearly });
  if (insuranceYearly > 0) expense.push({ label: '보험료', emoji: '🏥', amount: insuranceYearly });
  if (loanInterestYearly > 0) expense.push({ label: '대출 이자', emoji: '💳', amount: loanInterestYearly });

  const totalExpense = expense.reduce((s, it) => s + it.amount, 0);
  const netCashflow = totalIncome - totalExpense;

  // 지출이 0이면 나눗셈 불가. passiveIncome이 있으면 "완전 자유" 1.0, 없으면 0.
  const freedomRatio = totalExpense > 0
    ? passiveIncome / totalExpense
    : passiveIncome > 0 ? 1 : 0;
  const financiallyFree = passiveIncome > 0 && passiveIncome >= totalExpense;

  return {
    income,
    expense,
    totalIncome,
    totalExpense,
    netCashflow,
    activeIncome,
    passiveIncome,
    freedomRatio,
    financiallyFree,
  };
}
