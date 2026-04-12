import type { BankAccount, Bond, Holding, Insurance, Job, RealEstate, StockDef } from '../types';
import { calculateIncomeTax, calculatePropertyTax } from '../engine/tax';
import { computePensionYearly, PENSION_START_AGE } from './pension';
import {
  ACADEMY_RATIO,
  getYearlyParentalAllowance,
  type HouseholdClass,
} from './household';
import { computeCostOfLiving } from './costOfLiving';
import { parentalRepaymentForAge } from './parentalRepayment';
import { ageSalaryMultiplier } from './salaryCurve';

export type IncomeItem = {
  label: string;
  emoji: string;
  amount: number;
  passive: boolean;
  incomeType?: string;
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
  /**
   * "지속 가능한" 자동수입 — 부모 용돈/연금처럼 외부에 의존적인 수입은 제외하고
   * 본인 자산이 만들어내는 패시브(이자/배당/임대/채권 쿠폰)만 합산한다.
   * 재정 자유 판정은 이 값으로 한다 (V3-03: 유년기 부모 용돈으로 트레이트
   * 오인 부여되는 문제 방지).
   */
  sustainablePassive: number;
  /**
   * 포트폴리오 전체 배당수익률 (%).
   * 공식: 총 배당금 / (avgBuyPrice × shares 합) × 100.
   * 보유 주식이 없거나 총 투자금이 0이면 0.
   */
  portfolioDividendYield: number;
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
  /**
   * 가정 형편 (v0.3.0). 유년기(10~18세)의 부모 용돈/학원비 라인을 계산한다.
   * 미지정 시 해당 라인은 표시되지 않는다 (구 호출자 호환).
   */
  householdClass?: HouseholdClass;
  /**
   * 부모님 용돈 되돌림 base (v0.3.0 V3-09). gameStore가 20세 첫 틱에 1회
   * 산정해 저장한 값을 그대로 넘긴다. null/0이면 라인 미표시.
   */
  parentalRepaymentBase?: number | null;
  /**
   * 현재 현금 잔액. 양수이면 입출금 이자(연 0.1%) income 라인,
   * 음수이면 마이너스통장 이자(loanInterestRate + 0.01) expense 라인을 추가한다.
   * 미지정 시 해당 라인은 표시되지 않는다 (구 호출자 호환).
   */
  cash?: number;
  /**
   * V5-02: 학업 종료 나이. 부모 용돈·학원비 수령 기간을 결정한다.
   * 미지정 시 19 (고졸 기본값) — 기존 동작 완전 호환.
   */
  educationEndAge?: number;
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
    householdClass,
    parentalRepaymentBase,
    cash,
    educationEndAge,
  } = input;

  const intAge = Math.floor(age);
  // V5-02: 유년기 정의: 10세 이상 educationEndAge 미만 (기본 19 → 고졸 기준)
  const _educationEndAge = educationEndAge ?? 19;
  const isChildhood = intAge >= 10 && intAge < _educationEndAge;
  const allowanceYearly = isChildhood && householdClass
    ? getYearlyParentalAllowance(householdClass, intAge, _educationEndAge)
    : 0;
  const academyYearly = allowanceYearly > 0
    ? Math.round(allowanceYearly * ACADEMY_RATIO)
    : 0;

  // --- Income --------------------------------------------------------------
  // 성인(19세+) 학생은 용돈 3만이 아니라 아르바이트 월 200만(연 2400만) 적용
  const ADULT_STUDENT_MONTHLY = 2_000_000;
  const effectiveSalary = job
    ? (job.id === 'student' && intAge >= 19 ? ADULT_STUDENT_MONTHLY : job.salary)
    : 0;
  const salaryYearly = effectiveSalary > 0 ? Math.round(effectiveSalary * ageSalaryMultiplier(intAge, job!.id) * 12) : 0;
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
  // 유년기(isChildhood)에 student job이면 salary 기반 "용돈" 라인을 생략한다.
  // 부모님 용돈(allowanceYearly) 라인이 아래에서 추가되므로 중복 방지.
  if (salaryYearly > 0 && !(isChildhood && job?.id === 'student')) {
    const isStudent = job?.id === 'student';
    const isAdultStudent = isStudent && intAge >= 19;
    const label = isChildhood && isStudent ? '용돈' : isAdultStudent ? '아르바이트' : '월급';
    const emoji = isAdultStudent ? '🏪' : isStudent ? '👛' : '💼';
    income.push({ label, emoji, amount: salaryYearly, passive: false, incomeType: '(근로소득)' });
  }
  if (interestYearly > 0) income.push({ label: '이자', emoji: '🏦', amount: interestYearly, passive: true, incomeType: '(자산소득)' });
  if (dividendYearly > 0) income.push({ label: '배당', emoji: '📈', amount: dividendYearly, passive: true, incomeType: '(자산소득)' });
  if (rentalYearly > 0) income.push({ label: '임대', emoji: '🏘', amount: rentalYearly, passive: true, incomeType: '(자산소득)' });
  if (pensionYearly > 0) income.push({ label: '연금', emoji: '💰', amount: pensionYearly, passive: true, incomeType: '(연금소득)' });
  if (bondCouponYearly > 0) income.push({ label: '채권 쿠폰', emoji: '💸', amount: bondCouponYearly, passive: true, incomeType: '(자산소득)' });
  // V3-03: 유년기 부모 용돈. passive로 분류하되 sustainablePassive 에서는 제외한다.
  if (allowanceYearly > 0) income.push({ label: '부모님 용돈', emoji: '👛', amount: allowanceYearly, passive: true, incomeType: '(이전소득)' });
  // 입출금 이자: 현금 양수 시 연 0.1%
  const cashDepositInterestYearly = cash != null && cash > 0
    ? Math.round(cash * 0.001)
    : 0;
  if (cashDepositInterestYearly > 0) income.push({ label: '입출금 이자', emoji: '💵', amount: cashDepositInterestYearly, passive: true, incomeType: '(자산소득)' });

  const totalIncome = income.reduce((s, it) => s + it.amount, 0);
  const activeIncome = income.filter((it) => !it.passive).reduce((s, it) => s + it.amount, 0);
  const passiveIncome = income.filter((it) => it.passive).reduce((s, it) => s + it.amount, 0);
  // "지속 가능한" 패시브 — 부모 용돈/연금은 외부 의존이므로 제외.
  // 자기 자산으로 만든 이자/배당/임대/채권 쿠폰만 인정.
  const sustainablePassive = interestYearly + dividendYearly + rentalYearly + bondCouponYearly + cashDepositInterestYearly;

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
  // V3-04: 유년기 학원비 — 부모 용돈의 65% 만큼 자동 차감.
  if (academyYearly > 0) expense.push({ label: '학원비', emoji: '📚', amount: academyYearly });
  // V3-06/07: 성인 기본 생활비 (연봉 35% or 무직 최저 360만)
  const costOfLivingYearly = computeCostOfLiving(intAge, salaryYearly);
  if (costOfLivingYearly > 0) expense.push({ label: '생활비', emoji: '🏠', amount: costOfLivingYearly });
  // V3-08: 직업별 자기계발비 (월 → 연 환산). upkeepCost 미정의 직업은 0.
  const upkeepYearly = job?.upkeepCost ? Math.round(job.upkeepCost * 12) : 0;
  if (upkeepYearly > 0) expense.push({ label: '자기계발비', emoji: '🎓', amount: upkeepYearly });
  // V3-09: 부모님 용돈 되돌림 (20~60세). 학생 신분이면 면제.
  const isStudent = job?.id === 'student';
  const repaymentYearly = !isStudent
    ? parentalRepaymentForAge(intAge, parentalRepaymentBase ?? 0)
    : 0;
  if (repaymentYearly > 0) expense.push({ label: '부모님 용돈', emoji: '💝', amount: repaymentYearly });
  // 마이너스통장: 현금이 음수이면 (loanInterestRate + 0.01) 적용.
  const overdraftInterestYearly = cash != null && cash < 0
    ? Math.round(Math.abs(cash) * (bank.loanInterestRate + 0.01))
    : 0;
  if (overdraftInterestYearly > 0) expense.push({ label: '마이너스 이자', emoji: '🔻', amount: overdraftInterestYearly });

  let totalExpense = expense.reduce((s, it) => s + it.amount, 0);
  let adjustedTotalIncome = totalIncome;

  // 성인 순현금흐름 마이너스 대응: 생활비 50% 절감 + 강제 부업 연 1200만
  if (intAge >= 19 && totalIncome - totalExpense < 0) {
    // 생활비 절감
    const livingIdx = expense.findIndex(e => e.label === '생활비');
    if (livingIdx >= 0) {
      const cut = Math.round(expense[livingIdx].amount * 0.5);
      expense[livingIdx] = { ...expense[livingIdx], amount: expense[livingIdx].amount - cut };
      totalExpense -= cut;
    }
    // 강제 부업 소득
    const SIDE_JOB_YEARLY = 12_000_000;
    income.push({ label: '부업', emoji: '🔧', amount: SIDE_JOB_YEARLY, passive: false, incomeType: '(근로소득)' });
    adjustedTotalIncome += SIDE_JOB_YEARLY;
  }

  const netCashflow = adjustedTotalIncome - totalExpense;

  // freedomRatio 와 financiallyFree 는 sustainablePassive 기준 (V3-03 결정).
  // 부모 용돈은 잠시 들어왔다 사라지는 외부 자원이라 재정 자유 트레이트의 근거가
  // 될 수 없다. 0세 → 19세 사이에 트레이트가 잘못 부여되는 사고를 방지한다.
  const freedomRatio = totalExpense > 0
    ? sustainablePassive / totalExpense
    : sustainablePassive > 0 ? 1 : 0;
  const financiallyFree = sustainablePassive > 0 && sustainablePassive >= totalExpense;

  // 포트폴리오 전체 배당수익률: 총 배당금 / 총 투자금 × 100
  const totalInvestment = holdings.reduce((sum, h) => sum + h.avgBuyPrice * h.shares, 0);
  const portfolioDividendYield = totalInvestment > 0
    ? (dividendYearly / totalInvestment) * 100
    : 0;

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
    sustainablePassive,
    portfolioDividendYield,
  };
}
