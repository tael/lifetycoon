import type { Character } from '../types';

/** 컨디션 페널티가 발동하는 스탯 임계치. 미만에서 발동, 이 값 이상은 정상. */
export const STAT_PENALTY_THRESHOLD = 30;

/** 지혜 저하 시 연봉 감소율. 0.85 = -15%. */
export const WISDOM_SALARY_MULT = 0.85;

/** 지혜 저하 시 투자 수익률 차감 가산(절대값). -0.02 = -2%p. */
export const WISDOM_RETURN_PENALTY = -0.02;

/** 건강 저하 시 케어 효율. 0.75 = -25%. */
export const HEALTH_CARE_EFF_MULT = 0.75;

/** 매력 저하 시 상호작용 보너스 계수. 0.85 = -15%. */
export const CHARISMA_CHARM_MULT = 0.85;

export type StatPenalty = {
  /** 월급 곱연산 계수 (1.0 = 정상, 0.85 = -15%) */
  salaryMult: number;
  /** 투자 수익률 차감 가산 (0 = 정상, -0.02 = -2%p) */
  returnMult: number;
  /** 케어 버튼 효과 계수 (1.0 = 정상, 0.75 = -25%) */
  careEffMult: number;
  /**
   * NPC/매력 상호작용 보너스 계수.
   * TODO(v0.2.x): 현재 선언만 되고 실제 NPC 상호작용 보너스 계산에 아직 주입되지
   * 않았다. NPC 이벤트/랭킹 비교 쪽에 charmMult를 곱하는 사이클을 잡으면 매력 저하가
   * 경제적 페널티로 완성된다.
   */
  charmMult: number;
  /** 사용자 대면 설명 목록 ("지혜 저하: 연봉 -15%"). */
  reasons: string[];
};

/**
 * 컨디션 페널티 계산. 임계치 STAT_PENALTY_THRESHOLD 미만에서 경제적 페널티가 발동한다.
 * "한 말은 지킨다": 스탯이 나쁘면 숫자로 확실히 불이익이 온다는 원칙.
 * 드라이한 팩트 — 점멸/경고창이 아니라 곱연산 계수로만 반영한다.
 */
export function computeStatPenalty(char: Character): StatPenalty {
  const reasons: string[] = [];
  let salaryMult = 1;
  let returnMult = 0;
  let careEffMult = 1;
  let charmMult = 1;

  if (char.wisdom < STAT_PENALTY_THRESHOLD) {
    salaryMult *= WISDOM_SALARY_MULT;
    returnMult += WISDOM_RETURN_PENALTY;
    reasons.push('지혜 저하: 연봉 -15%, 투자 수익률 -2%p');
  }
  if (char.health < STAT_PENALTY_THRESHOLD) {
    careEffMult *= HEALTH_CARE_EFF_MULT;
    reasons.push('건강 저하: 케어 효율 -25%');
  }
  if (char.charisma < STAT_PENALTY_THRESHOLD) {
    charmMult *= CHARISMA_CHARM_MULT;
    reasons.push('매력 저하: 상호작용 보너스 -15%');
  }

  return { salaryMult, returnMult, careEffMult, charmMult, reasons };
}

/**
 * 생활비 비율에 따른 케어 효율/자연 감소 배수.
 * ratio = actualCostOfLiving / expectedCostOfLiving (1.0 = 정상).
 * 0.8 이상이면 정상(보너스 없음). 미만이면 케어 효율 하락, 자연 감소 상승.
 */
export function costOfLivingMultiplier(ratio: number): { careBoost: number; decayMult: number } {
  if (ratio >= 0.8) return { careBoost: 1, decayMult: 1 };
  const clamped = Math.max(0.1, ratio); // 0.1 하한 (10배 감소 캡)
  return {
    careBoost: clamped,
    decayMult: 1 / clamped,
  };
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
