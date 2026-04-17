// aggregate.ts — RunResult[] → DashboardMetrics
// Only computes metrics available from current state fields.
// Metrics not available are marked with TODO comments.

import type { RunResult } from './types.ts';

export type GradeDistribution = {
  S: { count: number; ratio: number };
  A: { count: number; ratio: number };
  B: { count: number; ratio: number };
  C: { count: number; ratio: number };
  unknown: { count: number; ratio: number };
};

export type AssetDistribution = {
  mean: number;
  median: number;
  p10: number;
  p50: number;
  p90: number;
  p99: number;
  bankruptcyRatio: number;
  top1Ratio: number;
};

export type DreamCompletion = {
  perDream: { id: string; count: number; ratio: number }[];
  meanAchieved: number;
  outliers: { id: string; ratio: number; kind: 'never' | 'always' }[];
};

export type ScenarioTriggerFreq = {
  top20: { id: string; count: number }[];
  bottom20: { id: string; count: number }[];
  neverFiredCount: number; // how many observed scenario IDs had 0 fires (impossible by definition — tracked across runs)
  globalCounts: Record<string, number>;
};

export type StatDistribution = {
  mean: number;
  p10: number;
  p50: number;
  p90: number;
};

export type FinalStatDistributions = {
  happiness: StatDistribution;
  health: StatDistribution;
  wisdom: StatDistribution;
  charisma: StatDistribution;
};

export type AssetHistorySummary = {
  // per decade: age 10,20,30,...,90,100 (subset of 5yr assetHistory snapshots)
  perDecade: { age: number; mean: number; p10: number; p90: number }[];
};

export type InvestmentHoldingRatios = {
  stockHoldRatio: number;      // fraction of runs with >=1 stock holding at end
  realEstateHoldRatio: number; // fraction of runs with >=1 real estate at end
  bondHoldRatio: number;       // fraction of runs with >=1 bond at end
};

export type LoanUsage = {
  hadLoanRatio: number;
  fullyRepaidRatio: number; // among runs that had a loan
};

export type TraitsSummary = {
  meanTraitCount: number;
  top20: { trait: string; count: number; ratio: number }[];
};

export type DashboardMetrics = {
  totalRuns: number;
  erroredRuns: number;
  gradeDistribution: GradeDistribution;
  assetDistribution: AssetDistribution;
  dreamCompletion: DreamCompletion;
  scenarioTriggerFreq: ScenarioTriggerFreq;
  finalStatDistributions: FinalStatDistributions;
  assetHistorySummary: AssetHistorySummary;
  investmentHoldingRatios: InvestmentHoldingRatios;
  loanUsage: LoanUsage;
  traitsSummary: TraitsSummary;
  // TODO(g): Per-year income decomposition — not available (no income tracking per source in state)
  // TODO(k): Tax stats detail — totalTaxPaid exists but bracket/inflation breakdown not tracked
  // TODO(d): Per-year stat penalty history — only final stats available
  // TODO(e): Economy cycle history — only finalEconomyPhase available per run
  // TODO(i partial): Realized investment PnL — avgBuyPrice exists but realized PnL not tracked
  // TODO(j partial): Peak debt — only hadLoan/loanFullyRepaid tracked, not peak value
};

// ─── percentile helpers ──────────────────────────────────────────────────────

function sorted(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b);
}

