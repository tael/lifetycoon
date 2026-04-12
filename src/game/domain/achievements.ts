import type { Ending, Grade } from '../types';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  check: (ending: Ending, meta: AchievementMeta) => boolean;
};

export type AchievementMeta = {
  totalGamesPlayed: number;
  gradesEarned: Grade[];
  dailyChallengeCompleted: boolean;
};

export type UnlockedAchievement = {
  id: string;
  unlockedAt: string; // ISO
};

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_game',
    title: '첫 발걸음',
    description: '첫 번째 게임을 완료했어!',
    emoji: '👣',
    check: () => true,
  },
  {
    id: 'grade_s',
    title: '전설의 탄생',
    description: 'S등급을 달성했어!',
    emoji: '👑',
    check: (e) => e.grade === 'S',
  },
  {
    id: 'all_dreams',
    title: '꿈의 완성자',
    description: '모든 선택한 꿈을 달성했어!',
    emoji: '🌈',
    check: (e) => e.dreamsAchieved === e.totalDreams && e.totalDreams > 0,
  },
  {
    id: 'billionaire',
    title: '억만장자',
    description: '최종 자산 1억원 이상!',
    emoji: '🤑',
    check: (e) => e.finalAssets >= 100000000,
  },
  {
    id: 'happy_ending',
    title: '행복 만점',
    description: '최종 행복도 100!',
    emoji: '😊',
    check: (e) => e.finalHappiness >= 100,
  },
  {
    id: 'five_moments',
    title: '드라마틱 라이프',
    description: '핵심 인생 순간이 5개 이상!',
    emoji: '🎭',
    check: (e) => e.keyMomentsSelected.length >= 5,
  },
  {
    id: 'three_games',
    title: '인생 3회차',
    description: '게임을 3번 완료했어!',
    emoji: '🔄',
    check: (_e, m) => m.totalGamesPlayed >= 3,
  },
  {
    id: 'poor_but_happy',
    title: '가난하지만 행복',
    description: '자산 100만원 이하 + 행복도 80 이상',
    emoji: '🌻',
    check: (e) => e.finalAssets <= 1000000 && e.finalHappiness >= 80,
  },
  {
    id: 'all_grades',
    title: '인생 컬렉터',
    description: 'S, A, B, C, D, F 등급을 모두 달성!',
    emoji: '🎯',
    check: (_e, m) => {
      const has = new Set(m.gradesEarned);
      return has.has('S') && has.has('A') && has.has('B') && has.has('C') && has.has('D') && has.has('F');
    },
  },
  {
    id: 'rich_ending',
    title: '10억 부자',
    description: '최종 자산 10억원 이상!',
    emoji: '💎',
    check: (e) => e.finalAssets >= 1000000000,
  },
  {
    id: 'many_moments',
    title: '드라마 주인공',
    description: '핵심 인생 순간 10개 이상!',
    emoji: '🎬',
    check: (e) => e.keyMomentsSelected.length >= 8,
  },
  {
    id: 'speed_run',
    title: '스피드 러너',
    description: '5번 이상 플레이!',
    emoji: '⚡',
    check: (_e, m) => m.totalGamesPlayed >= 5,
  },
  {
    id: 'ten_games',
    title: '인생 10회차',
    description: '게임을 10번 완료!',
    emoji: '🔟',
    check: (_e, m) => m.totalGamesPlayed >= 10,
  },
  {
    id: 'balanced_life',
    title: '균형 잡힌 인생',
    description: '행복도 70+, 자산 5000만+, 꿈 2개+ 달성!',
    emoji: '⚖️',
    check: (e) => e.finalHappiness >= 70 && e.finalAssets >= 50000000 && e.dreamsAchieved >= 2,
  },
  {
    id: 'no_dreams',
    title: '꿈 없는 자유인',
    description: '꿈 0개 달성으로 C등급!',
    emoji: '🍃',
    check: (e) => e.dreamsAchieved === 0 && e.grade === 'C',
  },
  {
    id: 'real_estate_mogul',
    title: '부동산 제왕',
    description: '부동산을 2개 이상 보유한 채로 엔딩!',
    emoji: '🏘️',
    check: (e) => e.realEstateCount >= 2,
  },
  {
    id: 'debt_survivor',
    title: '빚 탈출',
    description: '대출을 받았다가 완납하고 엔딩!',
    emoji: '💪',
    check: (e) => e.hadLoanAndRepaid,
  },
  {
    id: 'insurance_master',
    title: '리스크 관리자',
    description: '건강보험 + 자산보험 모두 가입한 채로 엔딩!',
    emoji: '🛡️',
    check: (e) => e.bothInsurancesHeld,
  },
  {
    id: 'daily_champion',
    title: '일일 챌린지 완주',
    description: '일일 챌린지를 완료했어!',
    emoji: '🏅',
    check: (_e, m) => m.dailyChallengeCompleted,
  },
  {
    id: 'twenty_games',
    title: '인생 20회차',
    description: '게임을 20번 완료!',
    emoji: '🎯',
    check: (_e, m) => m.totalGamesPlayed >= 20,
  },
  {
    id: 'boom_rich',
    title: '호황기 부자',
    description: '호황기에 자산 1억원 달성!',
    emoji: '📈',
    check: (e) => e.boomTimeBillionaireReached,
  },
  {
    id: 'recession_survivor',
    title: '불황 생존자',
    description: '불황기에도 자산 1000만원 이상 유지!',
    emoji: '🛟',
    check: (e) => e.survivedRecessionWithAssets,
  },
  {
    id: 'stat_max',
    title: '완벽 능력자',
    description: '지혜·카리스마·건강·행복 모두 80 이상!',
    emoji: '🌟',
    check: (e) => e.finalWisdom >= 80 && e.finalCharisma >= 80 && e.finalHealth >= 80 && e.finalHappiness >= 80,
  },
  {
    id: 'chain_master',
    title: '체인 마스터',
    description: '특성을 10개 이상 획득!',
    emoji: '🔗',
    check: (e) => e.traitsCount >= 10,
  },
];

