// Scenario engine: applies an event choice's effects to the game state.

import type {
  BankAccount,
  Character,
  EventChoice,
  EventEffect,
  Holding,
  Job,
  KeyMoment,
} from '../types';
import { clampStats } from '../domain/character';
import { shockPrice } from '../domain/stock';

export type EffectContext = {
  character: Character;
  cash: number;
  bank: BankAccount;
  holdings: Holding[];
  prices: Record<string, number>;
  job: Job | null;
  jobs: Job[];
  traits: string[];
  keyMoments: KeyMoment[];
  gotoScenarioId?: string;
};

export function applyChoice(
  ctx: EffectContext,
  choice: EventChoice,
  age: number,
): EffectContext {
  let next: EffectContext = { ...ctx, gotoScenarioId: undefined as string | undefined };
  for (const eff of choice.effects) {
    next = applyEffect(next, eff, age);
  }
  // ensure stats are clamped
  next = { ...next, character: clampStats(next.character) };
  return next;
}

function applyEffect(
  ctx: EffectContext,
  eff: EventEffect,
  age: number,
): EffectContext {
  switch (eff.kind) {
    case 'cash':
    case 'money':
      return { ...ctx, cash: Math.max(-50000000, ctx.cash + eff.delta) };
    case 'happiness':
      return {
        ...ctx,
        character: {
          ...ctx.character,
          happiness: ctx.character.happiness + eff.delta,
        },
      };
    case 'health':
      return {
        ...ctx,
        character: {
          ...ctx.character,
          health: ctx.character.health + eff.delta,
        },
      };
    case 'stress':
      return {
        ...ctx,
        character: {
          ...ctx.character,
          health: ctx.character.health - eff.delta,
        },
      };
    case 'wisdom':
    case 'intelligence':
      return {
        ...ctx,
        character: {
          ...ctx.character,
          wisdom: ctx.character.wisdom + eff.delta,
        },
      };
    case 'charisma':
    case 'independence':
      return {
        ...ctx,
        character: {
          ...ctx.character,
          charisma: ctx.character.charisma + eff.delta,
        },
      };
    case 'addTrait': {
      if (ctx.traits.includes(eff.trait)) return ctx;
      return { ...ctx, traits: [...ctx.traits, eff.trait] };
    }
    case 'stockShock': {
      const cur = ctx.prices[eff.ticker];
      if (cur == null) return ctx;
      return {
        ...ctx,
        prices: { ...ctx.prices, [eff.ticker]: shockPrice(cur, eff.multiplier) },
      };
    }
    case 'setJob': {
      const job = ctx.jobs.find((j) => j.id === eff.jobId) ?? null;
      return { ...ctx, job };
    }
    case 'gotoScenario':
      return { ...ctx, gotoScenarioId: eff.scenarioId };
    case 'keyMoment':
      return {
        ...ctx,
        keyMoments: [
          ...ctx.keyMoments,
          {
            age,
            importance: eff.importance,
            text: eff.text,
            tag: stageTagFromAge(age),
          },
        ],
      };
    case 'bankInterestChange':
      return {
        ...ctx,
        bank: {
          ...ctx.bank,
          // 시나리오 기반 base rate 변경. 누적 상한 30% 하드캡으로 폭주 방지.
          interestRate: Math.min(0.30, Math.max(0, ctx.bank.interestRate + eff.delta)),
        },
      };
  }
}

function stageTagFromAge(age: number): string {
  if (age < 20) return '유년기';
  if (age < 35) return '청년기';
  if (age < 55) return '중년기';
  if (age < 75) return '장년기';
  return '노년기';
}

// Keep key moments limited to top-N by importance
export function pruneKeyMoments(moments: KeyMoment[], limit: number): KeyMoment[] {
  if (moments.length <= limit) return moments;
  return [...moments].sort((a, b) => b.importance - a.importance).slice(0, limit);
}
