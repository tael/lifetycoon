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
import { REAL_ESTATE_LISTINGS } from '../game/domain/realEstate';
import { calculateAcquisitionTax, calculateCapitalGainsTax } from '../game/domain/realEstateTax';
import { BOND_LISTINGS } from '../game/domain/bond';
import { SKILLS } from '../game/domain/skills';
import { createCharacter } from '../game/domain/character';
import {
  pickRandomHouseholdClass,
} from '../game/domain/household';
import { showToast } from '../ui/components/Toast';
import { createBankAccount, takeLoan, repayLoan } from '../game/domain/bankAccount';
import { applyChoice, pruneKeyMoments } from '../game/scenario/scenarioEngine';
import { createStreams, randomSeeds, type RngStreams } from '../game/engine/prng';
import {
  createEconomyCycle,
  dynamicListingPrice,
  dynamicMonthlyRent,
  type EconomyCycle,
} from '../game/engine/economyCycle';
import { createNpcFromSeed } from '../game/domain/npc';
import { buildEnding, type EndingExtras } from '../game/domain/ending';
import type { Season } from '../game/engine/season';
import type { ChallengeMode } from '../game/engine/challengeMode';
import {
  applyAgeAndDecay,
  processMonthlyLoop,
  processAnnualSettlement,
  processCrisisAndLiquidation,
  processDreamsAndLogs,
  type YearTickContext,
} from '../game/engine/yearTick';
import { ANNUAL_INFLATION_RATE, KEY_MOMENT_LIMIT } from '../game/constants';
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
  autoSave: boolean;
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
  /** 실제 생활비 / 기대 생활비 비율. 1.0 = 정상. CareBtn 효율에 반영. */
  costOfLivingRatio: number;
  choiceHistory: { scenarioId: string; choiceIndex: number; age: number }[];
  currentSeason: Season;
  dripEnabled: boolean;
  /** 종목별 현재 배당률. 매년 성장. 없으면 stockDef.dividendRate 사용. */
  dividendRates: Record<string, number>;
  /** 액면분할 알림 메시지 목록. advanceYear에서 채워지고 PlayScreen에서 소비 후 clear. */
  splitNotices: string[];
  clearSplitNotices: () => void;
  addTrait: (trait: string) => void;
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
  buy: (ticker: string, shares: number) => { success: boolean; reason?: string };
  sell: (ticker: string, shares: number) => { success: boolean; reason?: string };
  deposit: (amount: number) => { success: boolean; reason?: string };
  withdraw: (amount: number) => { success: boolean; reason?: string };
  takeLoan: (amount: number) => boolean;
  repayLoan: (amount: number) => boolean;
  setSpeed: (s: 0.5 | 1 | 2) => void;
  changeJob: (jobId: string) => { success: boolean; reason?: string };
  toggleDrip: () => void;
  toggleAutoInvest: () => void;
  toggleAutoSave: () => void;
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
    autoSave: false,
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
    costOfLivingRatio: 1,
    choiceHistory: [],
    currentSeason: 'spring' as Season,
    dripEnabled: false,
    dividendRates: {},
    splitNotices: [],
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
  | 'toggleDrip'
  | 'toggleAutoInvest'
  | 'toggleAutoSave'
  | 'buyRealEstate'
  | 'sellRealEstate'
  | 'buyBond'
  | 'endGame'
  | 'resetAll'
  | 'unlockSkill'
  | 'loadSnapshot'
  | 'clearSplitNotices'
  | 'addTrait'
>;

// Single shared stream per game (recreated from seeds)
let streams: RngStreams = createStreams(randomSeeds());

/** 이벤트 선택으로 발생한 강제 대출을 LoanRecord 배열에 추가해 반환한다. */
function recordLoanFromChoice(
  loanHistory: LoanRecord[],
  prevLoanBalance: number,
  nextLoanBalance: number,
  triggeredAtAge: number,
  eventTitle: string,
): LoanRecord[] {
  const forcedLoanAmount = nextLoanBalance - prevLoanBalance;
  if (forcedLoanAmount <= 0) return loanHistory;
  return [
    ...loanHistory,
    { age: triggeredAtAge, amount: forcedLoanAmount, source: 'forced', reason: eventTitle },
  ];
}

