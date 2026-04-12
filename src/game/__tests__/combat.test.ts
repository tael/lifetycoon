import { describe, it, expect } from 'vitest';

import {
  buyShares,
  sellShares,
  holdingsValue,
} from '../domain/stock';
import {
  depositBank,
  withdrawBank,
  takeLoan,
  repayLoan,
} from '../domain/bankAccount';

import stocksRaw from '../data/stocks.json';
import type { StockDef, Holding, BankAccount } from '../types';

const stocks = stocksRaw as StockDef[];
const TICKER = stocks[0].ticker; // 'SBE'
const PRICE = 1000;

// ─── 1. buy/sell 연속 호출 – avgBuyPrice 정확성 ────────────────────────────

describe('buyShares / sellShares: avgBuyPrice 정확성', () => {
  it('단일 매수 후 avgBuyPrice = 매수가', () => {
    const { holdings, executed } = buyShares(100_000, [], TICKER, PRICE, 10);
    expect(executed).toBe(true);
    expect(holdings[0].avgBuyPrice).toBe(PRICE);
    expect(holdings[0].shares).toBe(10);
  });

  it('동일 가격 2회 매수 – avgBuyPrice 불변', () => {
    let { cash, holdings } = buyShares(200_000, [], TICKER, PRICE, 10);
    ({ cash, holdings } = buyShares(cash, holdings, TICKER, PRICE, 10));
    expect(holdings[0].avgBuyPrice).toBe(PRICE);
    expect(holdings[0].shares).toBe(20);
  });

  it('다른 가격 2회 매수 – avgBuyPrice 가중평균', () => {
    // 1차: 10주 @ 1000 → 비용 10000
    // 2차: 10주 @ 2000 → 비용 20000
    // 평균: (10000 + 20000) / 20 = 1500
    let { cash, holdings } = buyShares(100_000, [], TICKER, 1000, 10);
    ({ cash, holdings } = buyShares(cash, holdings, TICKER, 2000, 10));
    expect(holdings[0].shares).toBe(20);
    expect(holdings[0].avgBuyPrice).toBe(1500);
  });

  it('매수 후 일부 매도 – avgBuyPrice 유지, 잔여 주수 정확', () => {
    let { cash, holdings } = buyShares(100_000, [], TICKER, 1000, 20);
    const { cash: cash2, holdings: holdings2, executed, profit } = sellShares(cash, holdings, TICKER, 1200, 5);
    expect(executed).toBe(true);
    expect(holdings2[0].shares).toBe(15);
    expect(holdings2[0].avgBuyPrice).toBe(1000); // 평균 매수가 불변
    expect(profit).toBe((1200 - 1000) * 5); // 수익 = 200 × 5
    expect(cash2).toBe(cash + 1200 * 5);
  });

  it('보유 주수 초과 매도 – 거부', () => {
    const { holdings } = buyShares(100_000, [], TICKER, 1000, 5);
    const result = sellShares(0, holdings, TICKER, 1000, 10);
    expect(result.executed).toBe(false);
    expect(result.holdings[0].shares).toBe(5);
  });

  it('전량 매도 후 holdings에서 제거', () => {
    const { cash, holdings } = buyShares(100_000, [], TICKER, 1000, 10);
    const result = sellShares(cash, holdings, TICKER, 1000, 10);
    expect(result.executed).toBe(true);
    expect(result.holdings).toHaveLength(0);
  });

  it('잔액 부족 시 매수 거부', () => {
    const result = buyShares(500, [], TICKER, 1000, 1); // 1000 > 500
    expect(result.executed).toBe(false);
  });

  it('0주 매수 거부', () => {
    const result = buyShares(100_000, [], TICKER, 1000, 0);
    expect(result.executed).toBe(false);
  });

  it('3회 연속 매수 후 avgBuyPrice 가중평균 누적 정확', () => {
    // 10주 @ 1000 = 10000
    // 10주 @ 1500 = 15000
    // 10주 @ 500  = 5000
    // 총 30주 = 30000 → avg = 1000
    let cash = 1_000_000;
    let holdings: Holding[] = [];
    ({ cash, holdings } = buyShares(cash, holdings, TICKER, 1000, 10));
    ({ cash, holdings } = buyShares(cash, holdings, TICKER, 1500, 10));
    ({ cash, holdings } = buyShares(cash, holdings, TICKER, 500, 10));
    expect(holdings[0].shares).toBe(30);
    expect(holdings[0].avgBuyPrice).toBe(1000);
  });
});

