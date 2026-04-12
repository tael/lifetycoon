import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  BankAccount,
  Bond,
  Character,
  Dream,
  EconomicEvent,
  Ending,
  EventChoice,
  FriendNPC,
  Holding,
  Insurance,
  Job,
  KeyMoment,
  LifeEvent,
  LoanRecord,
  Phase,
  RealEstate,
  ScenarioEvent,
  Seeds,
  StockDef,
} from '../game/types';
import { REAL_ESTATE_LISTINGS, appreciateValue } from '../game/domain/realEstate';
import { calculateAcquisitionTax, calculateCapitalGainsTax } from '../game/domain/realEstateTax';
import { BOND_LISTINGS, applyBondCoupon } from '../game/domain/bond';
import { SKILLS } from '../game/domain/skills';
import { createCharacter, emojiFor, computeStatPenalty } from '../game/domain/character';
import {
  ACADEMY_RATIO,
  getYearlyParentalAllowance,
  pickRandomHouseholdClass,
} from '../game/domain/household';
import { computeCostOfLiving } from '../game/domain/costOfLiving';
import { ageSalaryMultiplier } from '../game/domain/salaryCurve';
import {
  REPAYMENT_START_AGE,
  computeParentalRepaymentBase,
  parentalRepaymentForAge,
} from '../game/domain/parentalRepayment';
import { computePensionYearly } from '../game/domain/pension';
import { createBankAccount, takeLoan, repayLoan } from '../game/domain/bankAccount';
import { applyChoice, pruneKeyMoments } from '../game/scenario/scenarioEngine';
import { evaluateCondition, checkAndMarkDreams } from '../game/domain/dream';
import { nextPrice } from '../game/domain/stock';
import { createStreams, randomSeeds, type RngStreams } from '../game/engine/prng';
import {
  createEconomyCycle,
  stepEconomyCycle,
  PHASE_DRIFT_BONUS,
  getEffectiveInterestRate,
  dynamicListingPrice,
  dynamicMonthlyRent,
  type EconomyCycle,
} from '../game/engine/economyCycle';
import { createNpcFromSeed, stepNpc } from '../game/domain/npc';
import { buildEnding, type EndingExtras } from '../game/domain/ending';
import { type Season, seasonFromYearIndex, SEASON_KO, SEASON_EMOJI } from '../game/engine/season';
import {
  pickEligibleEvent,
  eventChancePerYear,
  type DispatchContext,
} from '../game/engine/eventDispatcher';
import { calculateIncomeTax, calculatePropertyTax } from '../game/engine/tax';
import type { ChallengeMode } from '../game/engine/challengeMode';
import { computeCrisisLevel } from '../game/domain/crisisEngine';
import { forcedLiquidation } from '../game/domain/forcedLiquidation';
import { formatWon } from '../game/domain/asset';
import stocksData from '../game/data/stocks.json';
import jobsData from '../game/data/jobs.json';
import dreamsData from '../game/data/dreams.json';
import npcsData from '../game/data/npcs.json';
import epitaphTemplates from '../game/data/epitaphTemplates.json';

const STOCKS: StockDef[] = stocksData as StockDef[];
const JOBS: Job[] = jobsData as Job[];
const DREAMS_MASTER: Dream[] = dreamsData as Dream[];
const NPCS_RAW = npcsData as { id: string; name: string; personality: FriendNPC['personality']; iconEmoji: string }[];

// scenarios.json lazy load — populated before first game start
let SCENARIOS: ScenarioEvent[] = [];
let _scenariosLoaded = false;

export async function loadScenarios(): Promise<void> {
  if (_scenariosLoaded) return;
  const mod = await import('../game/data/scenarios.json');
  SCENARIOS = mod.default as ScenarioEvent[];
  _scenariosLoaded = true;
  // sync scenariosMaster into store if already initialised
  useGameStore.setState({ scenariosMaster: SCENARIOS });
}

const KEY_MOMENT_LIMIT = 30;
const RECENT_LOG_LIMIT = 100;

export type GameStoreState = {
  schemaVersion: 1;
  phase: Phase;
  character: Character;
  cash: number;
  bank: BankAccount;
  holdings: Holding[];
  prices: Record<string, number>;
  job: Job | null;
  dreams: Dream[];
  traits: string[];
  npcs: FriendNPC[];
  keyMoments: KeyMoment[];
  recentLog: LifeEvent[];
  seeds: Seeds;
  usedScenarioIds: string[];
  assetHistory: { age: number; value: number }[];
  autoInvest: boolean;
  insurance: Insurance;
  realEstate: RealEstate[];
  bonds: Bond[];
  ending: Ending | null;
  lastJobChangeAge: number | null;
  economyCycle: EconomyCycle;
  hadLoan: boolean;
  loanFullyRepaid: boolean;
  boomTimeBillionaireReached: boolean;
  survivedRecessionWithAssets: boolean;
  unlockedSkills: string[];
  /** V3-05: 유년기 동안 부모가 캐릭터에게 지급한 용돈 누계 (학원비 차감 전 총액). */
  parentalInvestment: number;
  /**
   * V3-09: 부모님 용돈 되돌림 연 지급액. 20세 첫 틱에 1회 산정해 60세까지 고정.
   * null이면 아직 산정 전 (유년기/19세 미만).
   */
  parentalRepaymentBase: number | null;
  /**
   * V5-02: 학업 종료 나이. 부모 용돈·학원비 수령 기간과 되돌림 부담을 결정한다.
   * - 19: 고졸 (기본값)
   * - 23: 대학
   * - 26: 대학원
   * 시나리오에서 변경 가능. 기본값 19 → 기존 동작과 완전 호환.
   */
  educationEndAge: number;
  /** V3-11: 누적 납세액 (소득세 + 재산세). 리셋 시 0. */
  totalTaxPaid: number;
  /** V5-04: 위기 상태(orange 이상)에서 보낸 누적 연수. */
  crisisTurns: number;
  /** 대출 이력. 은행 자발적·이벤트 강제·정부 긴급 대출을 모두 기록한다. */
  loanHistory: LoanRecord[];
  /** 연도별 월 순현금흐름 히스토리. 매년 advanceYear 에서 추가. 최대 90개(10~100세). */
  cashflowHistory: { age: number; netMonthly: number }[];
  choiceHistory: { scenarioId: string; choiceIndex: number; age: number }[];
  currentSeason: Season;
  dripEnabled: boolean;
  // Transient
  speedMultiplier: 0.5 | 1 | 2;
  activeChallengeId: string | null;
  pendingGender: 'male' | 'female' | null;
  // Derived/static
  stocksMaster: StockDef[];
  jobsMaster: Job[];
  scenariosMaster: ScenarioEvent[];
  // Actions
  startNewGame: (name: string, pickedDreamIds: string[], customSeed?: number, challengeModifier?: ChallengeMode['modifier'] & { challengeId?: string }, legacyCash?: number, legacyParentName?: string, gender?: 'male' | 'female') => void;
  goTo: (phase: Phase) => void;
  pickDreams: (ids: string[]) => void;
  advanceYear: (intAge: number, deltaYears: number) => void;
  triggerEvent: (ev: EconomicEvent) => void;
  chooseOption: (choiceIndex: number) => { warnings: string[]; timeCostMonths: number };
  buy: (ticker: string, shares: number) => boolean;
  sell: (ticker: string, shares: number) => boolean;
  deposit: (amount: number) => boolean;
  withdraw: (amount: number) => boolean;
  takeLoan: (amount: number) => boolean;
  repayLoan: (amount: number) => boolean;
  setSpeed: (s: 0.5 | 1 | 2) => void;
  changeJob: (jobId: string) => { success: boolean; reason?: string };
  toggleInsurance: (type: 'health' | 'asset') => void;
  toggleDrip: () => void;
  buyRealEstate: (id: string) => { success: boolean; acquisitionTax: number };
  sellRealEstate: (index: number) => { success: boolean; capitalGainsTax: number };
  buyBond: (id: string) => boolean;
  endGame: () => void;
  resetAll: () => void;
  unlockSkill: (skillId: string) => boolean;
  loadSnapshot: (s: Partial<GameStoreState>) => void;
};

