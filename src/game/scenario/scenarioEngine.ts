// Scenario engine: applies an event choice's effects to the game state.

import type {
  BankAccount,
  Bond,
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
  // 부동산/채권도 totalAssets에 포함되어야 하므로 ctx에 실어 보낸다. 기존 호출자의
  // 호환을 위해 선택적으로 두고, 없으면 빈 배열로 처리한다.
  realEstate?: RealEstate[];
  bonds?: Bond[];
  gotoScenarioId?: string;
  // 경고/안내 누적 버퍼 — applyChoice 이후 호출자가 토스트로 노출한다.
  // "잔고 부족으로 강제 대출 500,000원 받고 매수", "보유 부족으로 건너뜀" 등.
  warnings?: string[];
};

// 이벤트 buyStock의 강제대출 최소 단위 (10만원) — UI의 대출 버튼 단위와 일치.
const FORCED_LOAN_UNIT = 100_000;

// cash 필드의 하한선. 현금은 음수 상태를 허용하지만 "파산 수렁"으로 무제한
// 내려가지 않도록 -5,000만원에서 막는다. 이 한도를 넘는 손실은 effect가 조용히
// 절단돼서 플레이어가 영영 회복 불가능한 상태에 빠지는 걸 방지한다.
const CASH_FLOOR = -50_000_000;

// 캐릭터의 수치형 스탯 필드 4종. applyEffect에서 반복되는 업데이트 패턴을
// 하나로 모아 단순화하기 위한 좁은 타입.
type NumericStatKey = 'happiness' | 'health' | 'wisdom' | 'charisma';

function updateCharacterStat(
  ctx: EffectContext,
  key: NumericStatKey,
  delta: number,
): EffectContext {
  return {
    ...ctx,
    character: {
      ...ctx.character,
      [key]: ctx.character[key] + delta,
    },
  };
}

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
      return { ...ctx, cash: Math.max(CASH_FLOOR, ctx.cash + eff.delta) };
    case 'happiness':
      return updateCharacterStat(ctx, 'happiness', eff.delta);
    case 'health':
      return updateCharacterStat(ctx, 'health', eff.delta);
    case 'stress':
      // stress += X 는 health -= X 로 해석한다 (주석 원본 유지).
      return updateCharacterStat(ctx, 'health', -eff.delta);
    case 'wisdom':
    case 'intelligence':
      return updateCharacterStat(ctx, 'wisdom', eff.delta);
    case 'charisma':
    case 'independence':
      return updateCharacterStat(ctx, 'charisma', eff.delta);
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
        const bondsVal = (ctx.bonds ?? []).reduce((s, b) => s + (b.matured ? 0 : b.faceValue), 0);
        const totalAssets = workingCash + workingBank.balance + stocksVal + realEstateVal + bondsVal;
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
            `⚠️ 잔고가 부족해 ${formatForcedLoan(forcedLoan)}원을 대출받아 ${eff.ticker} ${eff.shares}주를 매수했습니다. 이자 부담이 시작됩니다.`,
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
    case 'halveWealth': {
      // 전설 시나리오 "회상의 댓가" 전용: 현재 "세계 전체를 절반으로 되돌린다".
      // 현금·예금·주식보유수·부동산가치에 더해 대출 잔액까지 절반으로 줄인다.
      // 초기 구현은 대출을 유지했으나 LTV 50% 이상 플레이어가 순자산 음수 트랩에
      // 빠지는 버그가 있어 v0.2.0 리뷰에서 바로잡았다 (등가교환 원칙 강화).
      // 채권은 EffectContext에 포함되지 않아 이번 범위 밖. 별도 사이클에서 고려.
      const halvedHoldings: Holding[] = ctx.holdings
        .map((h) => ({ ...h, shares: Math.floor(h.shares / 2) }))
        .filter((h) => h.shares > 0);
      const halvedRealEstate: RealEstate[] = (ctx.realEstate ?? []).map((re) => ({
        ...re,
        currentValue: Math.floor(re.currentValue / 2),
      }));
      return {
        ...ctx,
        cash: Math.floor(ctx.cash / 2),
        bank: {
          ...ctx.bank,
          balance: Math.floor(ctx.bank.balance / 2),
          loanBalance: Math.floor(ctx.bank.loanBalance / 2),
        },
        holdings: halvedHoldings,
        realEstate: halvedRealEstate,
      };
    }
    default: {
      // Exhaustiveness guard — 새 EventEffect kind가 추가될 때 이 줄에서 타입
      // 에러가 나도록 해서 누락된 케이스를 빌드 타임에 잡는다.
      // void 로 쓰지 않으면 noUnusedLocals 룰에 걸린다.
      void (eff satisfies never);
      return ctx;
    }
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