/** choiceHistory 배열에 새 항목을 추가해 반환한다. */
function buildChoiceHistory(
  choiceHistory: { scenarioId: string; choiceIndex: number; age: number }[],
  scenarioId: string,
  choiceIndex: number,
  age: number,
): { scenarioId: string; choiceIndex: number; age: number }[] {
  return [...choiceHistory, { scenarioId, choiceIndex, age }];
}

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
      const ctx: YearTickContext = {
        stocks: STOCKS,
        jobs: JOBS,
        scenarios: SCENARIOS,
        streams: {
          stock: streams.stock,
          event: streams.event,
          npc: streams.npc,
          misc: streams.misc,
        },
      };

      // 1) 나이 증가 + 스탯 감소 + 경기사이클 + 강제 직업 변경
      const ageResult = applyAgeAndDecay(st, intAge, deltaYears, ctx);

      // 2) 12개월 루프: 급여/이자/배당/임대/연금/용돈/대출이자/DRIP
      const monthlyResult = processMonthlyLoop(st, intAge, deltaYears, ageResult, ctx);

      // 3) 연간 정산: 주가 변동, 배당 성장, NPC, 자동투자, 부동산 감정, 채권, 세금
      const annualResult = processAnnualSettlement(st, intAge, deltaYears, ageResult, monthlyResult, ctx);

      // 4) 위기 판정 + 강제 매각 + 정부 긴급 대출
      const crisisResult = processCrisisAndLiquidation(st, intAge, deltaYears, ageResult, monthlyResult, annualResult);

      // 5) 꿈 달성, 키 모먼트, 로그, 시즌, 이벤트 발동
      const logResult = processDreamsAndLogs(st, intAge, deltaYears, ageResult, monthlyResult, annualResult, crisisResult, ctx);

      // Toast 메시지 발행 (순수 함수 밖에서만 호출)
      for (const t of ageResult.toasts) {
        showToast(t.message, t.icon, t.type, t.duration);
      }

      set({
        character: { ...crisisResult.character, emoji: logResult.emoji },
        cash: crisisResult.finalCash,
        bank: { ...crisisResult.bank, interestRate: ageResult.newBaseInterestRate, balance: crisisResult.bank.balance + annualResult.autoSaveAmount },
        holdings: crisisResult.holdings,
        prices: annualResult.prices,
        npcs: annualResult.npcs,
        dreams: logResult.dreams,
        keyMoments: logResult.keyMoments,
        recentLog: logResult.recentLog,
        assetHistory: logResult.assetHistory,
        phase: logResult.phase,
        economyCycle: ageResult.economyCycle,
        realEstate: crisisResult.realEstate,
        bonds: annualResult.bonds,
        boomTimeBillionaireReached: logResult.boomTimeBillionaireReached,
        survivedRecessionWithAssets: logResult.survivedRecessionWithAssets,
        currentSeason: logResult.currentSeason,
        parentalInvestment: monthlyResult.parentalInvestment,
        totalTaxPaid: annualResult.totalTaxPaid,
        parentalRepaymentBase: monthlyResult.parentalRepaymentBase,
        crisisTurns: crisisResult.crisisTurns,
        loanHistory: crisisResult.govLoanRecord ? [...st.loanHistory, crisisResult.govLoanRecord] : st.loanHistory,
        cashflowHistory: logResult.cashflowHistory,
        costOfLivingRatio: ageResult.cfRatio,
        dividendRates: annualResult.dividendRates,
        splitNotices: logResult.splitNotices,
        job: ageResult.job,
        lastJobChangeAge: ageResult.lastJobChangeAge,
      });
    },
    clearSplitNotices() {
      set({ splitNotices: [] });
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
        choice,
        event.triggeredAtAge,
      );
      const newUsed = [...st.usedScenarioIds, event.scenarioId];
      const newKeyMoments = pruneKeyMoments(next.keyMoments, KEY_MOMENT_LIMIT);
      const newChoiceHistory = buildChoiceHistory(
        st.choiceHistory, event.scenarioId, choiceIndex, event.triggeredAtAge,
      );
      // buyStock의 강제대출 경로를 탔다면 hadLoan 플래그도 올려서
      // "대출을 받았다가 완납" 업적 트래킹과 일관되게 한다.
      const forcedLoanTaken = next.bank.loanBalance > st.bank.loanBalance;
      const newLoanHistory = recordLoanFromChoice(
        st.loanHistory, st.bank.loanBalance, next.bank.loanBalance,
        event.triggeredAtAge, event.title,
      );
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
      if (!price) return { success: false, reason: '종목을 찾을 수 없어요' };
      const cost = price * shares;
      if (cost <= 0 || cost > st.cash) return { success: false, reason: '현금이 부족해요' };
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
      return { success: true };
    },
    sell(ticker, shares) {
      const st = get();
      const price = st.prices[ticker];
      if (!price) return { success: false, reason: '종목을 찾을 수 없어요' };
      const existing = st.holdings.find((h) => h.ticker === ticker);
      if (!existing) return { success: false, reason: '보유 주식이 없어요' };
      if (shares <= 0 || existing.shares < shares) return { success: false, reason: '보유 수량이 부족해요' };
      const proceeds = price * shares;
      const remaining = existing.shares - shares;
      const newHoldings =
        remaining === 0
          ? st.holdings.filter((h) => h.ticker !== ticker)
          : st.holdings.map((h) =>
              h.ticker === ticker ? { ...h, shares: remaining } : h,
            );
      set({ cash: st.cash + proceeds, holdings: newHoldings });
      return { success: true };
    },
    deposit(amount) {
      const st = get();
      if (amount <= 0 || amount > st.cash) return { success: false, reason: '현금이 부족해요' };
      set({
        cash: st.cash - amount,
        bank: { ...st.bank, balance: st.bank.balance + amount },
      });
      return { success: true };
    },
    withdraw(amount) {
      const st = get();
      if (amount <= 0 || amount > st.bank.balance) return { success: false, reason: '예금 잔액이 부족해요' };
      set({
        cash: st.cash + amount,
        bank: { ...st.bank, balance: st.bank.balance - amount },
      });
      return { success: true };
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
    toggleDrip() {
      set({ dripEnabled: !get().dripEnabled });
    },
    toggleAutoInvest() {
      set({ autoInvest: !get().autoInvest });
    },
    toggleAutoSave() {
      set({ autoSave: !get().autoSave });
    },
    addTrait(trait) {
      const st = get();
      if (st.traits.includes(trait)) return;
      set({ traits: [...st.traits, trait] });
    },
    buyRealEstate(id) {
      const st = get();
      const listing = REAL_ESTATE_LISTINGS.find((l) => l.id === id);
      if (!listing) return { success: false, acquisitionTax: 0 };
      if (st.realEstate.length >= 10) return { success: false, acquisitionTax: 0 };
      const intAge = Math.floor(st.character.age);
      const inflationMult = intAge > 30 ? 1 + ANNUAL_INFLATION_RATE * (intAge - 30) : 1;
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


export { STOCKS, JOBS, DREAMS_MASTER };
export function getSCENARIOS(): ScenarioEvent[] { return SCENARIOS; }
