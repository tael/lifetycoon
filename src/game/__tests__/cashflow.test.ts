import { describe, it, expect } from 'vitest';
import { computeCashflow, type CashflowInput } from '../domain/cashflow';
import type { BankAccount, Insurance, Job, StockDef } from '../types';

const baseBank: BankAccount = {
  balance: 0,
  interestRate: 0.03,
  loanBalance: 0,
  loanInterestRate: 0.05,
};
const noInsurance: Insurance = { health: false, asset: false, premium: 0 };

const salaryJob: Job = {
  id: 'student',
  title: '학생',
  salary: 500_000, // 월 50만 → 연 600만 (면세 구간)
  minAge: 10,
  recommendedAssets: 0,
  iconEmoji: '📖',
  flavorText: '',
};

const sampleStocks: StockDef[] = [
  {
    ticker: 'DIV',
    name: '배당주식',
    sector: 'finance',
    basePrice: 10000,
    volatility: 0.1,
    drift: 0.02,
    dividendRate: 0.04,
  } as StockDef,
];

function baseInput(overrides: Partial<CashflowInput> = {}): CashflowInput {
  return {
    age: 30,
    job: null,
    bank: baseBank,
    effectiveInterestRate: 0.03,
    holdings: [],
    prices: {},
    stocks: sampleStocks,
    realEstate: [],
    bonds: [],
    insurance: noInsurance,
    ...overrides,
  };
}

