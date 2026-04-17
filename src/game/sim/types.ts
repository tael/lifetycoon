// RunResult: single headless game run output
// Worker produces one RunResult per runId and posts it to main thread

export type RunResult = {
  runIndex: number;
  seed: number;
  finalAge: number;
  finalCash: number;
  finalBankBalance: number;
  finalStocksValue: number;
  finalRealEstateValue: number;
  finalBondsValue: number;
  finalTotalAssets: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'unknown';
  dreamsAchieved: number;
  dreamsTotal: number;
  dreamIdsAchieved: string[];
  dreamIdsAll: string[];
  uniqueScenariosFired: number;
  scenarioFireCounts: Record<string, number>;
  finalStats: { happiness: number; health: number; wisdom: number; charisma: number };
  finalEconomyPhase: string;
  traits: string[];
  keyMomentCount: number;
  hadLoan: boolean;
  loanFullyRepaid: boolean;
  holdings: { ticker: string; shares: number; holdYears: number }[];
  realEstateHoldings: { purchasedAtAge: number; currentValue: number; purchasePrice: number }[];
  bondHoldings: { purchasedAtAge: number; faceValue: number; matured: boolean }[];
  assetHistory: { age: number; value: number }[];
  errored?: string;
};
