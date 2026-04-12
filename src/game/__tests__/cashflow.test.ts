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
    // 기본 age는 18세(유년기 마지막)로 둔다 — 19세+ 부터 발생하는 생활비/세금 기본 라인이
    // 자동으로 추가돼 다른 검증값을 오염시키지 않도록. 성인 케이스는 명시적으로 age를 넘긴다.
    age: 18,
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
    // V3-10: 1단계 6% 적용 → 600만 × 6% = 36만 소득세
    expect(r.totalExpense).toBe(360_000);
    expect(r.netCashflow).toBe(5_640_000);
    expect(r.freedomRatio).toBe(0);
    expect(r.financiallyFree).toBe(false);
    expect(r.income).toHaveLength(1);
    expect(r.income[0].label).toBe('월급');
    expect(r.income[0].passive).toBe(false);
  });

  it('자동수입만 있음: 소득세 18000원이 잡히지만 sustainablePassive로 financiallyFree 판정', () => {
    // V3-10 5단계 누진세 도입 후 30만 이자에도 소득세 6% = 18000 발생.
    // 하지만 sustainablePassive(30만) >= totalExpense(18000)이므로 financiallyFree=true 유지.
    const r = computeCashflow(baseInput({
      job: null,
      bank: { ...baseBank, balance: 10_000_000 }, // 이자 30만
      effectiveInterestRate: 0.03,
    }));
    expect(r.passiveIncome).toBe(300_000);
    expect(r.sustainablePassive).toBe(300_000);
    expect(r.totalExpense).toBe(18_000);
    expect(r.financiallyFree).toBe(true);
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

    // V3-10: 총소득 7,540,000 < 1400만 → 1구간 6% = 452,400
    // 재산세 = 5000만 × 0.3% = 150,000
    const incomeTax = Math.round((salary + interest + dividend + rental) * 0.06);
    const propertyTax = 150_000;
    expect(r.expense.find((e) => e.label === '세금')?.amount).toBe(incomeTax + propertyTax);
    expect(r.totalExpense).toBe(incomeTax + propertyTax);
  });

  it('passiveIncome이 충분히 크면 sustainablePassive 기준으로 financiallyFree=true', () => {
    // V3-10: 이자 150만 × 6% = 9만 소득세. 보험 20만 더해 totalExpense=29만.
    // sustainablePassive 150만 >> 29만 → financiallyFree=true.
    const r = computeCashflow(baseInput({
      job: null,
      bank: { ...baseBank, balance: 50_000_000 },
      effectiveInterestRate: 0.03,
      insurance: { health: true, asset: false, premium: 200_000 },
    }));
    expect(r.passiveIncome).toBe(1_500_000);
    expect(r.sustainablePassive).toBe(1_500_000);
    expect(r.totalExpense).toBe(90_000 + 200_000);
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
    // V3-10: salary 600만 × 6% = 36만 소득세 + 보험 20만 = 56만
    const r = computeCashflow(baseInput({
      job: salaryJob,
      insurance: { health: true, asset: false, premium: 200_000 },
    }));
    expect(r.passiveIncome).toBe(0);
    expect(r.totalExpense).toBe(360_000 + 200_000);
    expect(r.financiallyFree).toBe(false);
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

  it('sustainablePassive === totalExpense 경계에서도 financiallyFree=true', () => {
    // V3-10 후 5단계 누진세에서도 sustainablePassive 기반 판정 그대로.
    // 이자만 충분히 크게 두고 보험료를 늘려 양쪽이 같아지도록.
    // 이자 60만 → 소득세 6% = 36000. 보험료 564000 → 합계 60만.
    const r = computeCashflow(baseInput({
      job: null,
      bank: { ...baseBank, balance: 20_000_000 },
      effectiveInterestRate: 0.03,
      insurance: { health: true, asset: false, premium: 564_000 },
    }));
    expect(r.sustainablePassive).toBe(600_000);
    expect(r.totalExpense).toBe(600_000);
    expect(r.financiallyFree).toBe(true);
    expect(r.freedomRatio).toBeCloseTo(1.0, 3);
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

  it('V4: 유년기(10~18)에 가정 형편이 thrifty/12세면 부모 용돈 480만 라인이 생긴다', () => {
    // thrifty early(10~12) 월 40만 × 12 = 480만
    const r = computeCashflow(baseInput({ age: 12, job: null, householdClass: 'thrifty' }));
    const allowance = r.income.find((i) => i.label === '부모님 용돈');
    expect(allowance?.amount).toBe(4_800_000);
    expect(allowance?.passive).toBe(true);
    // sustainablePassive는 부모 용돈을 제외한다 → 자기 자산 0이면 0
    expect(r.sustainablePassive).toBe(0);
    expect(r.financiallyFree).toBe(false);
  });

  it('V4: average/affluent 가정의 연령대별 용돈 테이블', () => {
    // average mid(13~15) 월 75만 × 12 = 900만
    const avg = computeCashflow(baseInput({ age: 15, job: null, householdClass: 'average' }));
    expect(avg.income.find((i) => i.label === '부모님 용돈')?.amount).toBe(9_000_000);
    // affluent late(16~18) 월 120만 × 12 = 1440만
    const aff = computeCashflow(baseInput({ age: 18, job: null, householdClass: 'affluent' }));
    expect(aff.income.find((i) => i.label === '부모님 용돈')?.amount).toBe(14_400_000);
  });

  it('V3-03: 19세 이상이면 부모 용돈 라인이 사라진다', () => {
    const adult = computeCashflow(baseInput({ age: 19, job: null, householdClass: 'affluent' }));
    expect(adult.income.find((i) => i.label === '부모님 용돈')).toBeUndefined();
  });

  it('V3-03: householdClass 미지정이면 유년기여도 부모 용돈 라인 없음 (구 호출자 호환)', () => {
    const r = computeCashflow(baseInput({ age: 12, job: null }));
    expect(r.income.find((i) => i.label === '부모님 용돈')).toBeUndefined();
  });

  it('V4: 유년기 학원비는 용돈의 65%로 expense 라인에 추가된다 (연령대별)', () => {
    // thrifty early(10~12) 월 40만 × 12 = 480만 × 65%
    const thrifty = computeCashflow(baseInput({ age: 12, job: null, householdClass: 'thrifty' }));
    expect(thrifty.expense.find((e) => e.label === '학원비')?.amount).toBe(Math.round(4_800_000 * 0.65));
    // affluent early(10~12) 월 80만 × 12 = 960만 × 65%
    const aff = computeCashflow(baseInput({ age: 12, job: null, householdClass: 'affluent' }));
    expect(aff.expense.find((e) => e.label === '학원비')?.amount).toBe(Math.round(9_600_000 * 0.65));
  });

  it('V3-03: sustainablePassive에는 부모 용돈/연금이 포함되지 않아 트레이트 오부여를 막는다', () => {
    // 유년기 부모 용돈만으로는 financiallyFree가 되면 안 된다.
    const child = computeCashflow(baseInput({ age: 12, job: null, householdClass: 'affluent' }));
    expect(child.passiveIncome).toBeGreaterThan(0); // 라인 존재
    expect(child.sustainablePassive).toBe(0);
    expect(child.financiallyFree).toBe(false);
    // 65세 연금만으로도 financiallyFree가 되면 안 된다.
    const elder = computeCashflow(baseInput({ age: 65 }));
    expect(elder.passiveIncome).toBeGreaterThan(0);
    expect(elder.sustainablePassive).toBe(0);
    expect(elder.financiallyFree).toBe(false);
  });

  it('V3-08: job.upkeepCost가 있으면 자기계발비 라인이 expense에 추가된다 (월→연 환산)', () => {
    const artist: Job = { ...salaryJob, id: 'artist', upkeepCost: 200_000 };
    const r = computeCashflow(baseInput({ age: 25, job: artist }));
    const upkeep = r.expense.find((e) => e.label === '자기계발비');
    expect(upkeep?.amount).toBe(200_000 * 12);
  });

  it('V3-08: upkeepCost 미정의 직업은 자기계발비 라인 없음', () => {
    const r = computeCashflow(baseInput({ age: 25, job: salaryJob }));
    expect(r.expense.find((e) => e.label === '자기계발비')).toBeUndefined();
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
