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
