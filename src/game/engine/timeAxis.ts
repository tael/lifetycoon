// Time axis: convert elapsedMs ↔ age.
// Base: 1 year = 6700ms. Speed multiplier scales delta ingest.

export const MS_PER_YEAR = 6700;
export const MS_PER_MONTH = MS_PER_YEAR / 12;
export const START_AGE = 10;
export const END_AGE = 100;

/**
 * 시간 비용(개월)을 elapsedMs로 변환한다. 음수는 0으로 절단해서
 * "과거로 되돌리는" 케이스를 차단한다(히스토리/연금 등 누적 상태가 꼬임).
 */
export function monthsToMs(months: number): number {
  if (!Number.isFinite(months) || months <= 0) return 0;
  return MS_PER_MONTH * months;
}

export function elapsedMsToAge(elapsedMs: number): number {
  return START_AGE + elapsedMs / MS_PER_YEAR;
}

export function ageToElapsedMs(age: number): number {
  return (age - START_AGE) * MS_PER_YEAR;
}

export function formatAge(age: number): string {
  // 유저 피드백: "타이머가 10분을 세는 것 같다"는 인식을 지우려면 세 단위만이 아니라
  // 월까지 노출해서 "인생의 시간"이 흐른다는 감각을 준다. 예: "15세 3월".
  const years = Math.floor(age);
  const month = Math.floor((age - years) * 12) + 1; // 1..12
  return `${years}세 ${month}월`;
}

export function isFinished(age: number): boolean {
  return age >= END_AGE;
}

export function progressFraction(age: number): number {
  return Math.min(1, Math.max(0, (age - START_AGE) / (END_AGE - START_AGE)));
}
