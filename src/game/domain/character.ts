import type { Character } from '../types';

export function createCharacter(name: string, gender?: 'male' | 'female'): Character {
  return {
    name,
    age: 10,
    happiness: 70,
    health: 90,
    wisdom: 30,
    charisma: 40,
    traits: [],
    emoji: '😊',
    gender,
  };
}

export function clampStats(c: Character): Character {
  return {
    ...c,
    happiness: clamp(c.happiness, 0, 100),
    health: clamp(c.health, 0, 100),
    wisdom: clamp(c.wisdom, 0, 100),
    charisma: clamp(c.charisma, 0, 100),
  };
}

export function emojiFor(c: Character, totalAssets?: number): string {
  const age = Math.floor(c.age);
  const h = c.happiness;
  const traits = c.traits ?? [];
  const gender = c.gender ?? 'male';

  // 특성 기반 우선 이모지
  if ((totalAssets ?? 0) >= 50_000_000) return '🤑';
  if (traits.includes('의사')) return '🧑‍⚕️';
  if (traits.includes('과학자')) return '🧑‍🔬';
  if (traits.includes('유튜버') || traits.includes('인플루언서')) return '🎬';

  // 나이 × 행복도 × 성별 조합
  if (age < 14) {
    return gender === 'female'
      ? (h > 60 ? '👧' : h > 30 ? '😐' : '😢')
      : (h > 60 ? '👦' : h > 30 ? '😐' : '😢');
  }
  if (age < 20) {
    return gender === 'female'
      ? (h > 60 ? '😊' : h > 30 ? '🙂' : '😔')
      : (h > 60 ? '😊' : h > 30 ? '🙂' : '😕');
  }
  if (age < 35) {
    return gender === 'female'
      ? (h > 60 ? '😄' : h > 30 ? '😶' : '😩')
      : (h > 60 ? '😎' : h > 30 ? '😶' : '😩');
  }
  if (age < 55) {
    return gender === 'female'
      ? (h > 60 ? '🤩' : h > 30 ? '😌' : '😞')
      : (h > 60 ? '🤩' : h > 30 ? '😐' : '😞');
  }
  if (age < 75) {
    return gender === 'female'
      ? (h > 60 ? '😊' : h > 30 ? '🤔' : '😪')
      : (h > 60 ? '😊' : h > 30 ? '🤔' : '😪');
  }
  return gender === 'female'
    ? (h > 60 ? '🥰' : h > 30 ? '😌' : '😴')
    : (h > 60 ? '🥰' : h > 30 ? '😌' : '😴');
}

export function applyAge(c: Character, newAge: number): Character {
  return { ...c, age: newAge };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
