import type { BankAccount } from '../types';

export function createBankAccount(): BankAccount {
  return { balance: 0, interestRate: 0.03, loanBalance: 0, loanInterestRate: 0.05 };
}

export function applyInterestForYears(
  bank: BankAccount,
  years: number,
): BankAccount {
  if (years <= 0 || bank.balance <= 0) return bank;
  const newBalance = bank.balance * Math.pow(1 + bank.interestRate, years);
  return { ...bank, balance: Math.round(newBalance) };
}

export function depositBank(
  cash: number,
  bank: BankAccount,
  amount: number,
): { cash: number; bank: BankAccount; executed: boolean } {
  if (amount <= 0 || amount > cash) {
    return { cash, bank, executed: false };
  }
  return {
    cash: cash - amount,
    bank: { ...bank, balance: bank.balance + amount },
    executed: true,
  };
}

export function withdrawBank(
  cash: number,
  bank: BankAccount,
  amount: number,
): { cash: number; bank: BankAccount; executed: boolean } {
  if (amount <= 0 || amount > bank.balance) {
    return { cash, bank, executed: false };
  }
  return {
    cash: cash + amount,
    bank: { ...bank, balance: bank.balance - amount },
    executed: true,
  };
}

export function takeLoan(
  cash: number,
  bank: BankAccount,
  amount: number,
  totalAssets: number,
): { cash: number; bank: BankAccount; executed: boolean } {
  if (amount <= 0) return { cash, bank, executed: false };
  const maxLoan = Math.floor(totalAssets * 0.5);
  const remainingLimit = Math.max(0, maxLoan - bank.loanBalance);
  if (amount > remainingLimit) return { cash, bank, executed: false };
  return {
    cash: cash + amount,
    bank: { ...bank, loanBalance: bank.loanBalance + amount },
    executed: true,
  };
}

export function repayLoan(
  cash: number,
  bank: BankAccount,
  amount: number,
): { cash: number; bank: BankAccount; executed: boolean } {
  if (amount <= 0 || amount > cash || bank.loanBalance <= 0) {
    return { cash, bank, executed: false };
  }
  const repay = Math.min(amount, bank.loanBalance);
  return {
    cash: cash - repay,
    bank: { ...bank, loanBalance: bank.loanBalance - repay },
    executed: true,
  };
}

export function applyLoanInterest(
  bank: BankAccount,
  years: number,
): BankAccount {
  if (years <= 0 || bank.loanBalance <= 0) return bank;
  const newLoanBalance = bank.loanBalance * Math.pow(1 + bank.loanInterestRate, years);
  return { ...bank, loanBalance: Math.round(newLoanBalance) };
}
