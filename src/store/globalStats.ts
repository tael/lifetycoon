import type { Grade } from '../game/types';

const STORAGE_KEY = 'lifetycoon-kids:global-stats';

export type GlobalStats = {
  // 기존 필드
  totalPlays: number;
  totalYearsLived: number;
  totalAssetsEarned: number;
  totalDreamsAchieved: number;
  mostPlayedJob: string | null;
  jobPlayCounts: Record<string, number>;
  favoriteStock: string | null;
  stockTradeCounts: Record<string, number>;
  longestSession: number; // ms
  lastUpdated: string;
  // 확장 필드
  totalGamesPlayed: number;
  totalChoicesMade: number;
  totalMoneyEarned: number;
  totalBought: number;
  totalSold: number;
  bestEverGrade: Grade | null;
  totalScenariosSeen: string[]; // unique id set을 배열로 저장
};

export type GlobalStatsInput = {
  finalAssets: number;
  dreamsAchieved: number;
  jobId: string | null;
  holdingTickers: string[];
  sessionDurationMs: number;
  // 확장 필드
  grade?: Grade;
  choicesMade?: number;
  moneyEarned?: number;
  scenariosSeen?: string[];
};

const GRADE_ORDER: Record<Grade, number> = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };

export function loadGlobalStats(): GlobalStats | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GlobalStats) : null;
  } catch {
    return null;
  }
}

export function updateGlobalStats(input: GlobalStatsInput): void {
  const prev = loadGlobalStats();
  const jobPlayCounts: Record<string, number> = { ...(prev?.jobPlayCounts ?? {}) };
  if (input.jobId) {
    jobPlayCounts[input.jobId] = (jobPlayCounts[input.jobId] ?? 0) + 1;
  }
  const stockTradeCounts: Record<string, number> = { ...(prev?.stockTradeCounts ?? {}) };
  for (const ticker of input.holdingTickers) {
    stockTradeCounts[ticker] = (stockTradeCounts[ticker] ?? 0) + 1;
  }
  const mostPlayedJob =
    Object.keys(jobPlayCounts).length > 0
      ? Object.keys(jobPlayCounts).reduce((a, b) =>
          jobPlayCounts[a] >= jobPlayCounts[b] ? a : b,
        )
      : null;
  const favoriteStock =
    Object.keys(stockTradeCounts).length > 0
      ? Object.keys(stockTradeCounts).reduce((a, b) =>
          stockTradeCounts[a] >= stockTradeCounts[b] ? a : b,
        )
      : null;

  // bestEverGrade 계산
  const prevGrade = prev?.bestEverGrade ?? null;
  let bestEverGrade: Grade | null = prevGrade;
  if (input.grade) {
    if (!prevGrade || GRADE_ORDER[input.grade] > GRADE_ORDER[prevGrade]) {
      bestEverGrade = input.grade;
    }
  }

  // totalScenariosSeen 병합 (unique)
  const prevSeen = new Set(prev?.totalScenariosSeen ?? []);
  for (const id of input.scenariosSeen ?? []) {
    prevSeen.add(id);
  }

  const next: GlobalStats = {
    totalPlays: (prev?.totalPlays ?? 0) + 1,
    totalYearsLived: (prev?.totalYearsLived ?? 0) + 90,
    totalAssetsEarned: (prev?.totalAssetsEarned ?? 0) + input.finalAssets,
    totalDreamsAchieved: (prev?.totalDreamsAchieved ?? 0) + input.dreamsAchieved,
    mostPlayedJob,
    jobPlayCounts,
    favoriteStock,
    stockTradeCounts,
    longestSession: Math.max(prev?.longestSession ?? 0, input.sessionDurationMs),
    lastUpdated: new Date().toISOString(),
    // 확장 필드
    totalGamesPlayed: (prev?.totalGamesPlayed ?? 0) + 1,
    totalChoicesMade: (prev?.totalChoicesMade ?? 0) + (input.choicesMade ?? 0),
    totalMoneyEarned: (prev?.totalMoneyEarned ?? 0) + (input.moneyEarned ?? input.finalAssets),
    totalBought: prev?.totalBought ?? 0,
    totalSold: prev?.totalSold ?? 0,
    bestEverGrade,
    totalScenariosSeen: Array.from(prevSeen),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function incrementBought(): void {
  const prev = loadGlobalStats();
  if (!prev) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, totalBought: (prev.totalBought ?? 0) + 1 }));
  } catch {}
}

export function incrementSold(): void {
  const prev = loadGlobalStats();
  if (!prev) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, totalSold: (prev.totalSold ?? 0) + 1 }));
  } catch {}
}

export function clearGlobalStats(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
