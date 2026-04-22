import { CRISIS_EXPENSE_MONTHS_RED, CRISIS_EXPENSE_MONTHS_YELLOW } from '../constants';

export type CrisisLevel = 'safe' | 'yellow' | 'orange' | 'red';

export type CrisisInput = {
  netCashflow: number;     // 월 순현금흐름 (양수=흑자, 음수=적자)
  monthlyExpense: number;  // 월 총 지출
  totalAssets: number;     // 총 자산 (현금+예금+주식+부동산)
  cash: number;            // 현금
};

export function computeCrisisLevel(input: CrisisInput): CrisisLevel {
  const { netCashflow, monthlyExpense, totalAssets, cash } = input;

  // red: 현금 마이너스 + 자산 CRISIS_EXPENSE_MONTHS_RED개월치 미만
  if (cash < -monthlyExpense && totalAssets < monthlyExpense * CRISIS_EXPENSE_MONTHS_RED) {
    return 'red';
  }

  // safe: 흑자 또는 손익 분기
  if (netCashflow >= 0) {
    return 'safe';
  }

  // 이하 적자 상태
  // yellow: 자산 CRISIS_EXPENSE_MONTHS_YELLOW개월치 이상
  if (totalAssets >= monthlyExpense * CRISIS_EXPENSE_MONTHS_YELLOW) {
    return 'yellow';
  }

  // orange: 자산 6개월치 미만
  return 'orange';
}