function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const idx = (p / 100) * (sortedArr.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function statDist(arr: number[]): StatDistribution {
  const s = sorted(arr);
  return {
    mean: mean(arr),
    p10: percentile(s, 10),
    p50: percentile(s, 50),
    p90: percentile(s, 90),
  };
}

// ─── main aggregation ────────────────────────────────────────────────────────

export function aggregate(results: RunResult[]): DashboardMetrics {
  const total = results.length;
  const errored = results.filter((r) => r.errored != null).length;
  const valid = results.filter((r) => r.errored == null);

  // (a) Grade distribution
  const gradeCounts = { S: 0, A: 0, B: 0, C: 0, unknown: 0 };
  for (const r of results) {
    gradeCounts[r.grade]++;
  }
  const gradeDistribution: GradeDistribution = {
    S: { count: gradeCounts.S, ratio: gradeCounts.S / total },
    A: { count: gradeCounts.A, ratio: gradeCounts.A / total },
    B: { count: gradeCounts.B, ratio: gradeCounts.B / total },
    C: { count: gradeCounts.C, ratio: gradeCounts.C / total },
    unknown: { count: gradeCounts.unknown, ratio: gradeCounts.unknown / total },
  };

  // (b) Asset distribution
  const assetValues = valid.map((r) => r.finalTotalAssets);
  const assetSorted = sorted(assetValues);
  const bankruptcyCount = assetValues.filter((v) => v < 0).length;
  const top1Threshold = percentile(assetSorted, 99);
  const top1Count = assetValues.filter((v) => v >= top1Threshold).length;
  const assetDistribution: AssetDistribution = {
    mean: mean(assetValues),
    median: percentile(assetSorted, 50),
    p10: percentile(assetSorted, 10),
    p50: percentile(assetSorted, 50),
    p90: percentile(assetSorted, 90),
    p99: percentile(assetSorted, 99),
    bankruptcyRatio: total > 0 ? bankruptcyCount / total : 0,
    top1Ratio: total > 0 ? top1Count / total : 0,
  };

  // (c) Dream completion
  // Collect all observed dream IDs across all runs
  const allDreamIds = new Set<string>();
  for (const r of results) {
    for (const id of r.dreamIdsAll) allDreamIds.add(id);
  }
  const dreamAchieveCounts: Record<string, number> = {};
  const dreamTotalCounts: Record<string, number> = {};
  for (const id of allDreamIds) {
    dreamAchieveCounts[id] = 0;
    dreamTotalCounts[id] = 0;
  }
  for (const r of results) {
    for (const id of r.dreamIdsAll) {
      dreamTotalCounts[id] = (dreamTotalCounts[id] ?? 0) + 1;
      if (r.dreamIdsAchieved.includes(id)) {
        dreamAchieveCounts[id] = (dreamAchieveCounts[id] ?? 0) + 1;
      }
    }
  }
  const perDream = Array.from(allDreamIds).map((id) => {
    const cnt = dreamTotalCounts[id] ?? 0;
    const achieved = dreamAchieveCounts[id] ?? 0;
    return { id, count: achieved, ratio: cnt > 0 ? achieved / cnt : 0 };
  });
  const meanAchieved = valid.length > 0
    ? mean(valid.map((r) => r.dreamsAchieved))
    : 0;
  const outliers = perDream.filter(
    (d) => d.ratio === 0 || d.ratio > 0.95,
  ).map((d) => ({
    id: d.id,
    ratio: d.ratio,
    kind: (d.ratio === 0 ? 'never' : 'always') as 'never' | 'always',
  }));
  const dreamCompletion: DreamCompletion = { perDream, meanAchieved, outliers };

  // Scenario trigger frequency
  const globalCounts: Record<string, number> = {};
  for (const r of results) {
    for (const [id, cnt] of Object.entries(r.scenarioFireCounts)) {
      globalCounts[id] = (globalCounts[id] ?? 0) + cnt;
    }
  }
  const sortedScenarios = Object.entries(globalCounts).sort((a, b) => b[1] - a[1]);
  const top20 = sortedScenarios.slice(0, 20).map(([id, count]) => ({ id, count }));
  const withFires = sortedScenarios.filter(([, c]) => c > 0);
  const bottom20 = [...withFires].sort((a, b) => a[1] - b[1]).slice(0, 20).map(([id, count]) => ({ id, count }));
  const scenarioTriggerFreq: ScenarioTriggerFreq = {
    top20,
    bottom20,
    neverFiredCount: 0, // can only count observed IDs; all observed had at least 1 fire
    globalCounts,
  };

  // Final stat distributions
  const happinessArr = valid.map((r) => r.finalStats.happiness);
  const healthArr = valid.map((r) => r.finalStats.health);
  const wisdomArr = valid.map((r) => r.finalStats.wisdom);
  const charismaArr = valid.map((r) => r.finalStats.charisma);
  const finalStatDistributions: FinalStatDistributions = {
    happiness: statDist(happinessArr),
    health: statDist(healthArr),
    wisdom: statDist(wisdomArr),
    charisma: statDist(charismaArr),
  };

  // Asset history summary — 10-year checkpoints from 5-year snapshots
  const decades = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const perDecade = decades.map((age) => {
    const values = valid
      .map((r) => {
        const snap = r.assetHistory.find((h) => h.age === age);
        return snap?.value ?? null;
      })
      .filter((v): v is number => v !== null);
    const s = sorted(values);
    return {
      age,
      mean: mean(values),
      p10: percentile(s, 10),
      p90: percentile(s, 90),
    };
  });
  const assetHistorySummary: AssetHistorySummary = { perDecade };

  // Investment holding ratios
  const stockHoldCount = valid.filter((r) => r.holdings.length > 0).length;
  const realEstateHoldCount = valid.filter((r) => r.realEstateHoldings.length > 0).length;
  const bondHoldCount = valid.filter((r) => r.bondHoldings.length > 0).length;
  const validTotal = valid.length > 0 ? valid.length : 1;
  const investmentHoldingRatios: InvestmentHoldingRatios = {
    stockHoldRatio: stockHoldCount / validTotal,
    realEstateHoldRatio: realEstateHoldCount / validTotal,
    bondHoldRatio: bondHoldCount / validTotal,
  };

  // Loan usage
  const hadLoanCount = valid.filter((r) => r.hadLoan).length;
  const fullyRepaidCount = valid.filter((r) => r.hadLoan && r.loanFullyRepaid).length;
  const loanUsage: LoanUsage = {
    hadLoanRatio: hadLoanCount / validTotal,
    fullyRepaidRatio: hadLoanCount > 0 ? fullyRepaidCount / hadLoanCount : 0,
  };

  // Traits summary
  const traitCountArr = valid.map((r) => r.traits.length);
  const traitFreq: Record<string, number> = {};
  for (const r of valid) {
    for (const t of r.traits) {
      traitFreq[t] = (traitFreq[t] ?? 0) + 1;
    }
  }
  const top20Traits = Object.entries(traitFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([trait, count]) => ({ trait, count, ratio: count / validTotal }));
  const traitsSummary: TraitsSummary = {
    meanTraitCount: mean(traitCountArr),
    top20: top20Traits,
  };

  return {
    totalRuns: total,
    erroredRuns: errored,
    gradeDistribution,
    assetDistribution,
    dreamCompletion,
    scenarioTriggerFreq,
    finalStatDistributions,
    assetHistorySummary,
    investmentHoldingRatios,
    loanUsage,
    traitsSummary,
  };
}
