const STORAGE_KEY = 'lifetycoon-kids:legacy';

const MAX_INHERITANCE = 100_000_000; // 1억
const INHERITANCE_RATE = 0.2; // 20%

export type LegacyRecord = {
  parentName: string;
  parentGrade: string;
  inheritance: number;
  parentTraits: string[];
  parentAge: number;
};

export function calcInheritance(finalAssets: number): number {
  return Math.min(Math.round(finalAssets * INHERITANCE_RATE), MAX_INHERITANCE);
}

export function saveLegacy(record: LegacyRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore storage errors
  }
}

export function loadLegacy(): LegacyRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LegacyRecord) : null;
  } catch {
    return null;
  }
}

export function clearLegacy(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
