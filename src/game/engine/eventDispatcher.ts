// Event dispatcher: selects which scenario events fire at a given age/state

import type { ScenarioEvent, TriggerKind } from '../types';
import { weightedPick } from './prng';

export type DispatchContext = {
  age: number;
  cash: number;
  job: { id: string } | null;
  traits: string[];
  usedScenarioIds: Set<string>;
};

export function isEligible(
  ev: ScenarioEvent,
  ctx: DispatchContext,
): boolean {
  if (ev.oneShot && ctx.usedScenarioIds.has(ev.id)) return false;
  if (ctx.age < ev.ageRange[0] || ctx.age > ev.ageRange[1]) return false;
  for (const trig of ev.triggers) {
    if (!matchTrigger(trig, ctx)) return false;
  }
  return true;
}

function matchTrigger(t: TriggerKind, ctx: DispatchContext): boolean {
  switch (t.kind) {
    case 'ageRange':
      return ctx.age >= t.min && ctx.age <= t.max;
    case 'specificAge':
      return Math.floor(ctx.age) === t.age;
    case 'cashGte':
      return ctx.cash >= t.value;
    case 'cashLte':
      return ctx.cash <= t.value;
    case 'hasJob':
      return ctx.job?.id === t.jobId;
    case 'hasTrait':
      return ctx.traits.includes(t.trait);
  }
}

export function pickEligibleEvent(
  allEvents: ScenarioEvent[],
  ctx: DispatchContext,
  eventRng: () => number,
  specificAgeGuaranteed: boolean,
): ScenarioEvent | null {
  const eligible = allEvents.filter((ev) => isEligible(ev, ctx));
  if (eligible.length === 0) return null;

  // If any specific-age trigger matches, prioritize those
  if (specificAgeGuaranteed) {
    const specifics = eligible.filter((ev) =>
      ev.triggers.some((t) => t.kind === 'specificAge'),
    );
    if (specifics.length > 0) {
      return weightedPick(eventRng, specifics, (ev) => ev.weight);
    }
  }

  return weightedPick(eventRng, eligible, (ev) => ev.weight);
}

// Probability that any event fires this year (for non-specific-age triggers)
// Tuned so ~0.7 events per year = ~1 event every 1.5 years (~63 events in 90 years)
export function eventChancePerYear(): number {
  return 0.4;
}
