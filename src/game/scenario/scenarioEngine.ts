// Scenario engine: applies an event choice's effects to the game state.

import type {
  BankAccount,
  Character,
  EventChoice,
  EventEffect,
  Holding,
  Job,
  KeyMoment,
  RealEstate,
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
  // buyStock의 강제대출 fallback에서 maxLoan = totalAssets × 0.5 를 계산하는데
  // 부동산도 totalAssets에 포함되어야 하므로 ctx에 실어 보낸다. 기존 호출자의
  // 호환을 위해 선택적으로 두고, 없으면 빈 배열로 처리한다.
  realEstate?: RealEstate[];
  gotoScenarioId?: string;
  // 경고/안내 누적 버퍼 — applyChoice 이후 호출자가 토스트로 노출한다.
  // "잔고 부족으로 강제 대출 500,000원 받고 매수", "보유 부족으로 건너뜀" 등.
  warnings?: string[];
};

// 이벤트 buyStock의 강제대출 최소 단위 (10만원) — UI의 대출 버튼 단위와 일치.
const FORCED_LOAN_UNIT = 100_000;

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
      // 이벤트 선택지로 명시된 실제 주식 매수. 현재가로 비용을 계산한 뒤,
      // 잔고가 모자라면 **강제 대출**로 부족분을 메워서 반드시 매수를 성사시킨다
      // (정책: 텍스트가 "산다"면 무조건 산다. 게임 경제에는 이자 부담으로 반영).
      //
      // - 대출 단위: 10만원(UI 대출 버튼과 동일). 부족분을 이 단위로 올림하여 차입.
      // - 대출 한도: 총자산(cash + bank + stocks + realEstate) × 0.5 - 현 대출잔액.
      //   이 한도마저 부족하면 매수 자체가 불가능하므로 경고 후 노옵.
      const price = ctx.prices[eff.ticker];
      if (price == null || eff.shares <= 0) return ctx;
      const cost = Math.round(price * eff.shares);

      let workingCash = ctx.cash;
      let workingBank = ctx.bank;
      let forcedLoan = 0;
      if (cost > workingCash) {
        const shortfall = cost - workingCash;
        const loanAmount = Math.ceil(shortfall / FORCED_LOAN_UNIT) * FORCED_LOAN_UNIT;
        const stocksVal = ctx.holdings.reduce(
          (s, h) => s + (ctx.prices[h.ticker] ?? 0) * h.shares,
          0,
        );
        const realEstateVal = (ctx.realEstate ?? []).reduce((s, re) => s + re.currentValue, 0);
        const totalAssets = workingCash + workingBank.balance + stocksVal + realEstateVal;
        const maxLoan = Math.floor(totalAssets * 0.5);
        const remainingLimit = Math.max(0, maxLoan - workingBank.loanBalance);
        if (loanAmount > remainingLimit) {
          return {
            ...ctx,
            warnings: [
              ...(ctx.warnings ?? []),
              `잔고·대출 한도 부족으로 ${eff.ticker} ${eff.shares}주 매수를 건너뛰었어요.`,
            ],
          };
        }
        workingCash += loanAmount;
        workingBank = { ...workingBank, loanBalance: workingBank.loanBalance + loanAmount };
        forcedLoan = loanAmount;
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
        newHoldings = [
          ...ctx.holdings,
          { ticker: eff.ticker, shares: eff.shares, avgBuyPrice: price },
        ];
      }

      const newWarnings = forcedLoan > 0
        ? [
            ...(ctx.warnings ?? []),
            `잔고가 부족해서 ${formatForcedLoan(forcedLoan)}원을 대출받아 ${eff.ticker} ${eff.shares}주를 매수했어요.`,
          ]
        : ctx.warnings;

      return {
        ...ctx,
        cash: workingCash - cost,
        bank: workingBank,
        holdings: newHoldings,
        warnings: newWarnings,
      };
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

function formatForcedLoan(amount: number): string {
  // 토스트 안내용: "1,500,000" 같은 천단위 표기
  return amount.toLocaleString('ko-KR');
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
