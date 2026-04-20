import type { Dream, Ending, Grade, KeyMoment } from '../types';
import { stageForAge } from '../types';
import { josa } from './josa';

function downgradeByLevel(grade: Grade, levels: number): Grade {
  const grades: Grade[] = ['S', 'A', 'B', 'C', 'D', 'F'];
  const currentIdx = grades.indexOf(grade);
  const newIdx = Math.min(currentIdx + levels, grades.length - 1);
  return grades[newIdx];
}

export function calculateGrade(
  achieved: number,
  total: number,
  crisisTurns?: number,
  finalAssets?: number,
): Grade {
  if (total === 0) return 'F';

  // 꿈 달성 점수 (0-60점): 4단계
  const r = achieved / total;
  const dreamScore = r >= 0.999 ? 60 : r >= 0.75 ? 45 : r >= 0.5 ? 30 : r >= 0.25 ? 15 : 0;

  // 자산 보너스 점수 (0-40점)
  const assets = finalAssets ?? 0;
  const assetScore =
    assets >= 10_000_000_000 ? 40  // 100억+
    : assets >= 5_000_000_000 ? 30 // 50억+
    : assets >= 2_000_000_000 ? 20 // 20억+
    : assets >= 500_000_000 ? 10   // 5억+
    : assets >= 100_000_000 ? 5    // 1억+
    : 0;

  const score = dreamScore + assetScore;

  let grade: Grade;
  if (score >= 80) grade = 'S';
  else if (score >= 55) grade = 'A';
  else if (score >= 25) grade = 'B';
  else if (score >= 15) grade = 'C';
  else if (score > 0 || achieved > 0) grade = 'D';
  else grade = 'F';

  // crisisTurns 하향 조정 유지
  const ct = crisisTurns ?? 0;
  if (ct > 20) grade = downgradeByLevel(grade, 2);
  else if (ct > 10) grade = downgradeByLevel(grade, 1);

  return grade;
}

/** 자산 관련 moment 여부 판단 (tag 또는 text 기반) */
function isAssetMoment(m: KeyMoment): boolean {
  const assetKeywords = ['자산', '돈', '부동산', '주식', '투자', '억', '만원', '저축', '재산'];
  const inTag = assetKeywords.some((kw) => m.tag.includes(kw));
  const inText = assetKeywords.some((kw) => m.text.includes(kw));
  return inTag || inText;
}

/** importance를 자산 여부로 조정한 값 반환 (원본 객체 불변) */
function effectiveImportance(m: KeyMoment): number {
  return isAssetMoment(m) ? m.importance - 0.3 : m.importance;
}

/**
 * "최고의 순간" 1개를 선정한다.
 * 꿈 달성, 직업 전환, 인생 이벤트(결혼/출산 등) 기반 moment를 우선하며
 * 자산 관련 moment의 importance를 0.1 감점 처리한다.
 * importance(보정 후) >= 0.8인 non-asset moment가 있으면 그 중 최고를,
 * 없으면 보정된 importance 기준 최고 moment를 반환한다.
 */
export function highlightMoment(moments: KeyMoment[]): KeyMoment | undefined {
  if (moments.length === 0) return undefined;
  const nonAssetHighImportance = moments.filter(
    (m) => !isAssetMoment(m) && m.importance >= 0.8,
  );
  const pool = nonAssetHighImportance.length > 0 ? nonAssetHighImportance : moments;
  return pool.reduce((best, m) =>
    effectiveImportance(m) > effectiveImportance(best) ? m : best,
  );
}

