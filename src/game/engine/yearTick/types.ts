// yearTick 순수 함수들이 주고받는 인터페이스 정의.
// 기존 domain 타입을 최대한 재사용하고, 단계 간 데이터 전달용만 추가 정의.

import type {
  BankAccount,
  Bond,
  Character,
  Dream,
  Holding,
  Job,
  KeyMoment,
  LifeEvent,
  LoanRecord,
  Phase,
  RealEstate,
  ScenarioEvent,
  StockDef,
} from '../../types';
import type { EconomyCycle } from '../economyCycle';
import type { Season } from '../season';
import type { CrisisLevel } from '../../domain/crisisEngine';

/** costOfLivingMultiplier 반환값 */
export type ColMult = { careBoost: number; decayMult: number };

/** advanceYear 호출 시 get()으로 가져오는 상태 중 필요한 부분 */
export type YearTickState = {
  character: Character;
  cash: number;
  bank: BankAccount;
  holdings: Holding[];
  prices: Record<string, number>;
  job: Job | null;
  dreams: Dream[];
  traits: string[];
  npcs: import('../../types').FriendNPC[];
  keyMoments: KeyMoment[];
  recentLog: LifeEvent[];
  usedScenarioIds: string[];
  assetHistory: { age: number; value: number }[];
  autoInvest: boolean;
  insurance: import('../../types').Insurance;
  realEstate: RealEstate[];
  bonds: Bond[];
  economyCycle: EconomyCycle;
  unlockedSkills: string[];
  parentalInvestment: number;
  parentalRepaymentBase: number | null;
  educationEndAge: number;
  totalTaxPaid: number;
  crisisTurns: number;
  loanHistory: LoanRecord[];
  cashflowHistory: { age: number; netMonthly: number }[];
  costOfLivingRatio: number;
  choiceHistory: { scenarioId: string; choiceIndex: number; age: number }[];
  currentSeason: Season;
  dripEnabled: boolean;
  dividendRates: Record<string, number>;
  phase: Phase;
  boomTimeBillionaireReached: boolean;
  survivedRecessionWithAssets: boolean;
  lastJobChangeAge: number | null;
};

export type AgeAndDecayResult = {
  character: Character;
  job: Job | null;
  lastJobChangeAge: number | null;
  colMult: ColMult;
  cfRatio: number;
  /** 경기사이클 스텝 결과 */
  economyCycle: EconomyCycle;
  cycleChanged: boolean;
  driftBonus: number;
  newBaseInterestRate: number;
  /** 스탯 패널티 (투자 수익률 차감용) */
  statPenalty: { salaryMult: number; returnMult: number };
  /** toast 메시지 (강제 직업 변경 시) */
  toasts: { message: string; icon: string; type: 'info' | 'warning'; duration: number }[];
};

export type MonthlyLoopResult = {
  cash: number;
  bankBalance: number;
  loanBalance: number;
  holdings: Holding[];
  character: Character;
  parentalInvestment: number;
  parentalRepaymentBase: number | null;
  /** 연간 합계들 (세금/위기 판정용) */
  totalSalaryIncome: number;
  totalDividendIncome: number;
  totalPensionIncome: number;
  totalRentalIncome: number;
  totalAllowanceIncome: number;
  totalExpenses: number;
  dripSpent: number;
  /** 마이너스 잔고 발생 시 로그 */
  overdraftLog: LifeEvent[];
  /** 세금 계산용 상수 */
  insuranceCost: number;
  academyExpense: number;
  costOfLivingExpense: number;
  upkeepExpense: number;
  repaymentExpense: number;
  grossPeriodIncome: number;
};

export type AnnualSettlementResult = {
  prices: Record<string, number>;
  holdings: Holding[];
  dividendRates: Record<string, number>;
  splitEvents: { ticker: string; name: string; ratio: number }[];
  npcs: import('../../types').FriendNPC[];
  realEstate: RealEstate[];
  bonds: Bond[];
  couponCash: number;
  principalCash: number;
  /** 세금 */
  incomeTax: number;
  propertyTax: number;
  totalTax: number;
  /** auto-invest 비용 */
  autoInvestSpent: number;
  /** 최종 현금 (세금/채권/auto-invest 반영) */
  finalCash: number;
  totalTaxPaid: number;
};

export type CrisisResult = {
  crisisLevel: CrisisLevel;
  crisisTurns: number;
  character: Character;
  finalCash: number;
  holdings: Holding[];
  realEstate: RealEstate[];
  bank: BankAccount;
  /** 강제 매각 로그 */
  forcedSaleLog: LifeEvent[];
  /** 정부 대출 로그 */
  govLoanLog: LifeEvent[];
  /** 정부 대출 기록 (loanHistory 추가용) */
  govLoanRecord: LoanRecord | null;
};

export type LogResult = {
  dreams: Dream[];
  keyMoments: KeyMoment[];
  recentLog: LifeEvent[];
  assetHistory: { age: number; value: number }[];
  cashflowHistory: { age: number; netMonthly: number }[];
  currentSeason: Season;
  phase: Phase;
  boomTimeBillionaireReached: boolean;
  survivedRecessionWithAssets: boolean;
  splitNotices: string[];
  emoji: string;
};

/** STOCKS/JOBS/SCENARIOS 같은 마스터 데이터 + RNG 스트림 */
export type YearTickContext = {
  stocks: StockDef[];
  jobs: Job[];
  scenarios: ScenarioEvent[];
  streams: {
    stock: () => number;
    event: () => number;
    npc: () => number;
    misc: () => number;
  };
};
