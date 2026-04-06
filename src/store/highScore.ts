import type { Ending, Grade } from '../game/types';

const STORAGE_KEY = 'lifetycoon-kids:highscore';

export type HighScore = {
  bestGrade: Grade;
  highestAssets: number;
  highestHappiness: number;
  mostDreams: number;
  totalGames: number;
  lastPlayed: string;
};

const GRADE_ORDER: Record<Grade, number> = { S: 4, A: 3, B: 2, C: 1 };

export function loadHighScore(): HighScore | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function updateHighScore(ending: Ending): { isNewRecord: boolean; hs: HighScore } {
  const prev = loadHighScore();
  const hs: HighScore = {
    bestGrade: prev
      ? GRADE_ORDER[ending.grade] > GRADE_ORDER[prev.bestGrade]
        ? ending.grade
        : prev.bestGrade
      : ending.grade,
    highestAssets: Math.max(prev?.highestAssets ?? 0, ending.finalAssets),
    highestHappiness: Math.max(prev?.highestHappiness ?? 0, ending.finalHappiness),
    mostDreams: Math.max(prev?.mostDreams ?? 0, ending.dreamsAchieved),
    totalGames: (prev?.totalGames ?? 0) + 1,
    lastPlayed: new Date().toISOString(),
  };
  const isNewRecord =
    !prev ||
    ending.finalAssets > (prev.highestAssets ?? 0) ||
    GRADE_ORDER[ending.grade] > GRADE_ORDER[prev.bestGrade];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hs));
  return { isNewRecord, hs };
}
