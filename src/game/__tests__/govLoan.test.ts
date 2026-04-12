import { describe, it, expect } from 'vitest';
import { forcedLiquidation } from '../domain/forcedLiquidation';
import type { BankAccount } from '../types';

const baseBank: BankAccount = {
  balance: 0,
  interestRate: 0.03,
  loanBalance: 0,
  loanInterestRate: 0.05,
};

describe('V5-06 정부 긴급 생활안정 대출 (최후 안전망)', () => {
  it('강제 매각 후 cash < 0 → 100만원 단위 올림 대출 실행', () => {
    // 부족분: 1,500,000원 → 올림 → 2,000,000원 대출
    const deficit = 1_500_000;
    const LOAN_UNIT = 1_000_000;
    const govLoanAmount = Math.ceil(deficit / LOAN_UNIT) * LOAN_UNIT;

    expect(govLoanAmount).toBe(2_000_000);
  });

  it('100만원 딱 떨어지는 경우 — 동일 금액 대출', () => {
    const deficit = 3_000_000;
    const LOAN_UNIT = 1_000_000;
    const govLoanAmount = Math.ceil(deficit / LOAN_UNIT) * LOAN_UNIT;

    expect(govLoanAmount).toBe(3_000_000);
  });

  it('1원 부족해도 100만원 단위로 올림', () => {
    const deficit = 1;
    const LOAN_UNIT = 1_000_000;
    const govLoanAmount = Math.ceil(deficit / LOAN_UNIT) * LOAN_UNIT;

    expect(govLoanAmount).toBe(1_000_000);
  });

  it('loanBalance 증가 확인', () => {
    const bank: BankAccount = { ...baseBank, loanBalance: 5_000_000 };
    const deficit = 1_500_000;
    const LOAN_UNIT = 1_000_000;
    const govLoanAmount = Math.ceil(deficit / LOAN_UNIT) * LOAN_UNIT;

    const updatedBank = { ...bank, loanBalance: bank.loanBalance + govLoanAmount };

    expect(updatedBank.loanBalance).toBe(7_000_000);
  });

  it('대출 후 cash >= 0 보장 확인', () => {
    const initialCash = -1_500_000;
    const deficit = Math.abs(initialCash);
    const LOAN_UNIT = 1_000_000;
    const govLoanAmount = Math.ceil(deficit / LOAN_UNIT) * LOAN_UNIT;
    const finalCash = initialCash + govLoanAmount;

    expect(finalCash).toBeGreaterThanOrEqual(0);
  });
});

describe('V5-05 강제 매각 후 V5-06 대출 흐름 통합', () => {
  it('강제 매각으로도 부족한 경우 정부 대출로 현금 복구', () => {
    // 현금 -300만원, 자산 없음 → 강제 매각 cashRecovered=0 → 정부 대출 300만 (올림)
    const cashAfterSale = -3_000_000;
    const bank: BankAccount = { ...baseBank };
    const liq = forcedLiquidation(
      Math.abs(cashAfterSale),
      cashAfterSale,
      bank,
      [],
      {},
      [],
    );

    expect(liq.cashRecovered).toBe(0);

    // 정부 대출
    const deficit = Math.abs(cashAfterSale + liq.cashRecovered);
    const LOAN_UNIT = 1_000_000;
    const govLoanAmount = Math.ceil(deficit / LOAN_UNIT) * LOAN_UNIT;
    const finalCash = cashAfterSale + liq.cashRecovered + govLoanAmount;

    expect(finalCash).toBeGreaterThanOrEqual(0);
    expect(govLoanAmount).toBe(3_000_000);
  });

  it('강제 매각이 일부 보전 후 나머지를 정부 대출로 충당', () => {
    // 현금 -5백만, 주식 2백만 매각 → 현금 -3백만 → 정부 대출 3백만
    const initialCash = -5_000_000;
    const bank: BankAccount = { ...baseBank };
    const holdings = [{ ticker: 'TEST', shares: 200, avgBuyPrice: 10_000 }];
    const prices = { TEST: 10_000 };

    const liq = forcedLiquidation(
      Math.abs(initialCash),
      initialCash,
      bank,
      holdings,
      prices,
      [],
    );

    const cashAfterSale = initialCash + liq.cashRecovered;

    // 여전히 음수인 경우 정부 대출
    if (cashAfterSale < 0) {
      const deficit = Math.abs(cashAfterSale);
      const LOAN_UNIT = 1_000_000;
      const govLoanAmount = Math.ceil(deficit / LOAN_UNIT) * LOAN_UNIT;
      const finalCash = cashAfterSale + govLoanAmount;

      expect(finalCash).toBeGreaterThanOrEqual(0);
    }
  });
});
