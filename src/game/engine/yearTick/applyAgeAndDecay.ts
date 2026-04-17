import type { Job } from '../../types';
import type { YearTickState, YearTickContext, AgeAndDecayResult } from './types';
import { computeStatPenalty, costOfLivingMultiplier } from '../../domain/character';
import { computeCostOfLiving } from '../../domain/costOfLiving';
import { ageSalaryMultiplier } from '../../domain/salaryCurve';
import {
  stepEconomyCycle,
  PHASE_DRIFT_BONUS,
} from '../economyCycle';
import {
  AGE_THRESHOLD_SENIOR,
  AGE_THRESHOLD_MIDDLE,
  HAPPY_DECAY_SENIOR,
  HAPPY_DECAY_MIDDLE,
  HAPPY_DECAY_YOUNG,
  HEALTH_DECAY_SENIOR,
  HEALTH_DECAY_MIDDLE,
  HEALTH_DECAY_YOUNG,
} from '../../constants';

export function applyAgeAndDecay(
  st: YearTickState,
  intAge: number,
  deltaYears: number,
  ctx: YearTickContext,
): AgeAndDecayResult {
  const toasts: AgeAndDecayResult['toasts'] = [];

  // ── Feature: 성인 학생 최대 10년 → 강제 직업 변경 ──
  const educationEndAge = st.educationEndAge ?? 19;
  let job = st.job;
  let lastJobChangeAge = st.lastJobChangeAge;
  if (job?.id === 'student' && intAge >= educationEndAge + 10) {
    const parttime = ctx.jobs.find((j: Job) => j.id === 'parttime');
    if (parttime) {
      job = parttime;
      lastJobChangeAge = intAge;
      toasts.push({ message: '학업 기간이 끝났습니다. 아르바이트를 시작합니다.', icon: '🏪', type: 'info', duration: 3000 });
    }
  }

  // ── Feature: 생활비 비율 → 스탯 감소 배수 계산 ──
  const jobId = job?.id;
  const baseSalaryYearly = job ? Math.round(job.salary * ageSalaryMultiplier(intAge, job.id) * 12) : 0;
  const expectedCostOfLiving = computeCostOfLiving(intAge, baseSalaryYearly, jobId);
  const lastCf = st.cashflowHistory.length > 0 ? st.cashflowHistory[st.cashflowHistory.length - 1] : null;
  const cfRatio = lastCf && lastCf.netMonthly < 0 && expectedCostOfLiving > 0
    ? Math.max(0.1, 1 + (lastCf.netMonthly * 12) / expectedCostOfLiving)
    : 1;
  const colMult = costOfLivingMultiplier(cfRatio);

  // 1) Age up + natural stat decay
  const happyDecay = (intAge > AGE_THRESHOLD_SENIOR ? HAPPY_DECAY_SENIOR : intAge > AGE_THRESHOLD_MIDDLE ? HAPPY_DECAY_MIDDLE : HAPPY_DECAY_YOUNG) * colMult.decayMult;
  const healthDecay = (intAge > AGE_THRESHOLD_SENIOR ? HEALTH_DECAY_SENIOR : intAge > AGE_THRESHOLD_MIDDLE ? HEALTH_DECAY_MIDDLE : HEALTH_DECAY_YOUNG) * colMult.decayMult;
  const character = {
    ...st.character,
    age: intAge,
    happiness: Math.max(10, st.character.happiness - happyDecay * deltaYears),
    health: Math.max(10, st.character.health - healthDecay * deltaYears),
  };

  // 2) Economy cycle step
  const { cycle: economyCycle, changed: cycleChanged } = stepEconomyCycle(
    st.economyCycle,
    deltaYears,
    ctx.streams.misc,
  );
  const driftBonus = PHASE_DRIFT_BONUS[economyCycle.phase];

  // 경기사이클 전환 시 예금 base rate 조정
  const newBaseInterestRate = cycleChanged
    ? (() => {
        const rateAdj = economyCycle.phase === 'boom' ? 0.005
          : economyCycle.phase === 'recession' ? -0.005
          : 0;
        return Math.min(0.15, Math.max(0.01, st.bank.interestRate + rateAdj));
      })()
    : st.bank.interestRate;

  const statPenalty = computeStatPenalty(character);

  return {
    character,
    job,
    lastJobChangeAge,
    colMult,
    cfRatio,
    economyCycle,
    cycleChanged,
    driftBonus,
    newBaseInterestRate,
    statPenalty: { salaryMult: statPenalty.salaryMult, returnMult: statPenalty.returnMult },
    toasts,
  };
}
