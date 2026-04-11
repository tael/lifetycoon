// 연금 계산 단일 출처.
// v0.2.0 리뷰에서 gameStore.advanceYear의 공식과 computeCashflow의 공식이
// 어긋나 UI 표시와 실제 지급액이 달라지는 불일치가 발견돼 도메인 함수로 뽑았다.

/** 65세부터 연금 지급 시작. */
export const PENSION_START_AGE = 65;

/** 경력 1건당 연금 기본 금액(원/년). */
const PENSION_BASE_PER_CAREER = 400_000;

/** 경력 인정 상한 (5건 이상이어도 5로 캡). */
const PENSION_CAREER_CAP = 5;

/**
 * 연간 연금액을 계산한다.
 *
 * - intAge가 PENSION_START_AGE(65) 미만이면 0.
 * - careerCount는 "직업/아르바이트 시나리오를 몇 번 겪었는가"의 근사치.
 *   usedScenarioIds 중 'job'/'career'/'part_time' 키워드를 포함하는 시나리오 수 + 1.
 * - inflationMultiplier는 30세 이후 연 2% 누적되는 인플레 보정(gameStore와 동일 정의).
 * - deltaYears는 기본 1. 배속/타임 점프 케이스에만 2+ 가 됨.
 */
export function computePensionYearly(
  intAge: number,
  careerCount: number,
  inflationMultiplier: number,
  deltaYears: number = 1,
): number {
  if (intAge < PENSION_START_AGE) return 0;
  const cappedCareer = Math.min(Math.max(1, careerCount), PENSION_CAREER_CAP);
  return Math.round(
    PENSION_BASE_PER_CAREER * cappedCareer * deltaYears * inflationMultiplier,
  );
}
