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
      const total =
        ctx.cash + ctx.bank.balance + holdingsValue(ctx.holdings, ctx.prices);
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
      const total =
        ctx.cash + ctx.bank.balance + holdingsValue(ctx.holdings, ctx.prices);
      return total >= cond.value;
    }
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
