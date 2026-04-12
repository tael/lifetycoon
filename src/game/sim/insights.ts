// insights.ts — heuristic rules → string[] of Korean insight messages

import type { DashboardMetrics } from './aggregate.ts';

export function deriveInsights(metrics: DashboardMetrics): string[] {
  const insights: string[] = [];
  const g = metrics.gradeDistribution;
  const sRatio = g.S.ratio;
  const cRatio = g.C.ratio;
  const { bankruptcyRatio } = metrics.assetDistribution;
  const { meanAchieved } = metrics.dreamCompletion;
  const { stockHoldRatio, realEstateHoldRatio } = metrics.investmentHoldingRatios;
  const { hadLoanRatio } = metrics.loanUsage;
  const happinessP50 = metrics.finalStatDistributions.happiness.p50;

  const pct = (r: number) => (r * 100).toFixed(1);

  // Grade distribution insights
  if (sRatio > 0.4) {
    insights.push(`S 등급 비율 ${pct(sRatio)}% — 난이도 하향 여지`);
  }
  if (sRatio < 0.02) {
    insights.push(`S 등급 비율 ${pct(sRatio)}% — 난이도 상향 검토`);
  }
  if (cRatio > 0.5) {
    insights.push(`C 등급 과반수 ${pct(cRatio)}% — 밸런스 어려움`);
  }

  // Bankruptcy
  if (bankruptcyRatio > 0.1) {
    insights.push(`파산 런 ${pct(bankruptcyRatio)}% — 재무 시스템 가혹`);
  }

  // Dream insights
  for (const d of metrics.dreamCompletion.perDream) {
    if (d.ratio === 0) {
      insights.push(`꿈 '${d.id}' 달성률 0% — 트리거 재검토`);
    } else if (d.ratio > 0.95) {
      insights.push(`꿈 '${d.id}' 달성률 ${pct(d.ratio)}% — 조건 너무 쉬움`);
    }
  }
  if (meanAchieved < 1) {
    insights.push(`평균 꿈 달성 ${meanAchieved.toFixed(2)}개 — 목표 설정 재검토`);
  }

  // Investment insights
  if (stockHoldRatio < 0.2) {
    insights.push(`주식 보유 런 비율 ${pct(stockHoldRatio)}% — 투자 유인 부족`);
  }
  if (stockHoldRatio > 0.9 && realEstateHoldRatio < 0.2) {
    insights.push(`주식 편중 (${pct(stockHoldRatio)}%) — 부동산/채권 유인 부족`);
  }

  // Loan insights
  if (hadLoanRatio > 0.5) {
    insights.push(`대출 사용 ${pct(hadLoanRatio)}% — 레버리지 과다`);
  }

  // Stat insights
  if (happinessP50 < 40) {
    insights.push(`행복 중앙값 ${happinessP50.toFixed(1)} — 부정적 경험 편중`);
  }

  // Scenario diversity: top 5 fires vs total fires
  const globalCounts = metrics.scenarioTriggerFreq.globalCounts;
  const totalFires = Object.values(globalCounts).reduce((s, c) => s + c, 0);
  const top5Fires = metrics.scenarioTriggerFreq.top20
    .slice(0, 5)
    .reduce((s, e) => s + e.count, 0);
  if (totalFires > 0 && top5Fires / totalFires > 0.5) {
    const ratio = pct(top5Fires / totalFires);
    insights.push(`시나리오 다양성 부족 — 상위 5개가 ${ratio}% 차지`);
  }

  return insights;
}
