import type { Ending } from '../game/types';

const STORAGE_KEY = 'lifetycoon-kids:gallery';
const MAX_RECORDS = 20;

export type EndingRecord = {
  characterName: string;
  grade: string;
  title: string;
  finalAssets: number;
  dreamsAchieved: number;
  totalDreams: number;
  playedAt: string; // ISO
};

export function loadGallery(): EndingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEndingToGallery(
  characterName: string,
  ending: Ending,
  title: string,
): void {
  const record: EndingRecord = {
    characterName,
    grade: ending.grade,
    title,
    finalAssets: ending.finalAssets,
    dreamsAchieved: ending.dreamsAchieved,
    totalDreams: ending.totalDreams,
    playedAt: new Date().toISOString(),
  };
  const prev = loadGallery();
  const next = [record, ...prev].slice(0, MAX_RECORDS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage 용량 초과 등 무시
  }
}

export function clearGallery(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
