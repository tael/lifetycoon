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
  Phase,
  RealEstate,
  ScenarioEvent,
  Seeds,
  StockDef,
} from '../game/types';
import { REAL_ESTATE_LISTINGS, appreciateValue } from '../game/domain/realEstate';
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
import { createBankAccount, applyLoanInterest, takeLoan, repayLoan } from '../game/domain/bankAccount';
import { applyChoice, pruneKeyMoments } from '../game/scenario/scenarioEngine';
import { evaluateCondition, checkAndMarkDreams } from '../game/domain/dream';
import { nextPrice } from '../game/domain/stock';
import { createStreams, randomSeeds, type RngStreams } from '../game/engine/prng';
import {
  createEconomyCycle,
  stepEconomyCycle,
  PHASE_DRIFT_BONUS,
  getEffectiveInterestRate,
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
  buyRealEstate: (id: string) => boolean;
  sellRealEstate: (index: number) => boolean;
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
  return NPCS_RAW.map((n) =>
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

      // 2b) Bank interest — 이번 틱에 실제 적용되는 유효 이자율을 매 틱 재계산한다.
      // base rate(st.bank.interestRate)는 영구 상태이고, phase/skill 보너스는 일회성이다.
      // 예전 버그: 보너스를 bank.interestRate에 써서 저장 → 매 틱 누적 → 폭주.
      const effectiveInterestRate = getEffectiveInterestRate(
        st.bank.interestRate,
        economyCycle.phase,
        st.unlockedSkills.includes('finance_101'),
      );
      const interestedBalance = st.bank.balance > 0
        ? Math.round(st.bank.balance * Math.pow(1 + effectiveInterestRate, deltaYears))
        : st.bank.balance;
      // base rate는 유지, balance만 갱신 (보너스 누적 방지)
      const bankAfterInterest = { ...st.bank, balance: interestedBalance };
      const bank = applyLoanInterest(bankAfterInterest, deltaYears);
      // 3) Salary income + stock dividends + pension
      const salaryBonus = st.unlockedSkills.includes('negotiation') ? 1.1 : 1;
      // 인플레이션 보정: 30세 이후 매년 2%씩 누적 (명목 월급 상승으로 실질가치 유지)
      const inflationMultiplier = intAge > 30 ? 1 + 0.02 * (intAge - 30) : 1;
      // 컨디션 페널티 — 지혜 저하는 연봉에, 건강/매력은 다른 루트에 영향.
      // 저스탯이면 드라이하게 숫자로 불이익을 준다.
      const statPenalty = computeStatPenalty(character);
      const salaryIncome = st.job
        ? Math.round(st.job.salary * ageSalaryMultiplier(intAge, st.job.id) * 12 * deltaYears * salaryBonus * inflationMultiplier * statPenalty.salaryMult)
        : 0;
      // Pension: 65세+ 시 근무 연수 기반 연금 (공식은 domain/pension.ts 참조 — cashflow UI와 동일)
      const careerCount = st.usedScenarioIds.filter(
        (id) => id.includes('job') || id.includes('career') || id.includes('part_time'),
      ).length + 1;
      const pensionIncome = computePensionYearly(intAge, careerCount, inflationMultiplier, deltaYears);
      // 배당 — 복리 공식 적용: value × ((1+rate)^years - 1)
      // deltaYears=1이면 단리와 동일, 2+ 이면 복리 효과 반영
      const dividendIncome = st.holdings.reduce((sum, h) => {
        const stockDef = STOCKS.find((s) => s.ticker === h.ticker);
        const divRate = stockDef?.dividendRate ?? 0;
        if (divRate <= 0) return sum;
        const price = st.prices[h.ticker] ?? 0;
        const compoundFactor = Math.pow(1 + divRate, deltaYears) - 1;
        return sum + Math.round(price * h.shares * compoundFactor);
      }, 0);

      // 배당재투자 (DRIP: Dividend Re-Investment Plan) — 자동 배당 재투자
      // dripEnabled 시 배당금을 해당 종목에 즉시 매수 (복리 강화)
      let dripHoldings = [...st.holdings];
      let dripSpent = 0;
      if (st.dripEnabled && dividendIncome > 0) {
        const perStockDividend: Record<string, number> = {};
        for (const h of st.holdings) {
          const stockDef = STOCKS.find((s) => s.ticker === h.ticker);
          const divRate = stockDef?.dividendRate ?? 0;
          if (divRate <= 0) continue;
          const price = st.prices[h.ticker] ?? 0;
          const compoundFactor = Math.pow(1 + divRate, deltaYears) - 1;
          perStockDividend[h.ticker] = Math.round(price * h.shares * compoundFactor);
        }
        // DRIP 시점 가용 현금: 현재 보유 현금 + 이번 틱 확정 수입
        const dripAvailableCash = st.cash + salaryIncome + dividendIncome + pensionIncome;
        dripHoldings = dripHoldings.map((h) => {
          const div = perStockDividend[h.ticker] ?? 0;
          const price = st.prices[h.ticker] ?? 0;
          if (div <= 0 || price <= 0) return h;
          const additionalShares = Math.floor(div / price);
          if (additionalShares <= 0) return h;
          const cost = additionalShares * price;
          // 현금 부족 시 재투자 스킵 (음수 현금 방지)
          if (dripSpent + cost > dripAvailableCash) return h;
          dripSpent += cost;
          const totalShares = h.shares + additionalShares;
          const newAvg = Math.round(
            (h.avgBuyPrice * h.shares + price * additionalShares) / totalShares,
          );
          return { ticker: h.ticker, shares: totalShares, avgBuyPrice: newAvg };
        });
      }
      // 4) Stock price drift (with economy cycle bonus + stat penalty)
      // 지혜 저하 시 returnMult(-0.02)를 drift에 가산 — "정보력 부족으로 손해".
      const prices: Record<string, number> = { ...st.prices };
      const driftAdj = driftBonus + statPenalty.returnMult;
      for (const s of STOCKS) {
        const adjustedStock = driftAdj !== 0
          ? { ...s, drift: s.drift + driftAdj }
          : s;
        prices[s.ticker] = nextPrice(prices[s.ticker], adjustedStock, streams.stock, deltaYears);
      }
      // 5) NPC step - 플레이어 총자산 기반 catch-up
      const playerStocksVal = st.holdings.reduce((s, h) => s + (prices[h.ticker] ?? 0) * h.shares, 0);
      const playerAssets = st.cash + st.bank.balance + playerStocksVal + st.realEstate.reduce((s, re) => s + re.currentValue, 0) + st.bonds.reduce((s, b) => s + b.faceValue, 0);
      const npcs = st.npcs.map((n) => stepNpc(n, intAge, streams.npc, playerAssets));
      // 5b) Auto-invest: 10% of salary into random stocks
      let autoInvestSpent = 0;
      let autoHoldings = dripHoldings;
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

      // 6) Dream check
      const insuranceCost = Math.round(st.insurance.premium * deltaYears);
      // Real estate: appreciate values + collect rent
      const appreciatedRealEstate = st.realEstate.map((re) => appreciateValue(re, deltaYears, streams.misc));
      const rentalIncome = st.realEstate.reduce((sum, re) => sum + re.monthlyRent * 12 * deltaYears, 0);
      // 채권 쿠폰/원금 상환을 세금 계산 전에 미리 뽑는다. 원금 상환은 과세 대상이
      // 아니지만 쿠폰은 이자소득이라 과세 대상이다. (v0.2.0 리뷰 반영)
      const { bonds: updatedBonds, couponCash, principalCash } = applyBondCoupon(st.bonds, intAge, deltaYears);
      // 세금 계산
      const realEstateValueForTax = st.realEstate.reduce((sum, re) => sum + re.currentValue, 0);
      // 현금 유입 기준 누적 소득 (cash 또는 bank로 들어오는 부분 제외).
      // 월급/배당/연금/임대는 ctxCash에 직접 합산된다.
      const grossPeriodIncome = salaryIncome + dividendIncome + pensionIncome + Math.round(rentalIncome);
      // 과세 표준은 cash로 들어오는 소득 외에 예금 이자소득과 채권 쿠폰까지 포함한다.
      // 이자는 bank.balance에 이미 반영돼 있어 cash 흐름에는 더하지 않지만,
      // 국가가 가져가는 몫(세금)에는 포함돼야 한다.
      const interestIncome = Math.max(0, interestedBalance - st.bank.balance);
      const taxableIncome = grossPeriodIncome + interestIncome + couponCash;
      // 누진세 구간이 연 단위로 정의돼 있으므로, period 소득을 연평균화해서
      // 세율을 결정한 뒤 다시 deltaYears로 곱해 N년치 소득세를 계산한다.
      // deltaYears=1일 때는 기존 동작과 동일하다.
      const avgYearlyTaxable = deltaYears > 0 ? taxableIncome / deltaYears : taxableIncome;
      const incomeTax = Math.round(calculateIncomeTax(avgYearlyTaxable) * deltaYears);
      const propertyTax = Math.round(calculatePropertyTax(realEstateValueForTax) * deltaYears);
      const totalTax = incomeTax + propertyTax;

      // V3-03/04: 유년기(10~educationEndAge-1세) 부모 용돈 + 학원비. 가정 형편이 결정돼 있을 때만.
      // V5-02: educationEndAge(기본 19)로 학업 기간을 결정한다.
      const educationEndAge = st.educationEndAge ?? 19;
      const isChildhood = intAge >= 10 && intAge < educationEndAge;
      const householdClassForTick = character.householdClass;
      const yearlyAllowanceForAge = isChildhood && householdClassForTick
        ? getYearlyParentalAllowance(householdClassForTick, intAge)
        : 0;
      const allowanceIncome = Math.round(yearlyAllowanceForAge * deltaYears);
      const academyExpense = Math.round(yearlyAllowanceForAge * ACADEMY_RATIO * deltaYears);
      // V3-06/07: 성인 기본 생활비. 도메인 함수로 단일화.
      // 주의: salaryIncome은 deltaYears가 곱해진 값이라 baseSalaryYearly로 환산해 도메인에 넘긴다.
      const baseSalaryYearly = st.job ? Math.round(st.job.salary * ageSalaryMultiplier(intAge, st.job.id) * 12) : 0;
      const costOfLivingExpense = Math.round(
        computeCostOfLiving(intAge, baseSalaryYearly) * deltaYears,
      );
      // V3-08: 직업별 자기계발비 (월 단위 → 연으로 환산). 무직이면 0.
      const upkeepExpense = st.job?.upkeepCost
        ? Math.round(st.job.upkeepCost * 12 * deltaYears)
        : 0;
      // V3-09: 부모님 용돈 되돌림. 20세 첫 틱에 base를 1회 산정해 저장하고
      // 이후엔 그 값을 그대로 사용한다 (인플레 폭주 방지).
      // 학생(student) 신분이면 성인이어도 되돌림 면제.
      const isStudent = st.job?.id === 'student';
      let parentalRepaymentBase = st.parentalRepaymentBase;
      if (!isStudent && parentalRepaymentBase == null && intAge >= REPAYMENT_START_AGE) {
        parentalRepaymentBase = computeParentalRepaymentBase(
          st.parentalInvestment,
          inflationMultiplier,
        );
      }
      const repaymentExpense = !isStudent && parentalRepaymentBase != null
        ? Math.round(parentalRepaymentForAge(intAge, parentalRepaymentBase) * deltaYears)
        : 0;
      const ctxCash = st.cash + grossPeriodIncome + allowanceIncome - autoInvestSpent - dripSpent - insuranceCost - totalTax - academyExpense - costOfLivingExpense - upkeepExpense - repaymentExpense;
      // V3-05: 부모가 나에게 준 총액 (학원비 차감 전). 유년기에만 누적.
      const parentalInvestment = st.parentalInvestment + allowanceIncome;
      // V3-11: 납세액 누계.
      const totalTaxPaid = st.totalTaxPaid + totalTax;
      const { dreams, newlyAchieved } = checkAndMarkDreams(
        st.dreams,
        intAge,
        (d) =>
          evaluateCondition(d.targetCondition, {
            character,
            cash: ctxCash,
            bank,
            holdings: st.holdings,
            prices,
            job: st.job,
            realEstate: st.realEstate,
          }),
      );
      // 7) Key moments from newly achieved dreams
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
      // 8) Emoji update
      const stocksVal = st.holdings.reduce((s, h) => s + (st.prices[h.ticker] ?? 0) * h.shares, 0);
      const bondsValForEmoji = st.bonds.reduce((s, b) => s + (b.matured ? 0 : b.faceValue), 0);
      const totalAssetsForEmoji =
        ctxCash + st.bank.balance + stocksVal +
        st.realEstate.reduce((s, re) => s + re.currentValue, 0) +
        bondsValForEmoji;
      const emoji = emojiFor({ ...character, happiness: character.happiness }, totalAssetsForEmoji);

      // 9) Emit event possibility check
      const dispatchCtx: DispatchContext = {
        age: intAge,
        cash: ctxCash,
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

      // Bond coupon + maturity — 이미 위에서 applyBondCoupon 호출 결과를 받아뒀다.
      // 쿠폰은 과세 대상이라 taxableIncome에 포함됐지만 여기서는 실제 cash 유입으로
      // 한 번만 더한다.
      const bondIncome = couponCash + principalCash;
      const preFinalCash = ctxCash + bondIncome;

      // 마이너스통장: 현금이 음수 상태로 연도가 지나면 음수 금액에 대해 대출 이자율로 이자 부과.
      const CASH_FLOOR = -500_000_000; // -5억 하한
      let finalCash = preFinalCash;
      const overdraftLogEntry: LifeEvent[] = [];
      if (preFinalCash < 0) {
        const overdraftInterest = Math.round(Math.abs(preFinalCash) * bank.loanInterestRate * deltaYears);
        finalCash = Math.max(preFinalCash - overdraftInterest, CASH_FLOOR);
        overdraftLogEntry.push({
          age: intAge,
          text: `⚠️ 마이너스 잔고 이자 -${Math.round(overdraftInterest / 10000)}만원 부과`,
          timestamp: Date.now(),
        });
      }

      // V5-04: 위기 레벨 계산 (강제 매각·정부 대출보다 먼저 결정해야 함)
      const totalExpensesForCrisis = insuranceCost + totalTax + (typeof academyExpense !== 'undefined' ? academyExpense : 0) + (typeof costOfLivingExpense !== 'undefined' ? costOfLivingExpense : 0) + (typeof upkeepExpense !== 'undefined' ? upkeepExpense : 0) + (typeof repaymentExpense !== 'undefined' ? repaymentExpense : 0);
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
      if (finalCash < 0) {
        const deficit = Math.abs(finalCash);
        const LOAN_UNIT = 1_000_000; // 100만원 단위
        const govLoanAmount = Math.ceil(deficit / LOAN_UNIT) * LOAN_UNIT;
        postGovBank = { ...postSaleBank, loanBalance: postSaleBank.loanBalance + govLoanAmount };
        finalCash += govLoanAmount;
        govLoanLogEntry.push({
          age: intAge,
          text: `🏛️ 정부 긴급 생활안정 대출 ${formatWon(govLoanAmount)}이 실행됐습니다`,
          timestamp: Date.now(),
        });
      }

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

      // Track asset history every 5 years (stocksVal already computed above for emoji)
      const totalNow = finalCash + bank.balance + stocksVal;
      const assetHistory = intAge % 5 === 0
        ? [...st.assetHistory, { age: intAge, value: totalNow }]
        : st.assetHistory;

      const stocksValNow = autoHoldings.reduce((s, h) => s + (prices[h.ticker] ?? 0) * h.shares, 0);
      const totalAssetsNow = finalCash + bank.balance + stocksValNow + appreciatedRealEstate.reduce((s, re) => s + re.currentValue, 0);
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
      set({ cash: result.cash, bank: result.bank, hadLoan: true });
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
      if (!listing) return false;
      if (st.cash < listing.price) return false;
      const newRe: RealEstate = {
        id: listing.id,
        name: listing.name,
        purchasePrice: listing.price,
        currentValue: listing.price,
        monthlyRent: listing.monthlyRent,
        purchasedAtAge: Math.floor(st.character.age),
      };
      set({ cash: st.cash - listing.price, realEstate: [...st.realEstate, newRe] });
      return true;
    },
    sellRealEstate(index) {
      const st = get();
      const re = st.realEstate[index];
      if (!re) return false;
      const proceeds = re.currentValue;
      const newList = st.realEstate.filter((_, i) => i !== index);
      set({ cash: st.cash + proceeds, realEstate: newList });
      return true;
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