const STORAGE_KEY = 'lifetycoon-kids:achievements';
const META_KEY = 'lifetycoon-kids:achievement-meta';

/**
 * localStorage 쓰기 전용 안전 래퍼.
 * 모바일 저장소가 가득 차거나 시크릿 모드 등으로 throw하는 경우에도 앱이
 * 크래시되지 않도록 조용히 삼킨다(업적 누락은 다음 호출에서 자동 복구됨).
 */
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // no-op: 저장 실패는 사용자 피드백 없이 넘어간다. 업적 상태는 다음 세이브 시 재시도.
  }
}

export function loadUnlocked(): UnlockedAchievement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function loadMeta(): AchievementMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : { totalGamesPlayed: 0, gradesEarned: [], dailyChallengeCompleted: false };
  } catch {
    return { totalGamesPlayed: 0, gradesEarned: [], dailyChallengeCompleted: false };
  }
}

export function checkAndSaveAchievements(ending: Ending): {
  newlyUnlocked: Achievement[];
  allUnlocked: UnlockedAchievement[];
} {
  const meta = loadMeta();
  meta.totalGamesPlayed += 1;
  meta.gradesEarned.push(ending.grade);
  safeSetItem(META_KEY, JSON.stringify(meta));

  const existing = loadUnlocked();
  const existingIds = new Set(existing.map((u) => u.id));
  const newlyUnlocked: Achievement[] = [];

  for (const ach of ACHIEVEMENTS) {
    if (existingIds.has(ach.id)) continue;
    if (ach.check(ending, meta)) {
      newlyUnlocked.push(ach);
      existing.push({ id: ach.id, unlockedAt: new Date().toISOString() });
    }
  }

  safeSetItem(STORAGE_KEY, JSON.stringify(existing));
  return { newlyUnlocked, allUnlocked: existing };
}

export function getAllAchievements(): Achievement[] {
  return ACHIEVEMENTS;
}

export function getUnlockedCount(): number {
  return loadUnlocked().length;
}

export function getTotalCount(): number {
  return ACHIEVEMENTS.length;
}