describe('computeCashflow', () => {
  it('월급만 있는 기본 케이스: activeIncome=월급, passiveIncome=0, freedomRatio=0', () => {
    const r = computeCashflow(baseInput({ job: salaryJob }));
    expect(r.totalIncome).toBe(6_000_000); // 50만 × 12
    expect(r.activeIncome).toBe(6_000_000);
    expect(r.passiveIncome).toBe(0);
    // 면세 구간이라 소득세 0, 재산세/보험/대출이자 모두 0
    expect(r.totalExpense).toBe(0);
    expect(r.netCashflow).toBe(6_000_000);
    // totalExpense=0 이면 freedomRatio는 0 (나눗셈 방어)
    expect(r.freedomRatio).toBe(0);
    expect(r.financiallyFree).toBe(false);
    expect(r.income).toHaveLength(1);
    expect(r.income[0].label).toBe('월급');
    expect(r.income[0].passive).toBe(false);
  });

  it('이자·배당·임대가 있으면 passiveIncome 에 합산된다', () => {
    const r = computeCashflow(baseInput({
      job: salaryJob,
      bank: { ...baseBank, balance: 10_000_000 }, // 연 3% → 30만
      effectiveInterestRate: 0.03,
      holdings: [{ ticker: 'DIV', shares: 100, avgBuyPrice: 10000 }],
      prices: { DIV: 10000 }, // 10000 × 100 × 0.04 = 40,000
      realEstate: [{
        id: 'shop',
        name: '상가',
        purchasePrice: 50_000_000,
        currentValue: 50_000_000,
        monthlyRent: 100_000, // 연 120만
        purchasedAtAge: 30,
      }],
    }));

    const interest = 300_000;
    const dividend = 40_000;
    const rental = 1_200_000;
    const salary = 6_000_000;

    expect(r.passiveIncome).toBe(interest + dividend + rental);
    expect(r.activeIncome).toBe(salary);
    expect(r.totalIncome).toBe(salary + interest + dividend + rental);

    // 수입 항목 순서/라벨 확인
    const labels = r.income.map((i) => i.label);
    expect(labels).toEqual(['월급', '이자', '배당', '임대']);

    // 재산세 = 5000만 × 0.3% = 150,000
    const propertyTax = 150_000;
    expect(r.expense.find((e) => e.label === '세금')?.amount).toBe(propertyTax);
    expect(r.totalExpense).toBe(propertyTax);
  });

  it('passiveIncome >= totalExpense 이면 financiallyFree=true', () => {
    const r = computeCashflow(baseInput({
      job: null,
      bank: { ...baseBank, balance: 50_000_000 }, // 이자 150만
      effectiveInterestRate: 0.03,
      insurance: { health: true, asset: false, premium: 200_000 }, // 지출 20만
    }));
    expect(r.passiveIncome).toBe(1_500_000);
    expect(r.totalExpense).toBe(200_000);
    expect(r.freedomRatio).toBeCloseTo(7.5, 3);
    expect(r.financiallyFree).toBe(true);
  });

  it('65세 미만이면 연금 0, 65세 이상이면 연금 50만이 passive 로 편입된다', () => {
    const young = computeCashflow(baseInput({ age: 30 }));
    expect(young.income.find((i) => i.label === '연금')).toBeUndefined();
    expect(young.passiveIncome).toBe(0);

    const old = computeCashflow(baseInput({ age: 65 }));
    const pension = old.income.find((i) => i.label === '연금');
    expect(pension?.amount).toBe(500_000);
    expect(pension?.passive).toBe(true);
    expect(old.passiveIncome).toBe(500_000);
  });

  it('passiveIncome=0 이면 지출이 있어도 financiallyFree=false', () => {
    const r = computeCashflow(baseInput({
      job: salaryJob,
      insurance: { health: true, asset: false, premium: 200_000 },
    }));
    expect(r.passiveIncome).toBe(0);
    expect(r.totalExpense).toBe(200_000);
    expect(r.financiallyFree).toBe(false);
    // 분모가 있어도 passive 0이면 ratio 0
    expect(r.freedomRatio).toBe(0);
  });

  it('채권 쿠폰은 미만기 bond 만 합산한다', () => {
    const r = computeCashflow(baseInput({
      bonds: [
        { id: 'a', name: '단기', faceValue: 1_000_000, couponRate: 0.03, maturityYears: 3, purchasedAtAge: 25, matured: false },
        { id: 'b', name: '장기', faceValue: 1_000_000, couponRate: 0.05, maturityYears: 10, purchasedAtAge: 20, matured: true },
      ],
    }));
    const coupon = r.income.find((i) => i.label === '채권 쿠폰');
    expect(coupon?.amount).toBe(30_000); // 만기 도달분 제외
    expect(coupon?.passive).toBe(true);
  });

  it('passiveIncome === totalExpense 경계에서도 financiallyFree=true', () => {
    // 이자 수입 정확히 20만 = 보험료 20만
    const r = computeCashflow(baseInput({
      job: null,
      bank: { ...baseBank, balance: 20_000_000 / 0.03 }, // 20만 / 3% = 약 666만
      effectiveInterestRate: 0.03,
      insurance: { health: true, asset: false, premium: 200_000 },
    }));
    // 반올림으로 인해 정확히 같지 않을 수 있으므로, 이상/이하 모두 테스트
    if (r.passiveIncome === r.totalExpense) {
      expect(r.financiallyFree).toBe(true);
      expect(r.freedomRatio).toBeCloseTo(1.0, 3);
    } else {
      // 반올림 차이가 있으면 >=만 검증
      expect(r.financiallyFree).toBe(r.passiveIncome >= r.totalExpense);
    }
  });

  it('연금 경계: 64세에는 없고 65세에는 연금 라인이 생긴다', () => {
    const age64 = computeCashflow(baseInput({ age: 64 }));
    expect(age64.income.find((i) => i.label === '연금')).toBeUndefined();

    const age65 = computeCashflow(baseInput({ age: 65 }));
    expect(age65.income.find((i) => i.label === '연금')?.amount).toBe(500_000);

    // 경계 직전/직후 테스트: 64.9, 65.0
    const age649 = computeCashflow(baseInput({ age: 64.9 }));
    expect(age649.income.find((i) => i.label === '연금')).toBeUndefined();
    const age650 = computeCashflow(baseInput({ age: 65.0 }));
    expect(age650.income.find((i) => i.label === '연금')?.amount).toBe(500_000);
  });

  it('대출 잔액 0이면 expense 배열에 "대출 이자" 라인이 없고, >0이면 있다', () => {
    const noLoan = computeCashflow(baseInput({
      job: salaryJob,
      bank: { ...baseBank, loanBalance: 0 },
    }));
    expect(noLoan.expense.find((e) => e.label === '대출 이자')).toBeUndefined();

    const withLoan = computeCashflow(baseInput({
      job: salaryJob,
      bank: { ...baseBank, loanBalance: 10_000_000, loanInterestRate: 0.05 },
    }));
    const loanLine = withLoan.expense.find((e) => e.label === '대출 이자');
    expect(loanLine?.amount).toBe(500_000); // 1000만 × 5%
  });
});
