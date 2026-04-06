import type { BankAccount } from '../types';

export function createBankAccount(): BankAccount {
  return { balance: 0, interestRate: 0.03 };
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
