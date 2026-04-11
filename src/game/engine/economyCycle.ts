// Economic cycle system: boom / normal / recession
// Cycles every 15~25 years using PRNG for deterministic results

export type EconomyPhase = 'boom' | 'normal' | 'recession';

export type EconomyCycle = {
  phase: EconomyPhase;
  yearsSinceChange: number;
  /** Next change will happen after this many years from last change */
  nextChangeAfter: number;
};

export const PHASE_DRIFT_BONUS: Record<EconomyPhase, number> = {
  boom: 0.05,
  normal: 0,
  recession: -0.05,
};

export const PHASE_INTEREST_BONUS: Record<EconomyPhase, number> = {
  boom: 0.01,
  normal: 0,
  recession: -0.01,
};

/** 은행 이자율 하드 캡. 교육 게임이므로 비현실적 폭주를 방지한다. */
export const MAX_INTEREST_RATE = 0.30;
/** 은행 이자율 하한. 경기침체 + 기타 마이너스 보너스가 쌓여도 음수가 되지 않도록. */
export const MIN_INTEREST_RATE = 0.005;

/**
 * base rate(영구 저장)에 phase/skill 보너스(일회성)를 얹은 "이번 틱에 실제로 적용되는 이자율"을 반환.
 * 이 함수의 결과는 상태에 저장하면 안 된다. 저장하면 다음 틱에 보너스가 중복 누적된다.
 */
export function getEffectiveInterestRate(
  baseRate: number,
  phase: EconomyPhase,
  hasFinanceSkill: boolean,
): number {
  const raw = baseRate + PHASE_INTEREST_BONUS[phase] + (hasFinanceSkill ? 0.01 : 0);
  return Math.min(MAX_INTEREST_RATE, Math.max(MIN_INTEREST_RATE, raw));
}

const PHASE_SEQUENCE: EconomyPhase[] = ['normal', 'boom', 'normal', 'recession'];

export function createEconomyCycle(rng: () => number): EconomyCycle {
  return {
    phase: 'normal',
    yearsSinceChange: 0,
    nextChangeAfter: nextCycleDuration(rng),
  };
}

/** Returns a random cycle duration between 15 and 25 years */
export function nextCycleDuration(rng: () => number): number {
  return Math.floor(rng() * 11) + 15; // 15..25
}

/**
 * Advance cycle by deltaYears.
 * Returns updated cycle and whether the phase changed this step.
 */
export function stepEconomyCycle(
  cycle: EconomyCycle,
  deltaYears: number,
  rng: () => number,
): { cycle: EconomyCycle; changed: boolean } {
  const newYears = cycle.yearsSinceChange + deltaYears;

  if (newYears >= cycle.nextChangeAfter) {
    const currentIdx = PHASE_SEQUENCE.indexOf(cycle.phase);
    const nextPhase = PHASE_SEQUENCE[(currentIdx + 1) % PHASE_SEQUENCE.length];
    return {
      cycle: {
        phase: nextPhase,
        yearsSinceChange: newYears - cycle.nextChangeAfter,
        nextChangeAfter: nextCycleDuration(rng),
      },
      changed: true,
    };
  }

  return {
    cycle: { ...cycle, yearsSinceChange: newYears },
    changed: false,
  };
}

export const PHASE_LABEL: Record<EconomyPhase, string> = {
  boom: '🔥호황',
  normal: '⚡보통',
  recession: '🥶불황',
};
