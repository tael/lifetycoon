import type { Dream, Ending, Grade, KeyMoment } from '../types';
import { stageForAge } from '../types';

export function calculateGrade(achieved: number, total: number): Grade {
  if (total === 0) return 'C';
  const r = achieved / total;
  if (r >= 0.999) return 'S';
  if (r >= 0.66) return 'A';
  if (r >= 0.33) return 'B';
  return 'C';
}

// Select key moments ensuring stage coverage (유년기/청년기/장년기 at least 1 each if available)
export function selectKeyMoments(
  keyMoments: KeyMoment[],
  maxCount: number,
): KeyMoment[] {
  const sorted = [...keyMoments].sort((a, b) => b.importance - a.importance);
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
    opening.replace('{name}', characterName).replace('{grade}', gradeWord(grade)),
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
    closing
      .replace('{name}', characterName)
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
  }
}

export type EndingExtras = {
  realEstateCount: number;
  hadLoanAndRepaid: boolean;
  bothInsurancesHeld: boolean;
  boomTimeBillionaireReached: boolean;
  survivedRecessionWithAssets: boolean;
  finalWisdom: number;
  finalCharisma: number;
  finalHealth: number;
  traitsCount: number;
  totalChoicesMade: number;
  uniqueScenariosEncountered: number;
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
  const grade = calculateGrade(achieved.length, dreams.length);
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
