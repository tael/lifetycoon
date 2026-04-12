/**
 * 가정 형편 시스템 (v0.4.0 경제 스케일 재조정).
 *
 * 시작 시 1회 랜덤으로 결정되는 캐릭터의 가정 환경.
 * 유년기(10~18세) 동안의 부모 용돈/학원비 산정에 사용되며,
 * 성인 이후의 부모님 되돌림(parentalRepayment) 기준값에도 영향을 준다.
 *
 * v0.4.0: 연령대별(10~12/13~15/16~18) 용돈 테이블로 확장. 연령이 오르면
 * 학원·교재·교복·스마트폰 등 교육비 총액이 자연스럽게 커지도록.
 *
 * 톤: 드라이한 팩트. 가난/부유 같은 가치판단 단어는 피하고
 *     "검소한/평범한/넉넉한"으로 중립적으로 표기한다.
 */

export type HouseholdClass = 'thrifty' | 'average' | 'affluent';

/**
 * 연령대별 월 용돈 테이블 (게임화폐).
 * - 10~12세: 검소 40만 / 평범 60만 / 넉넉 80만
 * - 13~15세: 검소 50만 / 평범 75만 / 넉넉 100만
 * - 16~18세: 검소 60만 / 평범 90만 / 넉넉 120만
 *
 * 평범 가정 9년 누적: (60+60+60+75+75+75+90+90+90)만 × 12 = 8,100만원.
 */
export const HOUSEHOLD_ALLOWANCE_MONTHLY_BY_AGE: Record<
  HouseholdClass,
  { early: number; mid: number; late: number }
> = {
  thrifty:  { early: 400_000, mid: 500_000, late: 600_000 },
  average:  { early: 600_000, mid: 750_000, late: 900_000 },
  affluent: { early: 800_000, mid: 1_000_000, late: 1_200_000 },
};

/**
 * 연령대 구분. 10~12 early, 13~15 mid, 16~(educationEndAge-1) late.
 * educationEndAge 기본값 19 → 16~18 late (기존 동작 호환).
 * 대학(23)이면 16~22, 대학원(26)이면 16~25까지 late 확장.
 * 범위 밖은 null 처리.
 */
export function allowanceBracket(age: number, educationEndAge = 19): 'early' | 'mid' | 'late' | null {
  const a = Math.floor(age);
  const lateEnd = educationEndAge - 1;
  if (a >= 10 && a <= 12) return 'early';
  if (a >= 13 && a <= 15) return 'mid';
  if (a >= 16 && a <= lateEnd) return 'late';
  return null;
}

/**
 * 주어진 연령·형편에 해당하는 월 부모 용돈.
 * 유년기(10~educationEndAge-1) 밖이면 0. educationEndAge 기본값 19.
 */
export function getMonthlyParentalAllowance(
  cls: HouseholdClass,
  age: number,
  educationEndAge = 19,
): number {
  const bracket = allowanceBracket(age, educationEndAge);
  if (bracket == null) return 0;
  return HOUSEHOLD_ALLOWANCE_MONTHLY_BY_AGE[cls][bracket];
}

/**
 * 주어진 연령·형편에 해당하는 연 부모 용돈 (월 × 12).
 * 유년기(10~educationEndAge-1) 밖이면 0. educationEndAge 기본값 19.
 */
export function getYearlyParentalAllowance(
  cls: HouseholdClass,
  age: number,
  educationEndAge = 19,
): number {
  return getMonthlyParentalAllowance(cls, age, educationEndAge) * 12;
}

/** 학원비는 부모 용돈의 65% — 모든 가정·연령에 동일 적용. */
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
