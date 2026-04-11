const STORAGE_KEY = 'lifetycoon-kids:global-stats';

export type GlobalStats = {
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
};

export type GlobalStatsInput = {
  finalAssets: number;
  dreamsAchieved: number;
  jobId: string | null;
  holdingTickers: string[];
  sessionDurationMs: number;
};

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
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function clearGlobalStats(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
