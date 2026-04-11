import type { Character } from '../types';

export type StatPenalty = {
  salaryMult: number;    // 월급 곱연산 계수 (1.0 = 정상, 0.85 = -15%)
  returnMult: number;    // 투자 수익률 차감 가산 (0 = 정상, -0.02 = -2%p)
  careEffMult: number;   // 케어 버튼 효과 계수 (1.0 = 정상, 0.75 = -25%)
  charmMult: number;     // NPC/매력 상호작용 보너스 계수
  reasons: string[];     // 사용자 대면 설명 목록 ("지혜 저하 -15%")
};

/**
 * 컨디션 페널티 계산. 임계치 30 이하 기준으로 경제적 페널티를 적용한다.
 * "한 말은 지킨다": 스탯이 나쁘면 숫자로 확실히 불이익이 온다는 원칙.
 * 드라이한 팩트 — 점멸/경고창이 아니라 곱연산 계수로만 반영.
 */
export function computeStatPenalty(char: Character): StatPenalty {
  const reasons: string[] = [];
  let salaryMult = 1;
  let returnMult = 0;
  let careEffMult = 1;
  let charmMult = 1;

  if (char.wisdom < 30) {
    salaryMult *= 0.85;
    returnMult -= 0.02;
    reasons.push('지혜 저하: 연봉 -15%, 투자 수익률 -2%p');
  }
  if (char.health < 30) {
    careEffMult *= 0.75;
    reasons.push('건강 저하: 케어 효율 -25%');
  }
  if (char.charisma < 30) {
    charmMult *= 0.85;
    reasons.push('매력 저하: 상호작용 보너스 -15%');
  }

  return { salaryMult, returnMult, careEffMult, charmMult, reasons };
}

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
