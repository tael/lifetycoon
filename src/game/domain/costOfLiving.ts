/**
 * 성인 기본 생활비 (v0.4.0 V4 경제 스케일 재조정).
 *
 * 19세 이상부터 발생. 직업이 있으면 연봉의 42%를, 무직이면 연 1,680만 최저액을
 * 차감한다. 직업 있어도 저연봉이면 최저액이 적용된다 (max 처리).
 *
 * 2026년 한국 현실: 통계청 평균소비성향 약 70.5% → 게임 난이도를 위해 42%까지
 * 완화. 1인 가구 전국 평균 생활비 월 140만(연 1,680만)을 무직/저연봉 최저선으로
 * 삼는다.
 *
 * 톤: 드라이한 시스템 메시지. "독립한 어른은 매년 생활비가 자동으로 나갑니다"
 *     같은 한 줄 설명으로 충분.
 */

/** 기본 성인 연봉 대비 생활비 비율. 0.42 = 연봉의 42%. */
export const ADULT_COST_OF_LIVING_RATIO = 0.42;

/** 무직 또는 저연봉 성인의 연 최저 생활비. 월 140만 환산. */
export const UNEMPLOYED_MIN_YEARLY = 16_800_000;

/**
 * 직업별 생활비 비율 맵.
 * 고소득 전문직은 비율이 높고, 학생/아르바이트는 낮게 설정.
 */
export const JOB_COST_RATIO: Record<string, number> = {
  student: 0.25,
  parttime: 0.35,
  artist: 0.40,
  chef: 0.40,
  officeworker: 0.42,
  teacher: 0.42,
  youtuber: 0.42,
  scientist: 0.45,
  athlete: 0.45,
  doctor: 0.50,
  ceo: 0.50,
  retired: 0.35,
};

/**
 * 연 생활비 계산.
 * - 19세 미만: 0 (부모 부담)
 * - 무직(salary<=0): UNEMPLOYED_MIN_YEARLY 고정
 * - 직업 있음: max(UNEMPLOYED_MIN_YEARLY, 연봉 * 직업별비율)
 */
export function computeCostOfLiving(age: number, yearlySalary: number, jobId?: string): number {
  if (age < 19) return 0;
  if (yearlySalary <= 0) return UNEMPLOYED_MIN_YEARLY;
  const ratio = jobId ? (JOB_COST_RATIO[jobId] ?? ADULT_COST_OF_LIVING_RATIO) : ADULT_COST_OF_LIVING_RATIO;
  return Math.max(
    UNEMPLOYED_MIN_YEARLY,
    Math.round(yearlySalary * ratio),
  );
}
