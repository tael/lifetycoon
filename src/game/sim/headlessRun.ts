// headlessRun.ts — pure function that runs a single headless game from seed to age 100
// Imports gameStore directly; in worker_threads each worker has its own module instance
// so the module-level `streams` variable in gameStore is fully isolated per worker.

import { useGameStore, loadScenarios } from '../../store/gameStore.ts';
import type { RunResult } from './types.ts';

// Cache the loadScenarios promise so we only call it once per worker process
let _scenariosReady: Promise<void> | null = null;

function ensureScenarios(): Promise<void> {
  if (_scenariosReady === null) {
    _scenariosReady = loadScenarios();
  }
  return _scenariosReady;
}

// Lightweight mulberry32 PRNG — used for dream picks and scenario choice selection
// separate from the game's RNG streams to avoid interference.
function createSimPrng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededPick3(ids: string[], seed: number): string[] {
  const rng = createSimPrng(seed);
  const picked: string[] = [];
  const available = [...ids];
  while (picked.length < 3 && available.length > 0) {
    const idx = Math.floor(rng() * available.length);
    picked.push(available[idx]);
    available.splice(idx, 1);
  }
  return picked;
}

// ─── AI 재무 전략 ───────────────────────────────────────────────────────────
// 매 연도마다 호출. 실제 플레이어의 행동을 흉내 내서 게임의 금융 시스템을 고루 탐색한다.
// rng를 써서 약간의 변동을 주되, 대체로 합리적인 의사결정을 한다.
//
// 전략 구조:
// 1) 배당재투자 — 25세 활성화
// 2) 직업 — 나이에 맞는 더 높은 월급 직업으로 전직
// 3) 대출 상환 — 여유 현금 있으면 우선 상환
// 4) 예금 — 현금의 일부를 은행에
// 5) 투자 — 나이대별 주식/부동산/채권 배분
// 6) 대출 — 투자 기회가 있지만 현금 부족 시 레버리지
// 7) 은퇴 — 65세부터 자산 축소

const TICKERS = ['DDUK', 'RAIN', 'PENG', 'TOFU', 'ROCK', 'CATB', 'META', 'LEGC', 'BORA', 'DOGE'];
const RE_IDS = ['studio', 'small_apt', 'villa', 'commercial', 'office', 'large_apt', 'mall', 'hotel', 'factory', 'resort'];
const RE_PRICES: Record<string, number> = {
  studio: 250_000_000, small_apt: 300_000_000, villa: 450_000_000,
  commercial: 500_000_000, office: 800_000_000, large_apt: 1_000_000_000,
  mall: 1_500_000_000, hotel: 2_000_000_000, factory: 2_500_000_000, resort: 3_000_000_000,
};
const BOND_IDS = ['short_bond', 'mid_bond', 'long_bond'];

// 직업 우선순위 (salary 기준, minAge 고려)
const JOB_LADDER = [
  { id: 'parttime', minAge: 15, salary: 800_000 },
  { id: 'officeworker', minAge: 22, salary: 3_300_000 },
  { id: 'teacher', minAge: 24, salary: 3_000_000 },
  { id: 'scientist', minAge: 28, salary: 5_000_000 },
  { id: 'doctor', minAge: 30, salary: 11_000_000 },
  { id: 'retired', minAge: 65, salary: 1_000_000 },
];