// ─── 2. deposit/withdraw 경계값 ──────────────────────────────────────────────

describe('depositBank / withdrawBank: 경계값', () => {
  const baseBank: BankAccount = { balance: 10_000, interestRate: 0.03, loanBalance: 0, loanInterestRate: 0.05 };

  it('0 입금 – 거부', () => {
    const result = depositBank(50_000, baseBank, 0);
    expect(result.executed).toBe(false);
  });

  it('음수 입금 – 거부', () => {
    const result = depositBank(50_000, baseBank, -1000);
    expect(result.executed).toBe(false);
  });

  it('보유 cash 초과 입금 – 거부', () => {
    const result = depositBank(1_000, baseBank, 5_000);
    expect(result.executed).toBe(false);
  });

  it('잔액 전액 입금 성공', () => {
    const result = depositBank(10_000, baseBank, 10_000);
    expect(result.executed).toBe(true);
    expect(result.cash).toBe(0);
    expect(result.bank.balance).toBe(baseBank.balance + 10_000);
  });

  it('0 출금 – 거부', () => {
    const result = withdrawBank(0, baseBank, 0);
    expect(result.executed).toBe(false);
  });

  it('음수 출금 – 거부', () => {
    const result = withdrawBank(0, baseBank, -100);
    expect(result.executed).toBe(false);
  });

  it('잔액 초과 출금 – 거부', () => {
    const result = withdrawBank(0, baseBank, baseBank.balance + 1);
    expect(result.executed).toBe(false);
  });

  it('잔액 전액 출금 성공', () => {
    const result = withdrawBank(0, baseBank, baseBank.balance);
    expect(result.executed).toBe(true);
    expect(result.bank.balance).toBe(0);
    expect(result.cash).toBe(baseBank.balance);
  });
});

// ─── 3. takeLoan 한도 초과 거부 ──────────────────────────────────────────────

describe('takeLoan: 한도 초과 거부', () => {
  const baseBank: BankAccount = { balance: 0, interestRate: 0.03, loanBalance: 0, loanInterestRate: 0.05 };

  it('totalAssets 0 일 때 대출 거부', () => {
    // maxLoan = floor(0 * 0.5) = 0
    const result = takeLoan(0, baseBank, 1, 0);
    expect(result.executed).toBe(false);
  });

  it('한도 내 대출 승인', () => {
    // totalAssets=100000 → maxLoan=50000
    const result = takeLoan(0, baseBank, 30_000, 100_000);
    expect(result.executed).toBe(true);
    expect(result.bank.loanBalance).toBe(30_000);
    expect(result.cash).toBe(30_000);
  });

  it('정확히 한도 금액 대출 승인', () => {
    const result = takeLoan(0, baseBank, 50_000, 100_000);
    expect(result.executed).toBe(true);
  });

  it('한도 1원 초과 대출 거부', () => {
    const result = takeLoan(0, baseBank, 50_001, 100_000);
    expect(result.executed).toBe(false);
  });

  it('기존 대출 잔액 고려한 누적 한도 적용', () => {
    const bankWithLoan: BankAccount = { ...baseBank, loanBalance: 30_000 };
    // maxLoan=50000, remainingLimit=20000
    const result = takeLoan(0, bankWithLoan, 20_001, 100_000);
    expect(result.executed).toBe(false);
  });

  it('0 이하 금액 대출 거부', () => {
    const result = takeLoan(0, baseBank, 0, 100_000);
    expect(result.executed).toBe(false);
    const result2 = takeLoan(0, baseBank, -1000, 100_000);
    expect(result2.executed).toBe(false);
  });
});

// ─── 4. repayLoan 원금 초과 상환 방지 ───────────────────────────────────────

