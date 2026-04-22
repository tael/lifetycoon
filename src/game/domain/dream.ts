import type {
  BankAccount,
  Character,
  Dream,
  DreamCondition,
  Holding,
  Job,
  RealEstate,
} from '../types';
import { holdingsValue } from './stock';

export function evaluateCondition(
  cond: DreamCondition,
  ctx: {
    character: Character;
    cash: number;
    bank: BankAccount;
    holdings: Holding[];
    prices: Record<string, number>;
    job: Job | null;
    realEstate: RealEstate[];
  },
): boolean {
  switch (cond.kind) {
    case 'cashGte':
      return ctx.cash >= cond.value;
    case 'stockOwnedShares': {
      const h = ctx.holdings.find((x) => x.ticker === cond.ticker);
      return !!h && h.shares >= cond.shares;
    }
    case 'jobHeld':
      return ctx.job?.id === cond.jobId;
    case 'ageReached':
      return ctx.character.age >= cond.value;
    case 'totalAssetsGte': {
      const realEstateVal = ctx.realEstate.reduce((s, re) => s + re.currentValue, 0);
      const total =
        ctx.cash + ctx.bank.balance + holdingsValue(ctx.holdings, ctx.prices) + realEstateVal;
      return total >= cond.value;
    }
    case 'happinessGte':
      return ctx.character.happiness >= cond.value;
    case 'wisdomGte':
      return ctx.character.wisdom >= cond.value;
    case 'charismaGte':
      return ctx.character.charisma >= cond.value;
    case 'hasTrait':
      return ctx.character.traits.includes(cond.trait);
    case 'hasTraitAny':
      return cond.traits.some((t) => ctx.character.traits.includes(t));
    case 'realEstateCountGte':
      return ctx.realEstate.length >= cond.value;
    case 'ageReachedAndHappinessGte':
      return ctx.character.age >= cond.age && ctx.character.happiness >= cond.happiness;
    case 'totalAssetsGteByAge': {
      if (ctx.character.age >= cond.byAge) return false;
      const realEstateVal = ctx.realEstate.reduce((s, re) => s + re.currentValue, 0);
      const total =
        ctx.cash + ctx.bank.balance + holdingsValue(ctx.holdings, ctx.prices) + realEstateVal;
      return total >= cond.value;
    }
  }
}

type EvalCtx = Parameters<typeof evaluateCondition>[1];

/** 꿈 달성 진행률 (0.0~1.0). 이미 달성이면 1. */
export function dreamProgressRatio(
  cond: DreamCondition,
  ctx: EvalCtx,
): number {
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const realEstateVal = ctx.realEstate.reduce((s, re) => s + re.currentValue, 0);
  const totalAssets = ctx.cash + ctx.bank.balance + holdingsValue(ctx.holdings, ctx.prices) + realEstateVal;

  switch (cond.kind) {
    case 'totalAssetsGte':
      return clamp01(totalAssets / cond.value);
    case 'totalAssetsGteByAge':
      if (ctx.character.age >= cond.byAge) return 0;
      return clamp01(totalAssets / cond.value);
    case 'cashGte':
      return clamp01(ctx.cash / cond.value);
    case 'happinessGte':
      return clamp01(ctx.character.happiness / cond.value);
    case 'wisdomGte':
      return clamp01(ctx.character.wisdom / cond.value);
    case 'charismaGte':
      return clamp01(ctx.character.charisma / cond.value);
    case 'ageReached':
      return clamp01(ctx.character.age / cond.value);
    case 'ageReachedAndHappinessGte':
      return clamp01((ctx.character.age / cond.age + ctx.character.happiness / cond.happiness) / 2);
    case 'stockOwnedShares': {
      const h = ctx.holdings.find((x) => x.ticker === cond.ticker);
      return clamp01((h?.shares ?? 0) / cond.shares);
    }
    case 'realEstateCountGte':
      return clamp01(ctx.realEstate.length / cond.value);
    case 'hasTrait':
      return ctx.character.traits.includes(cond.trait) ? 1 : 0;
    case 'hasTraitAny':
      return cond.traits.some((t) => ctx.character.traits.includes(t)) ? 1 : 0;
    case 'jobHeld':
      return ctx.job?.id === cond.jobId ? 1 : 0;
    default:
      return 0;
  }
}

export function checkAndMarkDreams(
  dreams: Dream[],
  age: number,
  checker: (d: Dream) => boolean,
): { dreams: Dream[]; newlyAchieved: Dream[] } {
  const newlyAchieved: Dream[] = [];
  const next = dreams.map((d) => {
    if (d.achieved) return d;
    if (checker(d)) {
      const updated = { ...d, achieved: true, achievedAtAge: age };
      newlyAchieved.push(updated);
      return updated;
    }
    return d;
  });
  return { dreams: next, newlyAchieved };
}
