/**
 * 성인 기본 생활비 (v0.3.0 V3-06 / V3-07).
 *
 * 19세 이상부터 발생. 직업이 있으면 연봉의 35%를, 무직이면 연 360만 최저액을
 * 차감한다. 직업 있어도 저연봉이면 최저액이 적용된다 (max 처리).
 *
 * 톤: 드라이한 시스템 메시지. "독립한 어른은 매년 생활비가 자동으로 나갑니다"
 *     같은 한 줄 설명으로 충분.
 */

/** 성인 연봉 대비 생활비 비율. 0.35 = 연봉의 35%. */
export const ADULT_COST_OF_LIVING_RATIO = 0.35;

/** 무직 또는 저연봉 성인의 연 최저 생활비. 월 30만 환산. */
export const UNEMPLOYED_MIN_YEARLY = 3_600_000;

/**
 * 연 생활비 계산.
 * - 19세 미만: 0 (부모 부담)
 * - 무직(salary<=0): UNEMPLOYED_MIN_YEARLY 고정
 * - 직업 있음: max(UNEMPLOYED_MIN_YEARLY, 연봉 * 0.35)
 */
export function computeCostOfLiving(age: number, yearlySalary: number): number {
  if (age < 19) return 0;
  if (yearlySalary <= 0) return UNEMPLOYED_MIN_YEARLY;
  return Math.max(
    UNEMPLOYED_MIN_YEARLY,
    Math.round(yearlySalary * ADULT_COST_OF_LIVING_RATIO),
  );
}
