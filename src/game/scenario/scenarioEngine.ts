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
  // 경고 누적 버퍼 — applyChoice 이후 호출자가 토스트로 노출한다.
  // 이벤트 효과(예: buyStock 잔고부족)가 텍스트 기대치와 달라질 때 사용.
  warnings?: string[];
};

export function applyChoice(
  ctx: EffectContext,
  choice: EventChoice,
  age: number,
): EffectContext {
  let next: EffectContext = {
    ...ctx,
    gotoScenarioId: undefined as string | undefined,
    warnings: [],
  };
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
    case 'buyStock': {
      // 이벤트 선택지로 명시된 실제 주식 매수. 현재가 기준으로 비용을 계산하고
      // 잔고 부족이면 경고를 남기고 노옵으로 처리한다(텍스트-행동 일치를 보장하되
      // 게임 오버 방지). 부분 매수는 의도적으로 하지 않는다 — "20주 매수"가 18주가
      // 되는 쪽이 더 혼란스럽기 때문.
      const price = ctx.prices[eff.ticker];
      if (price == null || eff.shares <= 0) return ctx;
      const cost = Math.round(price * eff.shares);
      if (cost > ctx.cash) {
        return {
          ...ctx,
          warnings: [
            ...(ctx.warnings ?? []),
            `잔고가 부족해서 ${eff.ticker} ${eff.shares}주 매수를 건너뛰었어요.`,
          ],
        };
      }
      const existing = ctx.holdings.find((h) => h.ticker === eff.ticker);
      let newHoldings: Holding[];
      if (existing) {
        const total = existing.shares + eff.shares;
        const avg = Math.round(
          (existing.avgBuyPrice * existing.shares + price * eff.shares) / total,
        );
        newHoldings = ctx.holdings.map((h) =>
          h.ticker === eff.ticker ? { ticker: eff.ticker, shares: total, avgBuyPrice: avg } : h,
        );
      } else {
        newHoldings = [...ctx.holdings, { ticker: eff.ticker, shares: eff.shares, avgBuyPrice: price }];
      }
      return { ...ctx, cash: ctx.cash - cost, holdings: newHoldings };
    }
    case 'sellStock': {
      // 이벤트 선택지로 명시된 실제 주식 매도. 보유 주식이 부족하면 경고를 남기고
      // 노옵 — "패닉셀"인데 보유 주식이 없으면 돈이 증발하는 과거 버그를 막는다.
      const price = ctx.prices[eff.ticker];
      if (price == null || eff.shares <= 0) return ctx;
      const existing = ctx.holdings.find((h) => h.ticker === eff.ticker);
      if (!existing || existing.shares < eff.shares) {
        return {
          ...ctx,
          warnings: [
            ...(ctx.warnings ?? []),
            `${eff.ticker} 보유량이 부족해서 ${eff.shares}주 매도를 건너뛰었어요.`,
          ],
        };
      }
      const proceeds = Math.round(price * eff.shares);
      const remaining = existing.shares - eff.shares;
      const newHoldings: Holding[] = remaining === 0
        ? ctx.holdings.filter((h) => h.ticker !== eff.ticker)
        : ctx.holdings.map((h) =>
            h.ticker === eff.ticker ? { ...h, shares: remaining } : h,
          );
      return { ...ctx, cash: ctx.cash + proceeds, holdings: newHoldings };
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
