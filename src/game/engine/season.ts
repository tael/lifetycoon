export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

// elapsedMs를 계절로 변환 (1년 6700ms / 4 = 1675ms per season)
export function getSeason(elapsedMs: number): Season {
  const yearFraction = (elapsedMs % 6700) / 6700;
  if (yearFraction < 0.25) return 'spring';
  if (yearFraction < 0.5) return 'summer';
  if (yearFraction < 0.75) return 'autumn';
  return 'winter';
}

// yearIndex(0-based)에서 계절 반환 (advanceYear용 단순 로테이션)
export function seasonFromYearIndex(yearIndex: number): Season {
  return SEASONS[yearIndex % 4];
}

export const SEASON_EMOJI: Record<Season, string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
};

export const SEASON_KO: Record<Season, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
};
