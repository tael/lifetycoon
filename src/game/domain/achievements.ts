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
    description: 'S, A, B, C 등급을 모두 달성!',
    emoji: '🎯',
    check: (_e, m) => {
      const has = new Set(m.gradesEarned);
      return has.has('S') && has.has('A') && has.has('B') && has.has('C');
    },
  },
  {
    id: 'rich_ending',
    title: '10억 부자',
    description: '최종 자산 10억원 이상!',
    emoji: '💎',
    check: (e) => e.finalAssets >= 1000000000,
  },
];

const STORAGE_KEY = 'lifetycoon-kids:achievements';
const META_KEY = 'lifetycoon-kids:achievement-meta';

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
    return raw ? JSON.parse(raw) : { totalGamesPlayed: 0, gradesEarned: [] };
  } catch {
    return { totalGamesPlayed: 0, gradesEarned: [] };
  }
}

export function checkAndSaveAchievements(ending: Ending): {
  newlyUnlocked: Achievement[];
  allUnlocked: UnlockedAchievement[];
} {
  const meta = loadMeta();
  meta.totalGamesPlayed += 1;
  meta.gradesEarned.push(ending.grade);
  localStorage.setItem(META_KEY, JSON.stringify(meta));

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

  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
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