function initialPrices(): Record<string, number> {
  const p: Record<string, number> = {};
  for (const s of STOCKS) p[s.ticker] = s.basePrice;
  return p;
}

function freshDreams(pickedIds: string[]): Dream[] {
  return DREAMS_MASTER.filter((d) => pickedIds.includes(d.id)).map((d) => ({
    ...d,
    achieved: false,
  }));
}

function freshNpcs(): FriendNPC[] {
  // Fisher-Yates shuffle → 32명 풀에서 랜덤 10명 선택
  const pool = [...NPCS_RAW];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 10).map((n) =>
    createNpcFromSeed(n.id, n.name, n.personality, n.iconEmoji),
  );
}

function makeInitialState(): Omit<GameStoreState, keyof GameStoreActions> {
  return {
    schemaVersion: 1 as const,
    phase: { kind: 'title' },
    character: createCharacter('친구'),
    cash: 50000,
    bank: createBankAccount(),
    holdings: [],
    prices: initialPrices(),
    job: JOBS.find((j) => j.id === 'student') ?? null,
    dreams: [],
    traits: [],
    npcs: freshNpcs(),
    keyMoments: [],
    recentLog: [],
    seeds: randomSeeds(),
    usedScenarioIds: [],
    assetHistory: [{ age: 10, value: 50000 }],
    autoInvest: false,
    insurance: { health: false, asset: false, premium: 0 },
    realEstate: [],
    bonds: [],
    ending: null,
    lastJobChangeAge: null,
    economyCycle: createEconomyCycle(() => Math.random()),
    hadLoan: false,
    loanFullyRepaid: false,
    boomTimeBillionaireReached: false,
    survivedRecessionWithAssets: false,
    unlockedSkills: [],
    parentalInvestment: 0,
    parentalRepaymentBase: null,
    educationEndAge: 19,
    totalTaxPaid: 0,
    crisisTurns: 0,
    loanHistory: [],
    cashflowHistory: [],
    choiceHistory: [],
    currentSeason: 'spring' as Season,
    dripEnabled: false,
    speedMultiplier: 1,
    activeChallengeId: null,
    pendingGender: null,
    stocksMaster: STOCKS,
    jobsMaster: JOBS,
    scenariosMaster: SCENARIOS,
  };
}

type GameStoreActions = Pick<
  GameStoreState,
  | 'startNewGame'
  | 'goTo'
  | 'pickDreams'
  | 'advanceYear'
  | 'triggerEvent'
  | 'chooseOption'
  | 'buy'
  | 'sell'
  | 'deposit'
  | 'withdraw'
  | 'takeLoan'
  | 'repayLoan'
  | 'setSpeed'
  | 'changeJob'
  | 'toggleInsurance'
  | 'toggleDrip'
  | 'buyRealEstate'
  | 'sellRealEstate'
  | 'buyBond'
  | 'endGame'
  | 'resetAll'
  | 'unlockSkill'
  | 'loadSnapshot'
>;

// Single shared stream per game (recreated from seeds)
let streams: RngStreams = createStreams(randomSeeds());

