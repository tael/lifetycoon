// Time axis: convert elapsedMs ↔ age.
// Base: 1 year = 6700ms. Speed multiplier scales delta ingest.

export const MS_PER_YEAR = 6700;
export const START_AGE = 10;
export const END_AGE = 100;

export function elapsedMsToAge(elapsedMs: number): number {
  return START_AGE + elapsedMs / MS_PER_YEAR;
}

export function ageToElapsedMs(age: number): number {
  return (age - START_AGE) * MS_PER_YEAR;
}

export function formatAge(age: number): string {
  return `${Math.floor(age)}세`;
}

export function isFinished(age: number): boolean {
  return age >= END_AGE;
}

export function progressFraction(age: number): number {
  return Math.min(1, Math.max(0, (age - START_AGE) / (END_AGE - START_AGE)));
}