function applyFinancialStrategy(age: number, rng: () => number): void {
  const actions = useGameStore.getState();
  const st = useGameStore.getState();

  // ── 1) 배당재투자 활성화 (25세) ──
  if (age === 25 && !st.dripEnabled) {
    actions.toggleDrip();
  }

  // ── 2) 직업 전환 — 나이에 맞는 최고급여 직업으로 ──
  if (age >= 15 && age < 65) {
    const currentSalary = st.job?.salary ?? 0;
    // 나이에 맞고 현재보다 급여가 높은 직업 중 최고를 선택
    const candidate = JOB_LADDER
      .filter(j => age >= j.minAge && j.salary > currentSalary && j.id !== 'retired')
      .sort((a, b) => b.salary - a.salary)[0];
    if (candidate) {
      actions.changeJob(candidate.id);
    }
  } else if (age === 65 && st.job?.id !== 'retired') {
    actions.changeJob('retired');
  }

  // ── 3) 대출 상환 (여유 현금 있으면 우선) ──
  {
    const fresh = useGameStore.getState();
    if (fresh.bank.loanBalance > 0 && fresh.cash > 5_000_000) {
      const repayAmount = Math.min(
        fresh.bank.loanBalance,
        Math.floor(fresh.cash * 0.3), // 현금의 30%까지
      );
      if (repayAmount > 0) actions.repayLoan(repayAmount);
    }
  }

  // ── 4) 예금 — 현금의 일부를 은행에 ──
  {
    const fresh = useGameStore.getState();
    const depositRatio = age < 30 ? 0.3 : age < 50 ? 0.2 : 0.1;
    const depositAmount = Math.floor(fresh.cash * depositRatio);
    if (depositAmount > 1_000_000) {
      actions.deposit(depositAmount);
    }
  }

  // ── 5) 투자 전략 (나이대별) ──
  {
    const fresh = useGameStore.getState();
    const availableCash = fresh.cash;

    if (age < 50) {
      // 청년-중년: 주식 중심 + 부동산 기회 추구

      // 주식 매수 — 현금의 20-40%를 랜덤 종목에
      const stockBudget = Math.floor(availableCash * (0.2 + rng() * 0.2));
      if (stockBudget > 100_000) {
        const tickerIdx = Math.floor(rng() * TICKERS.length);
        const ticker = TICKERS[tickerIdx];
        const price = fresh.prices[ticker];
        if (price && price > 0) {
          const shares = Math.max(1, Math.floor(stockBudget / price));
          if (shares > 0 && shares * price <= fresh.cash) {
            actions.buy(ticker, shares);
          }
        }
      }

      // 부동산 매입 — 25세 이후, 현금이 충분하면. 자산 규모에 맞는 부동산 선택
      if (age >= 25) {
        const freshAfterStock = useGameStore.getState();
        // 현금의 70%까지 투자 가능한 가장 비싼 부동산 선택 (과도한 올인 방지)
        const budget = Math.floor(freshAfterStock.cash * 0.7);
        const affordable = RE_IDS
          .filter(id => RE_PRICES[id] <= budget)
          .sort((a, b) => RE_PRICES[b] - RE_PRICES[a]);
        // 보유 상한 3채, 매년 매입 확률로 분산
        if (affordable.length > 0 && freshAfterStock.realEstate.length < 3 && rng() < 0.4) {
          actions.buyRealEstate(affordable[0]);
        } else if (affordable.length === 0 && freshAfterStock.cash > 100_000_000
                   && freshAfterStock.realEstate.length === 0 && !freshAfterStock.hadLoan && rng() < 0.3) {
          // 대출을 받아서라도 첫 부동산 매입 시도 (원룸/소형)
          const target = freshAfterStock.cash >= 200_000_000 ? 'small_apt' : 'studio';
          const needed = RE_PRICES[target] - freshAfterStock.cash;
          if (needed > 0 && needed < 200_000_000) {
            if (actions.takeLoan(needed)) {
              actions.buyRealEstate(target);
            }
          }
        }
      }

    } else if (age < 65) {
      // 중후반: 채권 + 안정 주식 전환

      // 채권 매수 — 현금이 충분하면
      if (availableCash > 30_000_000 && fresh.bonds.length < 3) {
        const bondIdx = Math.floor(rng() * BOND_IDS.length);
        actions.buyBond(BOND_IDS[bondIdx]);
      }

      // 안정 주식 추가 (배당률 높은 종목)
      const stableTickers = ['CATB', 'TOFU', 'PENG', 'DOGE']; // 고배당
      const stableBudget = Math.floor(availableCash * 0.15);
      if (stableBudget > 100_000) {
        const pick = stableTickers[Math.floor(rng() * stableTickers.length)];
        const price = fresh.prices[pick];
        if (price && price > 0) {
          const shares = Math.max(1, Math.floor(stableBudget / price));
          if (shares * price <= useGameStore.getState().cash) {
            actions.buy(pick, shares);
          }
        }
      }

      // 추가 부동산 — 자산에 비례한 업그레이드
      if (fresh.realEstate.length < 3 && rng() < 0.3) {
        const reBudget = Math.floor(availableCash * 0.5);
        const reAffordable = RE_IDS
          .filter(id => RE_PRICES[id] <= reBudget)
          .sort((a, b) => RE_PRICES[b] - RE_PRICES[a]);
        if (reAffordable.length > 0) {
          actions.buyRealEstate(reAffordable[0]);
        }
      }

    } else {
      // 은퇴기: 자산 축소, 채권 만기 대기, 주식 일부 매도

      // 고변동성 주식 매도
      const volatileTickers = ['ROCK', 'META'];
      for (const ticker of volatileTickers) {
        const holding = fresh.holdings.find(h => h.ticker === ticker);
        if (holding && holding.shares > 0) {
          const sellShares = Math.ceil(holding.shares * 0.3); // 30%씩 매도
          actions.sell(ticker, sellShares);
        }
      }

      // 현금 부족 시 은행에서 인출
      const freshRetire = useGameStore.getState();
      if (freshRetire.cash < 5_000_000 && freshRetire.bank.balance > 10_000_000) {
        actions.withdraw(Math.floor(freshRetire.bank.balance * 0.1));
      }
    }
  }
}

