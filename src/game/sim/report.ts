// report.ts — renders DashboardMetrics + insights into terminal/markdown/JSON

import type { DashboardMetrics } from './aggregate.ts';

export type ReportMeta = {
  totalRuns: number;
  baseSeed: number;
  elapsedMs: number;
  timestamp: string;
};

export function renderReport(
  metrics: DashboardMetrics,
  insights: string[],
  meta: ReportMeta,
): { terminal: string; markdown: string; rawJson: string } {
  return {
    terminal: renderTerminal(metrics, insights, meta),
    markdown: renderMarkdown(metrics, insights, meta),
    rawJson: JSON.stringify(metrics, null, 2),
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function pct(r: number): string {
  return (r * 100).toFixed(1) + '%';
}

function won(v: number): string {
  if (Math.abs(v) >= 1_0000_0000) return (v / 1_0000_0000).toFixed(1) + '억';
  if (Math.abs(v) >= 10_000) return Math.round(v / 10_000) + '만';
  return v.toLocaleString() + '원';
}

// ─── terminal output (compact) ───────────────────────────────────────────────

function renderTerminal(
  m: DashboardMetrics,
  insights: string[],
  meta: ReportMeta,
): string {
  const lines: string[] = [];
  const sep = '─'.repeat(60);

  lines.push(sep);
  lines.push('인생타이쿤 밸런스 시뮬레이션 결과');
  lines.push(sep);
  lines.push(`실행: ${meta.totalRuns}회  시드: ${meta.baseSeed}  소요: ${(meta.elapsedMs / 1000).toFixed(1)}s`);
  if (m.erroredRuns > 0) lines.push(`오류 런: ${m.erroredRuns}회`);
  lines.push('');

  // Grade distribution
  const g = m.gradeDistribution;
  lines.push('[ 등급 분포 ]');
  lines.push(`  S: ${g.S.count}회 (${pct(g.S.ratio)})  A: ${g.A.count}회 (${pct(g.A.ratio)})  B: ${g.B.count}회 (${pct(g.B.ratio)})  C: ${g.C.count}회 (${pct(g.C.ratio)})`);
  lines.push('');

  // Asset distribution
  const a = m.assetDistribution;
  lines.push('[ 최종 자산 분포 ]');
  lines.push(`  중앙값: ${won(a.p50)}  p90: ${won(a.p90)}  파산: ${pct(a.bankruptcyRatio)}`);
  lines.push('');

  // Dream completion
  lines.push('[ 꿈 달성 ]');
  lines.push(`  평균 달성: ${m.dreamCompletion.meanAchieved.toFixed(2)}개`);
  lines.push('');

  // Top insights
  if (insights.length > 0) {
    lines.push('[ 주요 인사이트 ]');
    for (const ins of insights.slice(0, 5)) {
      lines.push(`  * ${ins}`);
    }
  }

  lines.push(sep);
  return lines.join('\n');
}

// ─── markdown output (full report) ──────────────────────────────────────────

function renderMarkdown(
  m: DashboardMetrics,
  insights: string[],
  meta: ReportMeta,
): string {
  const lines: string[] = [];

  lines.push('# 인생타이쿤 밸런스 시뮬레이션 리포트');
  lines.push('');
  lines.push(`- 실행 일시: ${meta.timestamp}`);
  lines.push(`- 총 실행 횟수: ${meta.totalRuns}회`);
  lines.push(`- 기본 시드: ${meta.baseSeed}`);
  lines.push(`- 소요 시간: ${(meta.elapsedMs / 1000).toFixed(1)}초`);
  if (m.erroredRuns > 0) lines.push(`- 오류 런: ${m.erroredRuns}회`);
  lines.push('');

  // (a) 등급 분포
  lines.push('## (a) 등급 분포');
  lines.push('');
  lines.push('| 등급 | 횟수 | 비율 |');
  lines.push('|------|------|------|');
  for (const grade of ['S', 'A', 'B', 'C', 'unknown'] as const) {
    const g = m.gradeDistribution[grade];
    lines.push(`| ${grade} | ${g.count} | ${pct(g.ratio)} |`);
  }
  lines.push('');

  // (b) 최종 자산 분포
  const a = m.assetDistribution;
  lines.push('## (b) 최종 자산 분포');
  lines.push('');
  lines.push('| 지표 | 값 |');
  lines.push('|------|----|');
  lines.push(`| 평균 | ${won(a.mean)} |`);
  lines.push(`| 중앙값 (p50) | ${won(a.p50)} |`);
  lines.push(`| p10 | ${won(a.p10)} |`);
  lines.push(`| p90 | ${won(a.p90)} |`);
  lines.push(`| p99 | ${won(a.p99)} |`);
  lines.push(`| 파산 비율 | ${pct(a.bankruptcyRatio)} |`);
  lines.push(`| 상위 1% 기준 | ${won(a.p99)} |`);
  lines.push('');

  // (c) 꿈 달성률
  lines.push('## (c) 꿈 달성률');
  lines.push('');
  lines.push(`평균 달성 개수: **${m.dreamCompletion.meanAchieved.toFixed(2)}개**`);
  lines.push('');
  lines.push('| 꿈 ID | 달성 횟수 | 달성률 |');
  lines.push('|-------|-----------|--------|');
  for (const d of m.dreamCompletion.perDream) {
    lines.push(`| ${d.id} | ${d.count} | ${pct(d.ratio)} |`);
  }
  if (m.dreamCompletion.outliers.length > 0) {
    lines.push('');
    lines.push('### 이상치 꿈');
    lines.push('');
    lines.push('| 꿈 ID | 달성률 | 유형 |');
    lines.push('|-------|--------|------|');
    for (const o of m.dreamCompletion.outliers) {
      lines.push(`| ${o.id} | ${pct(o.ratio)} | ${o.kind === 'never' ? '달성 불가' : '항상 달성'} |`);
    }
  }
  lines.push('');

  // (f) 시나리오 트리거 빈도
  lines.push('## (f) 시나리오 트리거 빈도');
  lines.push('');
  lines.push('### 상위 20개');
  lines.push('');
  lines.push('| 시나리오 ID | 총 트리거 횟수 |');
  lines.push('|-------------|----------------|');
  for (const s of m.scenarioTriggerFreq.top20) {
    lines.push(`| ${s.id} | ${s.count} |`);
  }
  lines.push('');
  lines.push('### 하위 20개 (>0)');
  lines.push('');
  lines.push('| 시나리오 ID | 총 트리거 횟수 |');
  lines.push('|-------------|----------------|');
  for (const s of m.scenarioTriggerFreq.bottom20) {
    lines.push(`| ${s.id} | ${s.count} |`);
  }
  lines.push('');

  // Final stat distributions
  lines.push('## 최종 스탯 분포');
  lines.push('');
  lines.push('| 스탯 | 평균 | p10 | p50 | p90 |');
  lines.push('|------|------|-----|-----|-----|');
  const statEntries: [string, keyof typeof m.finalStatDistributions][] = [
    ['행복', 'happiness'],
    ['건강', 'health'],
    ['지혜', 'wisdom'],
    ['매력', 'charisma'],
  ];
  for (const [label, key] of statEntries) {
    const d = m.finalStatDistributions[key];
    lines.push(`| ${label} | ${d.mean.toFixed(1)} | ${d.p10.toFixed(1)} | ${d.p50.toFixed(1)} | ${d.p90.toFixed(1)} |`);
  }
  lines.push('');

  // Asset history by decade
  lines.push('## 연령대별 자산 궤적 (10년 단위)');
  lines.push('');
  lines.push('| 나이 | 평균 자산 | p10 | p90 |');
  lines.push('|------|-----------|-----|-----|');
  for (const d of m.assetHistorySummary.perDecade) {
    lines.push(`| ${d.age}세 | ${won(d.mean)} | ${won(d.p10)} | ${won(d.p90)} |`);
  }
  lines.push('');

  // Investment holdings
  lines.push('## 투자자산 보유 비율');
  lines.push('');
  lines.push('| 자산군 | 보유 런 비율 |');
  lines.push('|--------|-------------|');
  const ir = m.investmentHoldingRatios;
  lines.push(`| 주식 | ${pct(ir.stockHoldRatio)} |`);
  lines.push(`| 부동산 | ${pct(ir.realEstateHoldRatio)} |`);
  lines.push(`| 채권 | ${pct(ir.bondHoldRatio)} |`);
  lines.push('');

  // Loan usage
  lines.push('## 대출 활용');
  lines.push('');
  const lu = m.loanUsage;
  lines.push(`- 대출 사용 런 비율: ${pct(lu.hadLoanRatio)}`);
  lines.push(`- 완전 상환 비율 (대출 사용 런 중): ${pct(lu.fullyRepaidRatio)}`);
  lines.push('');

  // Insurance
  lines.push('## 보험 가입');
  lines.push('');
  const ins = m.insuranceEnrollment;
  lines.push(`- 건강보험 가입 비율: ${pct(ins.healthRatio)}`);
  lines.push(`- 생명보험 가입 비율: ${pct(ins.lifeRatio)}`);
  lines.push('');

  // Traits
  lines.push('## 특성 (Traits) 요약');
  lines.push('');
  lines.push(`평균 특성 수: ${m.traitsSummary.meanTraitCount.toFixed(1)}개`);
  lines.push('');
  if (m.traitsSummary.top20.length > 0) {
    lines.push('### 상위 20개 특성');
    lines.push('');
    lines.push('| 특성 | 획득 런 수 | 비율 |');
    lines.push('|------|-----------|------|');
    for (const t of m.traitsSummary.top20) {
      lines.push(`| ${t.trait} | ${t.count} | ${pct(t.ratio)} |`);
    }
  }
  lines.push('');

  // Auto insights
  lines.push('## 자동 인사이트');
  lines.push('');
  if (insights.length === 0) {
    lines.push('특이 패턴 없음.');
  } else {
    for (const ins of insights) {
      lines.push(`- ${ins}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}
