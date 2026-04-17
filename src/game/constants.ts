// 게임 전역 상수 — 매직넘버를 한 곳에서 관리

// 경제 하한
export const CASH_FLOOR = -500_000_000;

// 직업/수입
export const ADULT_STUDENT_MONTHLY = 2_000_000; // 성인 학생 아르바이트 월 급여

// 정부 긴급 대출
export const MIN_GOV_LOAN = 100_000_000;

// 보험료
export const HEALTH_INSURANCE_PREMIUM = 200_000;
export const ASSET_INSURANCE_PREMIUM = 300_000;

// 경제/인플레이션
export const ANNUAL_INFLATION_RATE = 0.02; // 연 인플레이션율 2%

// 나이별 스탯 감소 임계값
export const AGE_THRESHOLD_SENIOR = 70;
export const AGE_THRESHOLD_MIDDLE = 50;

// 나이별 행복 감소 배율
export const HAPPY_DECAY_SENIOR = 1.2;
export const HAPPY_DECAY_MIDDLE = 0.8;
export const HAPPY_DECAY_YOUNG = 0.4;

// 나이별 건강 감소 배율
export const HEALTH_DECAY_SENIOR = 1.0;
export const HEALTH_DECAY_MIDDLE = 0.5;
export const HEALTH_DECAY_YOUNG = 0.15;