export async function runSingleGame(seed: number, runIndex: number): Promise<RunResult> {
  await ensureScenarios();

  try {
    const store = useGameStore.getState();

    // Build dream id list from store master
    const allDreamIds = store.stocksMaster
      ? []  // will be overridden below
      : [];

    // Get dream IDs from the static DREAMS_MASTER via store
    // dreams are accessible through store after startNewGame
    // We need dreams before startNewGame to pass pickedDreamIds — use raw import
    const dreamsModule = await import('../data/dreams.json', { assert: { type: 'json' } });
    const allDreams = dreamsModule.default as { id: string }[];
    const dreamIds = allDreamIds.length > 0 ? allDreamIds : allDreams.map((d) => d.id);

    const pickedDreamIds = seededPick3(dreamIds, seed);

    // Start a new game — this resets all state and sets up streams from seed
    useGameStore.getState().startNewGame('시뮬', pickedDreamIds, seed);

    // Separate PRNG for choosing scenario options + financial strategy
    const choiceRng = createSimPrng(seed ^ 0xDEADBEEF);
    const strategyRng = createSimPrng(seed ^ 0xCAFEBABE);

    // Main simulation loop: age 10 to 99 (advanceYear is called for each integer age)
    for (let age = 10; age < 100; age++) {
      useGameStore.getState().advanceYear(age, 1);

      // Drain any pending events (phase === 'paused') before next tick
      let safety = 0;
      while (safety < 20) {
        const phase = useGameStore.getState().phase;
        if (phase.kind !== 'paused') break;
        // Pick a random choice from the available options
        const numChoices = phase.event.choices.length;
        const choiceIndex = numChoices > 1
          ? Math.floor(choiceRng() * numChoices)
          : 0;
        useGameStore.getState().chooseOption(choiceIndex);
        safety++;
      }

      // Apply AI financial strategy — exercises stocks, bonds, real estate, loans, jobs
      // Toggle via environment variable: SIM_NO_STRATEGY=1 disables to see raw baseline
      if (!process.env.SIM_NO_STRATEGY) {
        applyFinancialStrategy(age, strategyRng);
      }
    }

    // End the game if not already ended
    const stateBeforeEnd = useGameStore.getState();
    if (stateBeforeEnd.ending === null) {
      useGameStore.getState().endGame();
    }

    const st = useGameStore.getState();
    const ending = st.ending;

    const stocksValue = st.holdings.reduce(
      (sum, h) => sum + (st.prices[h.ticker] ?? 0) * h.shares,
      0,
    );
    const realEstateValue = st.realEstate.reduce((sum, re) => sum + re.currentValue, 0);
    const bondsValue = st.bonds.reduce((sum, b) => sum + (b.matured ? 0 : b.faceValue), 0);
    const totalAssets = st.cash + st.bank.balance + stocksValue + realEstateValue + bondsValue;

    // Build scenarioFireCounts from usedScenarioIds
    const scenarioFireCounts: Record<string, number> = {};
    for (const id of st.usedScenarioIds) {
      scenarioFireCounts[id] = (scenarioFireCounts[id] ?? 0) + 1;
    }

    const holdYearsMap: Record<string, number> = {};
    for (const h of st.holdings) {
      // Approximate hold years: can't know exact buy age without tracking, use age 100 - 10 as max
      holdYearsMap[h.ticker] = 0; // no buy age tracked in Holding type
    }

    const result: RunResult = {
      runIndex,
      seed,
      finalAge: 99,
      finalCash: st.cash,
      finalBankBalance: st.bank.balance,
      finalStocksValue: stocksValue,
      finalRealEstateValue: realEstateValue,
      finalBondsValue: bondsValue,
      finalTotalAssets: totalAssets,
      grade: ending?.grade ?? 'unknown' as string,
      dreamsAchieved: ending?.dreamsAchieved ?? 0,
      dreamsTotal: ending?.totalDreams ?? pickedDreamIds.length,
      dreamIdsAchieved: st.dreams.filter((d) => d.achieved).map((d) => d.id),
      dreamIdsAll: pickedDreamIds,
      uniqueScenariosFired: new Set(st.usedScenarioIds).size,
      scenarioFireCounts,
      finalStats: {
        happiness: st.character.happiness,
        health: st.character.health,
        wisdom: st.character.wisdom,
        charisma: st.character.charisma,
      },
      finalEconomyPhase: st.economyCycle.phase,
      traits: [...st.traits],
      keyMomentCount: st.keyMoments.length,
      hadLoan: st.hadLoan,
      loanFullyRepaid: st.loanFullyRepaid,
      holdings: st.holdings.map((h) => ({
        ticker: h.ticker,
        shares: h.shares,
        holdYears: 0, // buy age not tracked in Holding type
      })),
      realEstateHoldings: st.realEstate.map((re) => ({
        purchasedAtAge: re.purchasedAtAge,
        currentValue: re.currentValue,
        purchasePrice: re.purchasePrice,
      })),
      bondHoldings: st.bonds.map((b) => ({
        purchasedAtAge: b.purchasedAtAge,
        faceValue: b.faceValue,
        matured: b.matured,
      })),
      assetHistory: [...st.assetHistory],
    };

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      runIndex,
      seed,
      finalAge: 0,
      finalCash: 0,
      finalBankBalance: 0,
      finalStocksValue: 0,
      finalRealEstateValue: 0,
      finalBondsValue: 0,
      finalTotalAssets: 0,
      grade: 'unknown',
      dreamsAchieved: 0,
      dreamsTotal: 0,
      dreamIdsAchieved: [],
      dreamIdsAll: [],
      uniqueScenariosFired: 0,
      scenarioFireCounts: {},
      finalStats: { happiness: 0, health: 0, wisdom: 0, charisma: 0 },
      finalEconomyPhase: 'unknown',
      traits: [],
      keyMomentCount: 0,
      hadLoan: false,
      loanFullyRepaid: false,
      holdings: [],
      realEstateHoldings: [],
      bondHoldings: [],
      assetHistory: [],
      errored: errorMsg,
    };
  }
}