describe('repayLoan: 원금 초과 상환 방지', () => {
  const baseBank: BankAccount = { balance: 0, interestRate: 0.03, loanBalance: 20_000, loanInterestRate: 0.05 };

  it('일부 상환 – loanBalance 감소', () => {
    const result = repayLoan(50_000, baseBank, 5_000);
    expect(result.executed).toBe(true);
    expect(result.bank.loanBalance).toBe(15_000);
    expect(result.cash).toBe(45_000);
  });

  it('정확히 원금 상환 – loanBalance = 0', () => {
    const result = repayLoan(50_000, baseBank, 20_000);
    expect(result.executed).toBe(true);
    expect(result.bank.loanBalance).toBe(0);
  });

  it('원금 초과 금액 입력 – loanBalance만큼만 상환 (초과분 환급 없음)', () => {
    // amount=30000 > loanBalance=20000 → repay=min(30000,20000)=20000
    const result = repayLoan(50_000, baseBank, 30_000);
    expect(result.executed).toBe(true);
    expect(result.bank.loanBalance).toBe(0);
    expect(result.cash).toBe(50_000 - 20_000); // 30000이 아니라 20000만 차감
  });

  it('cash 부족 시 상환 거부', () => {
    const result = repayLoan(1_000, baseBank, 5_000);
    expect(result.executed).toBe(false);
  });

  it('대출 잔액 0일 때 상환 거부', () => {
    const noLoanBank: BankAccount = { ...baseBank, loanBalance: 0 };
    const result = repayLoan(50_000, noLoanBank, 1_000);
    expect(result.executed).toBe(false);
  });

  it('0 상환 거부', () => {
    const result = repayLoan(50_000, baseBank, 0);
    expect(result.executed).toBe(false);
  });
});

// ─── 5. DRIP 활성화 시 배당 재투자 검증 ─────────────────────────────────────

describe('DRIP: 배당 재투자 로직', () => {
  // 게임 엔진에 별도 DRIP 함수가 없으므로 배당 계산 + 재투자 로직을 인라인 구현하여 검증
  function applyDrip(
    cash: number,
    holdings: Holding[],
    prices: Record<string, number>,
    stockDefs: StockDef[],
  ): { cash: number; holdings: Holding[] } {
    let newCash = cash;
    let newHoldings = [...holdings];

    for (const h of holdings) {
      const def = stockDefs.find((s) => s.ticker === h.ticker);
      if (!def || def.dividendRate <= 0) continue;
      const price = prices[h.ticker] ?? h.avgBuyPrice;
      const dividend = Math.floor(h.shares * price * def.dividendRate);
      if (dividend <= 0) continue;
      // 배당금으로 추가 매수 가능 주수
      const sharesToBuy = Math.floor(dividend / price);
      if (sharesToBuy > 0) {
        const result = buyShares(newCash + dividend, newHoldings, h.ticker, price, sharesToBuy);
        if (result.executed) {
          newCash = result.cash - dividend; // 배당금은 외부에서 유입, cash에서 차감 없음
          // 단순화: 배당 재투자로 취득한 주식 반영
          newHoldings = result.holdings;
          newCash = newCash + dividend - sharesToBuy * price; // 잉여 배당금은 cash로
        }
      } else {
        // 배당금 현금 수령
        newCash += dividend;
      }
    }
    return { cash: newCash, holdings: newHoldings };
  }

  it('배당률 > 0인 주식 보유 시 DRIP 후 주수 증가 또는 cash 증가', () => {
    const def = stocks.find((s) => s.dividendRate > 0)!;
    const price = def.basePrice;
    const initHoldings: Holding[] = [{ ticker: def.ticker, shares: 100, avgBuyPrice: price }];
    const prices: Record<string, number> = { [def.ticker]: price };
    const initCash = 0;

    const { cash: newCash, holdings: newHoldings } = applyDrip(initCash, initHoldings, prices, stocks);

    const before = holdingsValue(initHoldings, prices) + initCash;
    const after = holdingsValue(newHoldings, prices) + newCash;

    // 배당 재투자 후 총 가치 >= 이전 (배당금만큼 증가)
    expect(after).toBeGreaterThanOrEqual(before);
    // 주수 증가 또는 cash 증가 중 하나 이상 발생
    const sharesIncreased = newHoldings[0].shares > initHoldings[0].shares;
    const cashIncreased = newCash > initCash;
    expect(sharesIncreased || cashIncreased).toBe(true);
  });

  it('배당률 0인 주식은 DRIP 후 변화 없음', () => {
    const def = stocks.find((s) => s.dividendRate === 0)!;
    if (!def) return; // 배당률 0인 종목 없으면 skip
    const price = def.basePrice;
    const initHoldings: Holding[] = [{ ticker: def.ticker, shares: 100, avgBuyPrice: price }];
    const prices: Record<string, number> = { [def.ticker]: price };

    const { cash: newCash, holdings: newHoldings } = applyDrip(0, initHoldings, prices, stocks);

    expect(newHoldings[0].shares).toBe(100);
    expect(newCash).toBe(0);
  });

  it('주식 미보유 시 DRIP 결과 변화 없음', () => {
    const { cash: newCash, holdings: newHoldings } = applyDrip(50_000, [], {}, stocks);
    expect(newCash).toBe(50_000);
    expect(newHoldings).toHaveLength(0);
  });
});
