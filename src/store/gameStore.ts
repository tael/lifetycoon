import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  BankAccount,
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
  Phase,
  ScenarioEvent,
  Seeds,
  StockDef,
} from '../game/types';
import { createCharacter, emojiFor } from '../game/domain/character';
import { createBankAccount, applyInterestForYears } from '../game/domain/bankAccount';
import { applyChoice, pruneKeyMoments } from '../game/scenario/scenarioEngine';
import { evaluateCondition, checkAndMarkDreams } from '../game/domain/dream';
import { nextPrice } from '../game/domain/stock';
import { createStreams, randomSeeds, type RngStreams } from '../game/engine/prng';
import { createNpcFromSeed, stepNpc } from '../game/domain/npc';
import { buildEnding } from '../game/domain/ending';
import {
  pickEligibleEvent,
  eventChancePerYear,
  type DispatchContext,
} from '../game/engine/eventDispatcher';
import stocksData from '../game/data/stocks.json';
import jobsData from '../game/data/jobs.json';
import dreamsData from '../game/data/dreams.json';
import npcsData from '../game/data/npcs.json';
import scenariosData from '../game/data/scenarios.json';
import epitaphTemplates from '../game/data/epitaphTemplates.json';

const STOCKS: StockDef[] = stocksData as StockDef[];
const JOBS: Job[] = jobsData as Job[];
const DREAMS_MASTER: Dream[] = dreamsData as Dream[];
const NPCS_RAW = npcsData as { id: string; name: string; personality: FriendNPC['personality']; iconEmoji: string }[];
const SCENARIOS: ScenarioEvent[] = scenariosData as ScenarioEvent[];

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
  ending: Ending | null;
  // Transient
  speedMultiplier: 0.5 | 1 | 2;
  // Derived/static
  stocksMaster: StockDef[];
  jobsMaster: Job[];
  scenariosMaster: ScenarioEvent[];
  // Actions
  startNewGame: (name: string, pickedDreamIds: string[]) => void;
  goTo: (phase: Phase) => void;
  pickDreams: (ids: string[]) => void;
  advanceYear: (intAge: number, deltaYears: number) => void;
  triggerEvent: (ev: EconomicEvent) => void;
  chooseOption: (choiceIndex: number) => void;
  buy: (ticker: string, shares: number) => boolean;
  sell: (ticker: string, shares: number) => boolean;
  deposit: (amount: number) => boolean;
  withdraw: (amount: number) => boolean;
  setSpeed: (s: 0.5 | 1 | 2) => void;
  endGame: () => void;
  resetAll: () => void;
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
    ending: null,
    speedMultiplier: 1,
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
  | 'setSpeed'
  | 'endGame'
  | 'resetAll'
  | 'loadSnapshot'
>;

// Single shared stream per game (recreated from seeds)
let streams: RngStreams = createStreams(randomSeeds());

export const useGameStore = create<GameStoreState>()(
  subscribeWithSelector((set, get) => ({
    ...makeInitialState(),
    startNewGame(name, pickedDreamIds) {
      const seeds = randomSeeds();
      streams = createStreams(seeds);
      set({
        ...makeInitialState(),
        seeds,
        character: createCharacter(name),
        dreams: freshDreams(pickedDreamIds),
        phase: { kind: 'playing' },
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
      // 1) Age up + natural stat decay (tamagotchi mechanic)
      const ageDecay = intAge > 60 ? 2 : intAge > 40 ? 1 : 0.5;
      const character = {
        ...st.character,
        age: intAge,
        happiness: Math.max(0, st.character.happiness - ageDecay * deltaYears),
        health: Math.max(0, st.character.health - (intAge > 50 ? 1.5 : 0.3) * deltaYears),
      };
      // 2) Bank interest
      const bank = applyInterestForYears(st.bank, deltaYears);
      // 3) Salary income + stock dividends
      const salaryIncome = st.job ? st.job.salary * 12 * deltaYears : 0;
      const dividendIncome = st.holdings.reduce((sum, h) => {
        const stockDef = STOCKS.find((s) => s.ticker === h.ticker);
        const divRate = (stockDef as any)?.dividendRate ?? 0;
        const price = st.prices[h.ticker] ?? 0;
        return sum + Math.round(price * h.shares * divRate * deltaYears);
      }, 0);
      // 4) Stock price drift
      const prices: Record<string, number> = { ...st.prices };
      for (const s of STOCKS) {
        prices[s.ticker] = nextPrice(prices[s.ticker], s, streams.stock, deltaYears);
      }
      // 5) NPC step
      const npcs = st.npcs.map((n) => stepNpc(n, intAge, streams.npc));
      // 6) Dream check
      const ctxCash = st.cash + salaryIncome + dividendIncome;
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
      const emoji = emojiFor({ ...character, happiness: character.happiness });

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
          };
          phase = { kind: 'paused', event: triggeredEvent };
        }
      }

      // Recent log update
      const recentLog = [
        ...st.recentLog,
        {
          age: intAge,
          text: `${intAge}세: 자산 ${Math.round((ctxCash + bank.balance) / 10000)}만원`,
          timestamp: Date.now(),
        },
      ].slice(-RECENT_LOG_LIMIT);

      set({
        character: { ...character, emoji },
        cash: ctxCash,
        bank,
        prices,
        npcs,
        dreams,
        keyMoments,
        recentLog,
        phase,
      });
    },
    triggerEvent(ev) {
      set({ phase: { kind: 'paused', event: ev } });
    },
    chooseOption(choiceIndex) {
      const st = get();
      if (st.phase.kind !== 'paused') return;
      const event = st.phase.event;
      const choice: EventChoice | undefined = event.choices[choiceIndex];
      if (!choice) return;
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
        },
        choice,
        event.triggeredAtAge,
      );
      const newUsed = [...st.usedScenarioIds, event.scenarioId];
      const newKeyMoments = pruneKeyMoments(next.keyMoments, KEY_MOMENT_LIMIT);
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
        phase: { kind: 'playing' },
      });
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
    setSpeed(s) {
      set({ speedMultiplier: s });
    },
    endGame() {
      const st = get();
      const totalAssets =
        st.cash +
        st.bank.balance +
        st.holdings.reduce((sum, h) => sum + (st.prices[h.ticker] ?? 0) * h.shares, 0);
      const ending = buildEnding(
        st.character.name,
        st.dreams,
        st.keyMoments,
        totalAssets,
        st.character.happiness,
        epitaphTemplates as { opening: string[]; closing: string[] },
        streams.misc,
      );
      set({ phase: { kind: 'ending' }, ending });
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

export { STOCKS, JOBS, DREAMS_MASTER, SCENARIOS };