export const useGameStore = create<GameStoreState>()(
  subscribeWithSelector((set, get) => ({
    ...makeInitialState(),
    startNewGame(name, pickedDreamIds, customSeed?, challengeModifier?, legacyCash?, legacyParentName?, gender?) {
      const seeds = randomSeeds(customSeed);
      streams = createStreams(seeds);
      const base = makeInitialState();
      const startCash = (challengeModifier?.startCash ?? base.cash) + (legacyCash ?? 0);
      const speedMultiplier = challengeModifier?.speedLock ?? base.speedMultiplier;
      const activeChallengeId = challengeModifier?.challengeId ?? null;
      const legacyMoment: KeyMoment[] = legacyCash && legacyCash > 0 && legacyParentName
        ? [{
            age: 10,
            importance: 0.9,
            text: `부모 ${legacyParentName}의 유산 ${legacyCash.toLocaleString()}원을 물려받았다`,
            tag: '유년기',
          }]
        : [];
      const resolvedGender: 'male' | 'female' = gender ?? get().pendingGender ?? (Math.random() < 0.5 ? 'male' : 'female');
      // v0.3.0: 가정 형편은 시작 시 1회 랜덤으로 확정. streams.misc 사용 → seed 기반 결정론.
      const householdClass = pickRandomHouseholdClass(streams.misc);
      const startCharacter = { ...createCharacter(name, resolvedGender), householdClass };

      // 새 게임 시작 시 URL 파라미터 클리어 (공유 코드 제거)
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname);
      }

      set({
        ...base,
        seeds,
        character: startCharacter,
        dreams: freshDreams(pickedDreamIds),
        phase: { kind: 'playing' },
        cash: startCash,
        assetHistory: [{ age: 10, value: startCash }],
        speedMultiplier,
        activeChallengeId,
        keyMoments: legacyMoment,
      });
    },
    goTo(phase) {
      set({ phase });
    },
    pickDreams(ids) {
      set({ dreams: freshDreams(ids) });
    },
    advanceYear(intAge, deltaYears) {
      const st = get();
      // 1) Age up + natural stat decay (tamagotchi mechanic, gentle for kids)
      const happyDecay = intAge > 70 ? 1.2 : intAge > 50 ? 0.8 : 0.4;
      const healthDecay = intAge > 70 ? 1.0 : intAge > 50 ? 0.5 : 0.15;
      const character = {
        ...st.character,
        age: intAge,
        happiness: Math.max(10, st.character.happiness - happyDecay * deltaYears),
        health: Math.max(10, st.character.health - healthDecay * deltaYears),
      };
      // 2) Economy cycle step
      const { cycle: economyCycle, changed: cycleChanged } = stepEconomyCycle(
        st.economyCycle,
        deltaYears,
        streams.misc,
      );
      const driftBonus = PHASE_DRIFT_BONUS[economyCycle.phase];

      // ── 월별 분할 처리 ──────────────────────────────────────────────
      // 기존 연 단위 일괄 계산을 12개월 루프로 분할하여 월별 현금흐름을 반영한다.
      // 연 1회 처리 항목(세금, 주가 변동, NPC, 이벤트 등)은 루프 밖에서 처리.
      const totalMonths = Math.round(deltaYears * 12);

      // 연초에 한 번 계산하는 상수들
      const effectiveInterestRate = getEffectiveInterestRate(
        st.bank.interestRate,
        economyCycle.phase,
        st.unlockedSkills.includes('finance_101'),
      );
      const monthlyInterestRate = Math.pow(1 + effectiveInterestRate, 1 / 12) - 1;
      const salaryBonus = st.unlockedSkills.includes('negotiation') ? 1.1 : 1;
      const inflationMultiplier = intAge > 30 ? 1 + 0.02 * (intAge - 30) : 1;
      const statPenalty = computeStatPenalty(character);
      const monthlySalary = st.job
        ? Math.round(st.job.salary * ageSalaryMultiplier(intAge, st.job.id) * salaryBonus * inflationMultiplier * statPenalty.salaryMult)
        : 0;
      const careerCount = st.usedScenarioIds.filter(
        (id) => id.includes('job') || id.includes('career') || id.includes('part_time'),
      ).length + 1;
      const pensionYearly = computePensionYearly(intAge, careerCount, inflationMultiplier, 1);
      const monthlyPension = Math.round(pensionYearly / 12);
      const monthlyRental = st.realEstate.reduce((sum, re) => sum + re.monthlyRent, 0);

      const educationEndAge = st.educationEndAge ?? 19;
      const isChildhood = intAge >= 10 && intAge < educationEndAge;
      const householdClassForTick = character.householdClass;
      const yearlyAllowanceForAge = isChildhood && householdClassForTick
        ? getYearlyParentalAllowance(householdClassForTick, intAge)
        : 0;
      const monthlyAllowance = Math.round(yearlyAllowanceForAge / 12);
      const monthlyAcademy = Math.round(yearlyAllowanceForAge * ACADEMY_RATIO / 12);

      const baseSalaryYearly = st.job ? Math.round(st.job.salary * ageSalaryMultiplier(intAge, st.job.id) * 12) : 0;
      const costOfLivingYearly = computeCostOfLiving(intAge, baseSalaryYearly);
      const monthlyCostOfLiving = Math.round(costOfLivingYearly / 12);

      const monthlyUpkeep = st.job?.upkeepCost ?? 0;
      const monthlyInsurance = Math.round(st.insurance.premium / 12);

      const isStudent = st.job?.id === 'student';
      let parentalRepaymentBase = st.parentalRepaymentBase;
      if (!isStudent && parentalRepaymentBase == null && intAge >= REPAYMENT_START_AGE) {
        parentalRepaymentBase = computeParentalRepaymentBase(
          st.parentalInvestment,
          inflationMultiplier,
        );
      }
      const repaymentYearly = !isStudent && parentalRepaymentBase != null
        ? parentalRepaymentForAge(intAge, parentalRepaymentBase)
        : 0;
      const monthlyRepayment = Math.round(repaymentYearly / 12);

      // STOCKS 사전 매핑 (O(N)→O(1)) — 루프 밖에서 한 번만 생성
      const stockMap: Record<string, (typeof STOCKS)[number]> = Object.fromEntries(
        STOCKS.map((s) => [s.ticker, s]),
      );

      // 월별 누적 변수
      let mCash = st.cash;
      let mBankBalance = st.bank.balance;
      let mLoanBalance = st.bank.loanBalance;
      let mHoldings = [...st.holdings];
      let mTotalAllowance = 0; // 유년기 부모 용돈 누적 (parentalInvestment용)
      let mTotalSalaryIncome = 0; // 연간 급여 총액 (auto-invest, 세금용)
      let mTotalDividendIncome = 0; // 연간 배당 총액 (세금용)
      let mTotalPensionIncome = 0; // 연간 연금 총액 (세금용)
      let mTotalRentalIncome = 0; // 연간 임대 총액 (세금용)
      let mTotalExpenses = 0; // 연간 지출 총액 (위기 판정용) — 실제 차감된 값으로 누적
      let mDripSpent = 0; // DRIP 비용 누적

      const CASH_FLOOR = -500_000_000; // -5억 하한
      const overdraftLogEntry: LifeEvent[] = [];

      for (let m = 0; m < totalMonths; m++) {
        // ── 월 수입 ──
        // 월급 (이미 월 단위)
        mCash += monthlySalary;
        mTotalSalaryIncome += monthlySalary;

        // 예금 이자 (월 복리)
        if (mBankBalance > 0) {
          const monthlyInterest = Math.round(mBankBalance * monthlyInterestRate);
          mBankBalance += monthlyInterest;
        }

        // 배당 (연 배당률 / 12)
        let monthlyDividend = 0;
        for (const h of mHoldings) {
          const stockDef = stockMap[h.ticker];
          const divRate = stockDef?.dividendRate ?? 0;
          if (divRate <= 0) continue;
          const price = st.prices[h.ticker] ?? 0;
          const div = Math.round(price * h.shares * divRate / 12);
          monthlyDividend += div;
        }
        mCash += monthlyDividend;
        mTotalDividendIncome += monthlyDividend;

        // 임대 수입 (이미 월 단위)
        mCash += monthlyRental;
        mTotalRentalIncome += monthlyRental;

        // 연금 (연 금액 / 12)
        mCash += monthlyPension;
        mTotalPensionIncome += monthlyPension;

        // 부모님 용돈 (유년기)
        mCash += monthlyAllowance;
        mTotalAllowance += monthlyAllowance;

        // ── 월 지출 ──
        const monthExpense = monthlyCostOfLiving + monthlyInsurance + monthlyAcademy + monthlyUpkeep + monthlyRepayment;
        mCash -= monthlyCostOfLiving;
        mCash -= monthlyInsurance;
        mCash -= monthlyAcademy;
        mCash -= monthlyUpkeep;
        mCash -= monthlyRepayment;
        mTotalExpenses += monthExpense; // 실제 차감된 값으로 누적 (반올림 오차 없음)

        // 대출 이자 (월 복리)
        if (mLoanBalance > 0) {
          const loanMonthlyRate = st.bank.loanInterestRate / 12;
          const loanInterest = Math.round(mLoanBalance * loanMonthlyRate);
          mLoanBalance += loanInterest;
        }

        // 자유입출금통장 이자 (양수: 연 0.1% 가산, 음수: 마이너스통장 이자 차감)
        if (mCash > 0) {
          const cashInterest = Math.round(mCash * 0.001 / 12);
          mCash += cashInterest;
        } else if (mCash < 0) {
          const overdraftRate = st.bank.loanInterestRate + 0.01;
          const overdraftInterest = Math.round(Math.abs(mCash) * overdraftRate / 12);
          mCash = Math.max(mCash - overdraftInterest, CASH_FLOOR);
        }

        // DRIP (월 배당분으로 매수) — 현금이 0 이하면 스킵
        if (st.dripEnabled && monthlyDividend > 0 && mCash > 0) {
          for (let hi = 0; hi < mHoldings.length; hi++) {
            const h = mHoldings[hi];
            const stockDef = stockMap[h.ticker]; // O(1) 조회
            const divRate = stockDef?.dividendRate ?? 0;
            if (divRate <= 0) continue;
            const price = st.prices[h.ticker] ?? 0;
            if (price <= 0) continue;
            const div = Math.round(price * h.shares * divRate / 12);
            const additionalShares = Math.floor(div / price);
            if (additionalShares <= 0) continue;
            const cost = additionalShares * price;
            if (mCash < cost) continue; // 현금 부족 시 스킵
            mCash -= cost;
            mDripSpent += cost;
            const totalShares = h.shares + additionalShares;
            const newAvg = Math.round(
              (h.avgBuyPrice * h.shares + price * additionalShares) / totalShares,
            );
            // in-place mutate — 매월 새 배열 생성 대신 직접 수정
            mHoldings[hi] = { ticker: h.ticker, shares: totalShares, avgBuyPrice: newAvg };
          }
        }
      }
      // ── 월별 루프 종료 ──────────────────────────────────────────────

      // 마이너스통장 로그 (연 1회, 연초 대비 현금이 마이너스면)
      if (mCash < 0 && st.cash >= 0) {
        overdraftLogEntry.push({
          age: intAge,
          text: `⚠️ 마이너스 잔고 발생`,
          timestamp: Date.now(),
        });
      }

      // bank 결산: 월별 복리로 계산된 balance와 loanBalance 반영
      const bank: BankAccount = {
        ...st.bank,
        balance: Math.round(mBankBalance),
        loanBalance: Math.round(mLoanBalance),
      };

      // 연간 합계 (세금/위기 판정용)
      const salaryIncome = mTotalSalaryIncome;
      const dividendIncome = mTotalDividendIncome;
      const pensionIncome = mTotalPensionIncome;
      const rentalIncome = mTotalRentalIncome;
      const allowanceIncome = mTotalAllowance;
      const insuranceCost = Math.round(st.insurance.premium * deltaYears);
      const academyExpense = Math.round(yearlyAllowanceForAge * ACADEMY_RATIO * deltaYears);
      const costOfLivingExpense = Math.round(costOfLivingYearly * deltaYears);
      const upkeepExpense = st.job?.upkeepCost
        ? Math.round(st.job.upkeepCost * 12 * deltaYears)
        : 0;
      const repaymentExpense = Math.round(repaymentYearly * deltaYears);

      // 4) Stock price drift (with economy cycle bonus + stat penalty) — 연 1회
      const prices: Record<string, number> = { ...st.prices };
      const driftAdj = driftBonus + statPenalty.returnMult;
      for (const s of STOCKS) {
        const adjustedStock = driftAdj !== 0
          ? { ...s, drift: s.drift + driftAdj }
          : s;
        prices[s.ticker] = nextPrice(prices[s.ticker], adjustedStock, streams.stock, deltaYears);
      }
      // 5) NPC step - 플레이어 총자산 기반 catch-up — 연 1회
      const playerStocksVal = mHoldings.reduce((s, h) => s + (prices[h.ticker] ?? 0) * h.shares, 0);
      const playerAssets = mCash + bank.balance + playerStocksVal + st.realEstate.reduce((s, re) => s + re.currentValue, 0) + st.bonds.reduce((s, b) => s + b.faceValue, 0);
      const npcs = st.npcs.map((n) => stepNpc(n, intAge, streams.npc, playerAssets));
      // 5b) Auto-invest: 10% of salary into random stocks — 연 1회
      let autoInvestSpent = 0;
      let autoHoldings = mHoldings;
      if (st.autoInvest && salaryIncome > 0) {
        const budget = Math.round(salaryIncome * 0.1);
        const affordable = STOCKS.filter((s) => prices[s.ticker] <= budget);
        if (affordable.length > 0) {
          const pick = affordable[Math.floor(streams.misc() * affordable.length)];
          const shares = Math.max(1, Math.floor(budget / prices[pick.ticker]));
          const cost = shares * prices[pick.ticker];
          autoInvestSpent = cost;
          const existing = autoHoldings.find((h) => h.ticker === pick.ticker);
          if (existing) {
            const total = existing.shares + shares;
            const avg = Math.round((existing.avgBuyPrice * existing.shares + prices[pick.ticker] * shares) / total);
            autoHoldings = autoHoldings.map((h) =>
              h.ticker === pick.ticker ? { ticker: pick.ticker, shares: total, avgBuyPrice: avg } : h,
            );
          } else {
            autoHoldings = [...autoHoldings, { ticker: pick.ticker, shares, avgBuyPrice: prices[pick.ticker] }];
          }
        }
      }

      // Real estate: appreciate values — 연 1회
      const appreciatedRealEstate = st.realEstate.map((re) => appreciateValue(re, deltaYears, streams.misc));
      // 채권 쿠폰/원금 상환 — 연 1회
      const { bonds: updatedBonds, couponCash, principalCash } = applyBondCoupon(st.bonds, intAge, deltaYears);

      // 세금 계산 — 연말 1회 정산
      const grossPeriodIncome = salaryIncome + dividendIncome + pensionIncome + Math.round(rentalIncome);
      const realEstateValueForTax = st.realEstate.reduce((sum, re) => sum + re.currentValue, 0);
      const interestIncome = Math.max(0, Math.round(mBankBalance) - st.bank.balance);
      const taxableIncome = grossPeriodIncome + interestIncome + couponCash;
      const avgYearlyTaxable = deltaYears > 0 ? taxableIncome / deltaYears : taxableIncome;
      const incomeTax = Math.round(calculateIncomeTax(avgYearlyTaxable) * deltaYears);
      const propertyTax = Math.round(calculatePropertyTax(realEstateValueForTax) * deltaYears);
      const totalTax = incomeTax + propertyTax;

      // 세금 + 채권 수입 + auto-invest를 최종 현금에 반영
      const bondIncome = couponCash + principalCash;
      let finalCash = mCash + bondIncome - autoInvestSpent - totalTax;

      // V3-05: 부모가 나에게 준 총액 (학원비 차감 전). 유년기에만 누적.
      const parentalInvestment = st.parentalInvestment + allowanceIncome;
      // V3-11: 납세액 누계.
      const totalTaxPaid = st.totalTaxPaid + totalTax;

      // V5-04: 위기 레벨 계산 (강제 매각·정부 대출보다 먼저 결정해야 함)
      const totalExpensesForCrisis = insuranceCost + totalTax + academyExpense + costOfLivingExpense + upkeepExpense + repaymentExpense;
      const stocksValForCrisis = autoHoldings.reduce((s, h) => s + (prices[h.ticker] ?? 0) * h.shares, 0);
      const totalAssetsForCrisis = finalCash + bank.balance + stocksValForCrisis + appreciatedRealEstate.reduce((s, re) => s + re.currentValue, 0);
      const crisisLevel = computeCrisisLevel({
        netCashflow: (grossPeriodIncome - totalExpensesForCrisis) / 12,
        monthlyExpense: totalExpensesForCrisis / 12,
        totalAssets: totalAssetsForCrisis,
        cash: finalCash,
      });

      // V5-05: 강제 매각 — red 위기 시 자산 순서대로 매각해 현금 보충
      const forcedSaleLogEntry: LifeEvent[] = [];
      let postSaleHoldings = autoHoldings;
      let postSaleRealEstate = appreciatedRealEstate;
      let postSaleBank = bank;
      if (finalCash < 0 && crisisLevel === 'red') {
        const deficit = Math.abs(finalCash);
        const liq = forcedLiquidation(
          deficit,
          finalCash,
          bank,
          autoHoldings,
          prices,
          appreciatedRealEstate,
        );
        finalCash += liq.cashRecovered;
        postSaleBank = { ...bank, balance: bank.balance - liq.bankWithdrawn };
        postSaleHoldings = autoHoldings
          .map((h) => {
            const sold = liq.stocksSold.find((s) => s.ticker === h.ticker);
            if (!sold) return h;
            const remaining = h.shares - sold.shares;
            return remaining > 0 ? { ...h, shares: remaining } : null;
          })
          .filter((h): h is NonNullable<typeof h> => h !== null);
        postSaleRealEstate = appreciatedRealEstate.filter(
          (re) => !liq.realEstateSold.some((s) => s.id === re.id),
        );
        for (const warn of liq.warnings) {
          forcedSaleLogEntry.push({ age: intAge, text: warn, timestamp: Date.now() });
        }
      }

      // V5-06: 정부 긴급 생활안정 대출 (최후 안전망)
      const govLoanLogEntry: LifeEvent[] = [];
      let postGovBank = postSaleBank;
      let govLoanRecord: LoanRecord | null = null;
      const isAdult = intAge >= 19;
      const noLiquidAssets =
        postSaleBank.balance <= 0 &&
        postSaleHoldings.length === 0 &&
        postSaleRealEstate.length === 0;
      const MIN_GOV_LOAN = 100_000_000;
      if (finalCash < 0 && noLiquidAssets && isAdult && Math.abs(finalCash) >= MIN_GOV_LOAN) {
        const deficit = Math.abs(finalCash);
        const LOAN_UNIT = 1_000_000;
        const govLoanAmount = Math.ceil(deficit / LOAN_UNIT) * LOAN_UNIT;
        postGovBank = { ...postSaleBank, loanBalance: postSaleBank.loanBalance + govLoanAmount };
        finalCash += govLoanAmount;
        govLoanLogEntry.push({
          age: intAge,
          text: `🏛️ 정부 긴급 생활안정 대출 ${formatWon(govLoanAmount)}이 실행됐습니다`,
          timestamp: Date.now(),
        });
        govLoanRecord = { age: intAge, amount: govLoanAmount, source: 'government', reason: '정부 긴급 생활안정 대출' };
      }

      // Dream check
      const { dreams, newlyAchieved } = checkAndMarkDreams(
        st.dreams,
        intAge,
        (d) =>
          evaluateCondition(d.targetCondition, {
            character,
            cash: finalCash,
            bank: postGovBank,
            holdings: postSaleHoldings,
            prices,
            job: st.job,
            realEstate: postSaleRealEstate,
          }),
      );
      // Key moments from newly achieved dreams
      let keyMoments = [...st.keyMoments];
      for (const d of newlyAchieved) {
        keyMoments.push({
          age: intAge,
          importance: 0.85,
          text: d.rewardKeyMoment,
          tag: stageTag(intAge),
        });
      }
      keyMoments = pruneKeyMoments(keyMoments, KEY_MOMENT_LIMIT);
      // Emoji update
      const stocksVal = postSaleHoldings.reduce((s, h) => s + (prices[h.ticker] ?? 0) * h.shares, 0);
      const bondsValForEmoji = updatedBonds.reduce((s, b) => s + (b.matured ? 0 : b.faceValue), 0);
      const totalAssetsForEmoji =
        finalCash + postGovBank.balance + stocksVal +
        postSaleRealEstate.reduce((s, re) => s + re.currentValue, 0) +
        bondsValForEmoji;
      const emoji = emojiFor({ ...character, happiness: character.happiness }, totalAssetsForEmoji);

      // Emit event possibility check
      const dispatchCtx: DispatchContext = {
        age: intAge,
        cash: finalCash,
        job: st.job ? { id: st.job.id } : null,
        traits: st.traits,
        usedScenarioIds: new Set(st.usedScenarioIds),
      };
      const specificFiredFirst = SCENARIOS.some((ev) =>
        ev.triggers.some((t) => t.kind === 'specificAge' && t.age === intAge),
      );
      const roll = streams.event();
      const fireChance =
        specificFiredFirst ? 1 : eventChancePerYear() * deltaYears;
      let phase: Phase = st.phase;
      let triggeredEvent: EconomicEvent | null = null;
      if (roll < fireChance) {
        const picked = pickEligibleEvent(
          SCENARIOS,
          dispatchCtx,
          streams.event,
          specificFiredFirst,
        );
        if (picked && picked.pausesGame) {
          triggeredEvent = {
            scenarioId: picked.id,
            triggeredAtAge: intAge,
            title: picked.title,
            text: picked.text,
            choices: picked.choices,
            category: picked.category,
          };
          phase = { kind: 'paused', event: triggeredEvent };
        }
      }

      // Recent log update
      const cycleLogEntry = cycleChanged
        ? [{
            age: intAge,
            text: economyCycle.phase === 'boom'
              ? `📢 경제 호황기 시작! 주가 상승세 기대`
              : economyCycle.phase === 'recession'
                ? `📢 경기 침체 시작. 주가 하락 주의`
                : `📢 경기가 안정세로 접어들었습니다`,
            timestamp: Date.now(),
          }]
        : [];
      const taxLogEntry = (intAge % 5 === 0 && totalTax > 0)
        ? [{
            age: intAge,
            text: `🧾 ${intAge}세 세금: 소득세 ${Math.round(incomeTax / 10000)}만원 + 재산세 ${Math.round(propertyTax / 10000)}만원 = 합계 ${Math.round(totalTax / 10000)}만원 납부`,
            timestamp: Date.now(),
          }]
        : [];
      // Season update
      const newSeason = seasonFromYearIndex(intAge - 10);
      const seasonChanged = newSeason !== st.currentSeason;
      const seasonLogEntry = seasonChanged
        ? [{
            age: intAge,
            text: `${SEASON_EMOJI[newSeason]} ${SEASON_KO[newSeason]}이 찾아왔어요!`,
            timestamp: Date.now(),
          }]
        : [];

      const recentLog = [
        ...st.recentLog,
        ...cycleLogEntry,
        ...taxLogEntry,
        ...seasonLogEntry,
        ...overdraftLogEntry,
        ...forcedSaleLogEntry,
        ...govLoanLogEntry,
        {
          age: intAge,
          text: `${intAge}세: 자산 ${Math.round((finalCash + postGovBank.balance) / 10000)}만원`,
          timestamp: Date.now(),
        },
      ].slice(-RECENT_LOG_LIMIT);

      // Track asset history every 5 years
      const totalNow = finalCash + postGovBank.balance + stocksVal;
      const assetHistory = intAge % 5 === 0
        ? [...st.assetHistory, { age: intAge, value: totalNow }]
        : st.assetHistory;

      // Track cashflow history every year (up to 90 entries, ages 10-100)
      const netMonthlyNow = Math.round((grossPeriodIncome - totalExpensesForCrisis) / 12);
      const cashflowHistory = [...st.cashflowHistory, { age: intAge, netMonthly: netMonthlyNow }].slice(-90);

      const stocksValNow = postSaleHoldings.reduce((s, h) => s + (prices[h.ticker] ?? 0) * h.shares, 0);
      const totalAssetsNow = finalCash + postGovBank.balance + stocksValNow + postSaleRealEstate.reduce((s, re) => s + re.currentValue, 0);
      const newBoomReached = st.boomTimeBillionaireReached || (economyCycle.phase === 'boom' && totalAssetsNow >= 100000000);
      const newSurvivedRecession = st.survivedRecessionWithAssets || (economyCycle.phase === 'recession' && totalAssetsNow >= 10000000);

      // V5-04: 위기 스탯 차감 (crisisLevel은 강제 매각 전에 이미 계산됨)
      const crisisTurns = (crisisLevel === 'orange' || crisisLevel === 'red')
        ? st.crisisTurns + deltaYears
        : st.crisisTurns;
      // 위기 스탯 차감 (orange: -3/-2/-1/-1, red: -6/-4/-2/-2 × deltaYears)
      const crisisCharacter = (() => {
        if (crisisLevel === 'orange') {
          return {
            ...character,
            happiness: Math.max(0, Math.min(100, character.happiness - 3 * deltaYears)),
            health: Math.max(0, Math.min(100, character.health - 2 * deltaYears)),
            wisdom: Math.max(0, Math.min(100, character.wisdom - 1 * deltaYears)),
            charisma: Math.max(0, Math.min(100, character.charisma - 1 * deltaYears)),
          };
        }
        if (crisisLevel === 'red') {
          return {
            ...character,
            happiness: Math.max(0, Math.min(100, character.happiness - 6 * deltaYears)),
            health: Math.max(0, Math.min(100, character.health - 4 * deltaYears)),
            wisdom: Math.max(0, Math.min(100, character.wisdom - 2 * deltaYears)),
            charisma: Math.max(0, Math.min(100, character.charisma - 2 * deltaYears)),
          };
        }
        return character;
      })();

      set({
        character: { ...crisisCharacter, emoji },
        cash: finalCash,
        bank: postGovBank,
        holdings: postSaleHoldings,
        prices,
        npcs,
        dreams,
        keyMoments,
        recentLog,
        assetHistory,
        phase,
        economyCycle,
        realEstate: postSaleRealEstate,
        bonds: updatedBonds,
        boomTimeBillionaireReached: newBoomReached,
        survivedRecessionWithAssets: newSurvivedRecession,
        currentSeason: newSeason,
        parentalInvestment,
        totalTaxPaid,
        parentalRepaymentBase,
        crisisTurns,
        loanHistory: govLoanRecord ? [...st.loanHistory, govLoanRecord] : st.loanHistory,
        cashflowHistory,
      });
    },
    triggerEvent(ev) {
      set({ phase: { kind: 'paused', event: ev } });
    },
    chooseOption(choiceIndex) {
      const st = get();
      if (st.phase.kind !== 'paused') return { warnings: [], timeCostMonths: 0 };
      const event = st.phase.event;
      const choice: EventChoice | undefined = event.choices[choiceIndex];
      if (!choice) return { warnings: [], timeCostMonths: 0 };
      // 보험이 피해를 막아줌: 건강 피해는 절반, 현금 손실은 30% 덜 빠지게 한다.
      // TODO(B2): 라벨은 원래 금액을 보여주는데 실제 차감액은 보험이 먹은 만큼 다름.
      // EventModal이 이 보정치 기준으로 표시하도록 mitigatedEffects를 노출할 것.
      const ins = st.insurance;
      const mitigatedEffects = choice.effects.map((eff) => {
        if (eff.kind === 'health' && eff.delta < 0 && ins.health) {
          return { ...eff, delta: Math.round(eff.delta * 0.5) };
        }
        if (eff.kind === 'cash' && eff.delta < 0 && ins.asset) {
          return { ...eff, delta: Math.round(eff.delta * 0.7) };
        }
        return eff;
      });
      const mitigatedChoice: EventChoice = { ...choice, effects: mitigatedEffects };
      const next = applyChoice(
        {
          character: st.character,
          cash: st.cash,
          bank: st.bank,
          holdings: st.holdings,
          prices: st.prices,
          job: st.job,
          jobs: JOBS,
          traits: st.traits,
          keyMoments: st.keyMoments,
          realEstate: st.realEstate,
          bonds: st.bonds,
        },
        mitigatedChoice,
        event.triggeredAtAge,
      );
      const newUsed = [...st.usedScenarioIds, event.scenarioId];
      const newKeyMoments = pruneKeyMoments(next.keyMoments, KEY_MOMENT_LIMIT);
      const newChoiceHistory = [
        ...st.choiceHistory,
        { scenarioId: event.scenarioId, choiceIndex, age: event.triggeredAtAge },
      ];
      // buyStock의 강제대출 경로를 탔다면 hadLoan 플래그도 올려서
      // "대출을 받았다가 완납" 업적 트래킹과 일관되게 한다.
      const forcedLoanTaken = next.bank.loanBalance > st.bank.loanBalance;
      const forcedLoanAmount = forcedLoanTaken ? next.bank.loanBalance - st.bank.loanBalance : 0;
      const newLoanHistory: LoanRecord[] = forcedLoanTaken
        ? [...st.loanHistory, { age: event.triggeredAtAge, amount: forcedLoanAmount, source: 'forced', reason: event.title }]
        : st.loanHistory;
      set({
        character: next.character,
        cash: next.cash,
        bank: next.bank,
        holdings: next.holdings,
        prices: next.prices,
        job: next.job,
        traits: next.traits,
        keyMoments: newKeyMoments,
        usedScenarioIds: newUsed,
        choiceHistory: newChoiceHistory,
        hadLoan: st.hadLoan || forcedLoanTaken,
        loanHistory: newLoanHistory,
        // realEstate는 halveWealth 같은 effect에서만 변경된다. 아닌 경우 원본 유지.
        realEstate: next.realEstate ?? st.realEstate,
        phase: { kind: 'playing' },
      });
      return {
        warnings: next.warnings ?? [],
        timeCostMonths: choice.timeCostMonths ?? 0,
      };
    },
    buy(ticker, shares) {
      const st = get();
      const price = st.prices[ticker];
      if (!price) return false;
      const cost = price * shares;
      if (cost <= 0 || cost > st.cash) return false;
      const existing = st.holdings.find((h) => h.ticker === ticker);
      let newHoldings: Holding[];
      if (existing) {
        const total = existing.shares + shares;
        const avg = Math.round(
          (existing.avgBuyPrice * existing.shares + price * shares) / total,
        );
        newHoldings = st.holdings.map((h) =>
          h.ticker === ticker ? { ticker, shares: total, avgBuyPrice: avg } : h,
        );
      } else {
        newHoldings = [...st.holdings, { ticker, shares, avgBuyPrice: price }];
      }
      set({ cash: st.cash - cost, holdings: newHoldings });
      return true;
    },
    sell(ticker, shares) {
      const st = get();
      const price = st.prices[ticker];
      if (!price) return false;
      const existing = st.holdings.find((h) => h.ticker === ticker);
      if (!existing || existing.shares < shares || shares <= 0) return false;
      const proceeds = price * shares;
      const remaining = existing.shares - shares;
      const newHoldings =
        remaining === 0
          ? st.holdings.filter((h) => h.ticker !== ticker)
          : st.holdings.map((h) =>
              h.ticker === ticker ? { ...h, shares: remaining } : h,
            );
      set({ cash: st.cash + proceeds, holdings: newHoldings });
      return true;
    },
    deposit(amount) {
      const st = get();
      if (amount <= 0 || amount > st.cash) return false;
      set({
        cash: st.cash - amount,
        bank: { ...st.bank, balance: st.bank.balance + amount },
      });
      return true;
    },
    withdraw(amount) {
      const st = get();
      if (amount <= 0 || amount > st.bank.balance) return false;
      set({
        cash: st.cash + amount,
        bank: { ...st.bank, balance: st.bank.balance - amount },
      });
      return true;
    },
    takeLoan(amount) {
      const st = get();
      const stocksVal = st.holdings.reduce((s, h) => s + (st.prices[h.ticker] ?? 0) * h.shares, 0);
      const realEstateVal = st.realEstate.reduce((s, re) => s + re.currentValue, 0);
      const totalAssets = st.cash + st.bank.balance + stocksVal + realEstateVal;
      const result = takeLoan(st.cash, st.bank, amount, totalAssets);
      if (!result.executed) return false;
      const record: LoanRecord = {
        age: Math.floor(st.character.age),
        amount,
        source: 'bank',
        reason: '은행 대출',
      };
      set({ cash: result.cash, bank: result.bank, hadLoan: true, loanHistory: [...st.loanHistory, record] });
      return true;
    },
    repayLoan(amount) {
      const st = get();
      const result = repayLoan(st.cash, st.bank, amount);
      if (!result.executed) return false;
      const fullyRepaid = result.bank.loanBalance === 0 && st.hadLoan;
      set({ cash: result.cash, bank: result.bank, loanFullyRepaid: fullyRepaid || st.loanFullyRepaid });
      return true;
    },
    setSpeed(s) {
      set({ speedMultiplier: s });
    },
    changeJob(jobId) {
      const st = get();
      const newJob = JOBS.find((j) => j.id === jobId);
      if (!newJob) return { success: false, reason: '존재하지 않는 직업' };
      const intAge = Math.floor(st.character.age);
      if (intAge < newJob.minAge) return { success: false, reason: `${newJob.minAge}세 이상만 가능` };
      set({ job: newJob, lastJobChangeAge: intAge });
      return { success: true };
    },
    toggleInsurance(type) {
      const st = get();
      const ins = st.insurance;
      const healthPremium = 200000;
      const assetPremium = 300000;
      if (type === 'health') {
        const newHealth = !ins.health;
        const newPremium = (newHealth ? healthPremium : 0) + (ins.asset ? assetPremium : 0);
        set({ insurance: { ...ins, health: newHealth, premium: newPremium } });
      } else {
        const newAsset = !ins.asset;
        const newPremium = (ins.health ? healthPremium : 0) + (newAsset ? assetPremium : 0);
        set({ insurance: { ...ins, asset: newAsset, premium: newPremium } });
      }
    },
    toggleDrip() {
      set({ dripEnabled: !get().dripEnabled });
    },
    buyRealEstate(id) {
      const st = get();
      const listing = REAL_ESTATE_LISTINGS.find((l) => l.id === id);
      if (!listing) return { success: false, acquisitionTax: 0 };
      if (st.realEstate.length >= 10) return { success: false, acquisitionTax: 0 };
      const intAge = Math.floor(st.character.age);
      const inflationMult = intAge > 30 ? 1 + 0.02 * (intAge - 30) : 1;
      const dynPrice = dynamicListingPrice(listing.price, st.economyCycle.phase, inflationMult);
      const dynRent = listing.monthlyRent > 0
        ? dynamicMonthlyRent(listing.monthlyRent, st.economyCycle.phase)
        : 0;
      const isCommercial = listing.id === 'commercial';
      const ownedCountAfter = st.realEstate.length + 1;
      const acquisitionTax = calculateAcquisitionTax(dynPrice, ownedCountAfter, isCommercial);
      const totalCost = dynPrice + acquisitionTax;
      if (st.cash < totalCost) return { success: false, acquisitionTax: 0 };
      const newRe: RealEstate = {
        id: listing.id,
        name: listing.name,
        purchasePrice: dynPrice,
        currentValue: dynPrice,
        monthlyRent: dynRent,
        purchasedAtAge: Math.floor(st.character.age),
      };
      set({
        cash: st.cash - totalCost,
        realEstate: [...st.realEstate, newRe],
        totalTaxPaid: st.totalTaxPaid + acquisitionTax,
      });
      return { success: true, acquisitionTax };
    },
    sellRealEstate(index) {
      const st = get();
      const re = st.realEstate[index];
      if (!re) return { success: false, capitalGainsTax: 0 };
      const yearsHeld = st.character.age - re.purchasedAtAge;
      const capitalGainsTax = calculateCapitalGainsTax(
        re.currentValue,
        re.purchasePrice,
        yearsHeld,
        st.realEstate.length,
      );
      const netProceeds = re.currentValue - capitalGainsTax;
      const newList = st.realEstate.filter((_, i) => i !== index);
      set({
        cash: st.cash + netProceeds,
        realEstate: newList,
        totalTaxPaid: st.totalTaxPaid + capitalGainsTax,
      });
      return { success: true, capitalGainsTax };
    },
    buyBond(id) {
      const st = get();
      const def = BOND_LISTINGS.find((b) => b.id === id);
      if (!def) return false;
      if (st.cash < def.faceValue) return false;
      const newBond: Bond = {
        id: def.id,
        name: def.name,
        faceValue: def.faceValue,
        couponRate: def.couponRate,
        maturityYears: def.maturityYears,
        purchasedAtAge: Math.floor(st.character.age),
        matured: false,
      };
      set({ cash: st.cash - def.faceValue, bonds: [...st.bonds, newBond] });
      return true;
    },
    endGame() {
      const st = get();
      const totalAssets =
        st.cash +
        st.bank.balance +
        st.holdings.reduce((sum, h) => sum + (st.prices[h.ticker] ?? 0) * h.shares, 0) +
        st.realEstate.reduce((sum, re) => sum + re.currentValue, 0);
      const extras: EndingExtras = {
        realEstateCount: st.realEstate.length,
        hadLoanAndRepaid: st.loanFullyRepaid,
        bothInsurancesHeld: st.insurance.health && st.insurance.asset,
        boomTimeBillionaireReached: st.boomTimeBillionaireReached,
        survivedRecessionWithAssets: st.survivedRecessionWithAssets,
        finalWisdom: st.character.wisdom,
        finalCharisma: st.character.charisma,
        finalHealth: st.character.health,
        traitsCount: st.traits.length,
        totalChoicesMade: st.choiceHistory.length,
        uniqueScenariosEncountered: new Set(st.usedScenarioIds).size,
        crisisTurns: st.crisisTurns,
      };
      const ending = buildEnding(
        st.character.name,
        st.dreams,
        st.keyMoments,
        totalAssets,
        st.character.happiness,
        epitaphTemplates as { opening: string[]; closing: string[] },
        streams.misc,
        extras,
      );
      set({ phase: { kind: 'ending' }, ending });
    },
    unlockSkill(skillId) {
      const st = get();
      if (st.unlockedSkills.includes(skillId)) return false;
      const skill = SKILLS.find((s) => s.id === skillId);
      if (!skill) return false;
      if (st.character.wisdom < skill.wisdomCost) return false;
      set({
        character: { ...st.character, wisdom: st.character.wisdom - skill.wisdomCost },
        unlockedSkills: [...st.unlockedSkills, skillId],
      });
      return true;
    },
    resetAll() {
      streams = createStreams(randomSeeds());
      set({ ...makeInitialState() });
    },
    loadSnapshot(s) {
      if (s.seeds) streams = createStreams(s.seeds);
      set((state) => ({ ...state, ...s }));
    },
  })),
);

export function getRngStreams(): RngStreams {
  return streams;
}

export function setRngStreams(s: Seeds) {
  streams = createStreams(s);
}

function stageTag(age: number): string {
  if (age < 20) return '유년기';
  if (age < 35) return '청년기';
  if (age < 55) return '중년기';
  if (age < 75) return '장년기';
  return '노년기';
}

export { STOCKS, JOBS, DREAMS_MASTER };
export function getSCENARIOS(): ScenarioEvent[] { return SCENARIOS; }
