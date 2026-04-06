import type {
  BankAccount,
  Character,
  Dream,
  DreamCondition,
  Holding,
  Job,
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
