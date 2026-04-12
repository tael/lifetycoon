/**
 * 부모님 용돈 되돌림 (v0.3.0 V3-09).
 *
 * 20세부터 60세 미만까지 40년에 걸쳐 부모가 유년기에 준 총액의 1.5배를
 * 인플레이션 보정해 매년 균등 상환한다.
 *
 * "한 말은 지킨다" 철학: 어린 시절 받은 만큼은 갚는다는 한국식 효도의
 * 게임 메커니즘 표현. 강제이며 회피 불가.
 *
 * 주의: gameStore는 20세 첫 틱에 한 번만 base를 산정하고 이후 그 값을
 * 재사용해야 한다 (인플레이션이 매년 커지면 지급액도 폭주하기 때문).
 */

export const REPAYMENT_START_AGE = 20;
export const REPAYMENT_END_AGE = 60;
export const REPAYMENT_DURATION = REPAYMENT_END_AGE - REPAYMENT_START_AGE; // 40
/** 효(孝) 배수 — 받은 것보다 1.5배로 갚는다는 정서적 보정. */
export const FILIAL_MULTIPLIER = 1.5;

/**
 * 20세 시점에 1회 산정되는 연간 상환액 base.
 * @param parentalInvestment 유년기 동안 누적된 부모 용돈 총액
 * @param inflationMultiplier 20세 시점의 인플레 배수 (gameStore와 동일 공식)
 */
export function computeParentalRepaymentBase(
  parentalInvestment: number,
  inflationMultiplier: number,
): number {
  if (parentalInvestment <= 0) return 0;
  return Math.round(
    (parentalInvestment * inflationMultiplier * FILIAL_MULTIPLIER) /
      REPAYMENT_DURATION,
  );
}

/**
 * 현재 나이에 적용되는 연간 상환액. 20~59세만 양수.
 * base는 20세 시점에 산정해 저장된 값을 그대로 쓴다.
 */
export function parentalRepaymentForAge(age: number, base: number): number {
  if (age < REPAYMENT_START_AGE || age >= REPAYMENT_END_AGE) return 0;
  return base;
}