// Select key moments ensuring stage coverage (유년기/청년기/장년기 at least 1 each if available)
export function selectKeyMoments(
  keyMoments: KeyMoment[],
  maxCount: number,
): KeyMoment[] {
  // 자산 moment는 보정된 importance로 정렬
  const sorted = [...keyMoments].sort(
    (a, b) => effectiveImportance(b) - effectiveImportance(a),
  );
  const result: KeyMoment[] = [];
  const stagesTaken = new Set<string>();

  // Stage 1: ensure we have at least one per stage (top importance within each stage)
  // 노년기(75~100)도 포함해야 한다 — 100세까지 가는 게임에서 엔딩 요약에 노년기
  // 순간이 빠지는 누락 버그 수정. 각 단계에서 가장 중요한 moment를 먼저 픽.
  const requiredStages = ['유년기', '청년기', '중년기', '장년기', '노년기'];
  for (const stage of requiredStages) {
    const top = sorted.find(
      (m) => stageForAge(m.age) === stage && !result.includes(m),
    );
    if (top) {
      result.push(top);
      stagesTaken.add(stage);
    }
  }

  // Stage 2: fill remaining by importance
  for (const m of sorted) {
    if (result.length >= maxCount) break;
    if (!result.includes(m)) result.push(m);
  }

  // Stage 3: sort by age for narrative order
  return result.sort((a, b) => a.age - b.age).slice(0, maxCount);
}

/** 템플릿 문자열에서 {name}은(는)/{name}이(가)/{name}을(를) 패턴을 이름+올바른 조사로 치환 */
function applyNameJosa(template: string, name: string): string {
  return template
    .replace('{name}은(는)', name + josa(name, '은/는'))
    .replace('{name}이(가)', name + josa(name, '이/가'))
    .replace('{name}을(를)', name + josa(name, '을/를'))
    .replace('{name}과(와)', name + josa(name, '과/와'))
    .replace('{name}', name);
}

export function buildEpitaph(
  characterName: string,
  selected: KeyMoment[],
  grade: Grade,
  finalAssets: number,
  dreamsAchieved: Dream[],
  epitaphTemplates: { opening: string[]; closing: string[] },
  rng: () => number,
): string[] {
  const lines: string[] = [];
  const opening =
    epitaphTemplates.opening[
      Math.floor(rng() * epitaphTemplates.opening.length)
    ];
  lines.push(
    applyNameJosa(opening, characterName).replace('{grade}', gradeWord(grade)),
  );
  lines.push('');
  for (const m of selected) {
    lines.push(`• ${Math.floor(m.age)}세, ${m.text}`);
  }
  lines.push('');
  if (dreamsAchieved.length > 0) {
    lines.push(
      `이루어진 꿈: ${dreamsAchieved.map((d) => d.iconEmoji + ' ' + d.title).join(', ')}`,
    );
  } else {
    lines.push('꿈은 이루지 못했지만 경험은 남았다.');
  }
  const closing =
    epitaphTemplates.closing[
      Math.floor(rng() * epitaphTemplates.closing.length)
    ];
  lines.push('');
  lines.push(
    applyNameJosa(closing, characterName)
      .replace('{assets}', finalAssets.toLocaleString()),
  );
  return lines;
}

function gradeWord(g: Grade): string {
  switch (g) {
    case 'S':
      return '전설의';
    case 'A':
      return '멋진';
    case 'B':
      return '평범하지만 행복한';
    case 'C':
      return '조용하고 소박한';
    case 'D':
      return '힘겨웠지만 의미 있었던';
    case 'F':
      return '아무것도 이루지 못한';
  }
}

export type EndingExtras = {
  realEstateCount: number;
  hadLoanAndRepaid: boolean;
  boomTimeBillionaireReached: boolean;
  survivedRecessionWithAssets: boolean;
  finalWisdom: number;
  finalCharisma: number;
  finalHealth: number;
  traitsCount: number;
  totalChoicesMade: number;
  uniqueScenariosEncountered: number;
  crisisTurns: number;
};

export function buildEnding(
  characterName: string,
  dreams: Dream[],
  keyMoments: KeyMoment[],
  finalAssets: number,
  finalHappiness: number,
  epitaphTemplates: { opening: string[]; closing: string[] },
  rng: () => number,
  extras: EndingExtras,
): Ending {
  const achieved = dreams.filter((d) => d.achieved);
  const grade = calculateGrade(achieved.length, dreams.length, extras.crisisTurns, finalAssets);
  const selected = selectKeyMoments(keyMoments, 8);
  const epitaph = buildEpitaph(
    characterName,
    selected,
    grade,
    finalAssets,
    achieved,
    epitaphTemplates,
    rng,
  );
  return {
    grade,
    dreamsAchieved: achieved.length,
    totalDreams: dreams.length,
    finalAssets,
    finalHappiness,
    epitaph,
    keyMomentsSelected: selected,
    ...extras,
  };
}
