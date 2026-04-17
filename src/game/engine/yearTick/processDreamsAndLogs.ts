import type { Phase, ScenarioEvent } from '../../types';
import type { YearTickState, YearTickContext, AgeAndDecayResult, MonthlyLoopResult, AnnualSettlementResult, CrisisResult, LogResult } from './types';
import { stageForAge } from '../../types';
import { emojiFor } from '../../domain/character';
import { checkAndMarkDreams, evaluateCondition } from '../../domain/dream';
import { pruneKeyMoments } from '../../scenario/scenarioEngine';
import { seasonFromYearIndex, SEASON_KO, SEASON_EMOJI } from '../season';
import {
  pickEligibleEvent,
  eventChancePerYear,
  type DispatchContext,
} from '../eventDispatcher';

const KEY_MOMENT_LIMIT = 30;
const RECENT_LOG_LIMIT = 100;

export function processDreamsAndLogs(
  st: YearTickState,
  intAge: number,
  deltaYears: number,
  ageResult: AgeAndDecayResult,
  monthlyResult: MonthlyLoopResult,
  annualResult: AnnualSettlementResult,
  crisisResult: CrisisResult,
  ctx: YearTickContext,
): LogResult {
  const { economyCycle, cycleChanged } = ageResult;

  // Dream check
  const { dreams, newlyAchieved } = checkAndMarkDreams(
    st.dreams,
    intAge,
    (d) =>
      evaluateCondition(d.targetCondition, {
        character: crisisResult.character,
        cash: crisisResult.finalCash,
        bank: crisisResult.bank,
        holdings: crisisResult.holdings,
        prices: annualResult.prices,
        job: ageResult.job,
        realEstate: crisisResult.realEstate,
      }),
  );

  // Key moments from newly achieved dreams
  let keyMoments = [...st.keyMoments];
  for (const d of newlyAchieved) {
    keyMoments.push({
      age: intAge,
      importance: 0.85,
      text: d.rewardKeyMoment,
      tag: stageForAge(intAge),
    });
  }
  keyMoments = pruneKeyMoments(keyMoments, KEY_MOMENT_LIMIT);

  // Emoji update
  const stocksVal = crisisResult.holdings.reduce((s, h) => s + (annualResult.prices[h.ticker] ?? 0) * h.shares, 0);
  const bondsValForEmoji = annualResult.bonds.reduce((s, b) => s + (b.matured ? 0 : b.faceValue), 0);
  const totalAssetsForEmoji =
    crisisResult.finalCash + crisisResult.bank.balance + stocksVal +
    crisisResult.realEstate.reduce((s, re) => s + re.currentValue, 0) +
    bondsValForEmoji;
  const emoji = emojiFor({ ...crisisResult.character, happiness: crisisResult.character.happiness }, totalAssetsForEmoji);

  // Emit event possibility check
  const dispatchCtx: DispatchContext = {
    age: intAge,
    cash: crisisResult.finalCash,
    job: ageResult.job ? { id: ageResult.job.id } : null,
    traits: st.traits,
    usedScenarioIds: new Set(st.usedScenarioIds),
  };
  const specificFiredFirst = ctx.scenarios.some((ev: ScenarioEvent) =>
    ev.triggers.some((t) => t.kind === 'specificAge' && t.age === intAge),
  );
  const roll = ctx.streams.event();
  const fireChance =
    specificFiredFirst ? 1 : eventChancePerYear() * deltaYears;
  let phase: Phase = st.phase;
  if (roll < fireChance) {
    const picked = pickEligibleEvent(
      ctx.scenarios,
      dispatchCtx,
      ctx.streams.event,
      specificFiredFirst,
    );
    if (picked && picked.pausesGame) {
      const triggeredEvent = {
        scenarioId: picked.id,
        triggeredAtAge: intAge,
        title: picked.title,
        text: picked.text,
        choices: picked.choices,
        category: picked.category,
      };
      phase = { kind: 'paused', event: triggeredEvent };
    }
  }

  // Recent log update
  const cycleLogEntry = cycleChanged
    ? [{
        age: intAge,
        text: economyCycle.phase === 'boom'
          ? `📢 경제 호황기 시작! 주가 상승세 기대`
          : economyCycle.phase === 'recession'
            ? `📢 경기 침체 시작. 주가 하락 주의`
            : `📢 경기가 안정세로 접어들었습니다`,
        timestamp: Date.now(),
      }]
    : [];
  const taxLogEntry = (intAge % 5 === 0 && annualResult.totalTax > 0)
    ? [{
        age: intAge,
        text: `🧾 ${intAge}세 세금: 소득세 ${Math.round(annualResult.incomeTax / 10000)}만원 + 재산세 ${Math.round(annualResult.propertyTax / 10000)}만원 = 합계 ${Math.round(annualResult.totalTax / 10000)}만원 납부`,
        timestamp: Date.now(),
      }]
    : [];

  // Season update
  const newSeason = seasonFromYearIndex(intAge - 10);
  const seasonChanged = newSeason !== st.currentSeason;
  const seasonLogEntry = seasonChanged
    ? [{
        age: intAge,
        text: `${SEASON_EMOJI[newSeason]} ${SEASON_KO[newSeason]}이 찾아왔어요!`,
        timestamp: Date.now(),
      }]
    : [];

  const recentLog = [
    ...st.recentLog,
    ...cycleLogEntry,
    ...taxLogEntry,
    ...seasonLogEntry,
    ...monthlyResult.overdraftLog,
    ...crisisResult.forcedSaleLog,
    ...crisisResult.govLoanLog,
    {
      age: intAge,
      text: `${intAge}세: 자산 ${Math.round((crisisResult.finalCash + crisisResult.bank.balance) / 10000)}만원`,
      timestamp: Date.now(),
    },
  ].slice(-RECENT_LOG_LIMIT);

  // Track asset history every 5 years
  const totalNow = crisisResult.finalCash + crisisResult.bank.balance + stocksVal;
  const assetHistory = intAge % 5 === 0
    ? [...st.assetHistory, { age: intAge, value: totalNow }]
    : st.assetHistory;

  // Track cashflow history
  const totalExpensesForCrisis = annualResult.totalTax + monthlyResult.academyExpense + monthlyResult.costOfLivingExpense + monthlyResult.upkeepExpense + monthlyResult.repaymentExpense;
  const netMonthlyNow = Math.round((monthlyResult.grossPeriodIncome - totalExpensesForCrisis) / 12);
  const cashflowHistory = [...st.cashflowHistory, { age: intAge, netMonthly: netMonthlyNow }].slice(-90);

  // boom/recession 업적 체크
  const stocksValNow = crisisResult.holdings.reduce((s, h) => s + (annualResult.prices[h.ticker] ?? 0) * h.shares, 0);
  const totalAssetsNow = crisisResult.finalCash + crisisResult.bank.balance + stocksValNow + crisisResult.realEstate.reduce((s, re) => s + re.currentValue, 0);
  const newBoomReached = st.boomTimeBillionaireReached || (economyCycle.phase === 'boom' && totalAssetsNow >= 100000000);
  const newSurvivedRecession = st.survivedRecessionWithAssets || (economyCycle.phase === 'recession' && totalAssetsNow >= 10000000);

  // splitNotices
  const splitNotices = annualResult.splitEvents.length > 0
    ? annualResult.splitEvents.map((ev) => `📈 ${ev.name} ${ev.ratio}:1 액면분할! 주식 수 ${ev.ratio}배, 가격 1/${ev.ratio}로 조정됩니다.`)
    : [];

  return {
    dreams,
    keyMoments,
    recentLog,
    assetHistory,
    cashflowHistory,
    currentSeason: newSeason,
    phase,
    boomTimeBillionaireReached: newBoomReached,
    survivedRecessionWithAssets: newSurvivedRecession,
    splitNotices,
    emoji,
  };
}
