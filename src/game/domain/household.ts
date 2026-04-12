/**
 * 가정 형편 시스템 (v0.3.0)
 *
 * 시작 시 1회 랜덤으로 결정되는 캐릭터의 가정 환경.
 * 유년기(10~18세) 동안의 부모 용돈/학원비 산정에 사용되며,
 * 성인 이후의 부모님 되돌림(parentalRepayment) 기준값에도 영향을 준다.
 *
 * 톤: 드라이한 팩트. 가난/부유 같은 가치판단 단어는 피하고
 *     "검소한/평범한/넉넉한"으로 중립적으로 표기한다.
 */

export type HouseholdClass = 'thrifty' | 'average' | 'affluent';

/** 연간 부모 용돈 (게임화폐). 월 환산은 ÷12. */
export const HOUSEHOLD_ALLOWANCE_YEARLY: Record<HouseholdClass, number> = {
  thrifty: 6_000_000,   // 월 50만
  average: 9_000_000,   // 월 75만
  affluent: 12_000_000, // 월 100만
};

/** 학원비는 부모 용돈의 65% — 모든 가정에 동일 적용. */
export const ACADEMY_RATIO = 0.65;

/** 가정 형편 라벨 (UI 노출용). */
export function householdLabel(c: HouseholdClass): string {
  switch (c) {
    case 'thrifty':
      return '검소한 가정';
    case 'average':
      return '평범한 가정';
    case 'affluent':
      return '넉넉한 가정';
  }
}

/**
 * 시작 시 1회 호출 — 1/3 균등 분포로 가정 형편 결정.
 * rng는 0..1 사이의 deterministic 난수 함수.
 */
export function pickRandomHouseholdClass(rng: () => number): HouseholdClass {
  const r = rng();
  if (r < 1 / 3) return 'thrifty';
  if (r < 2 / 3) return 'average';
  return 'affluent';
}
