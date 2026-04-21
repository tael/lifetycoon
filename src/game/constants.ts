// 게임 전역 상수 — 매직넘버를 한 곳에서 관리

// 경제 하한
export const CASH_FLOOR = -500_000_000;

// 직업/수입
export const ADULT_STUDENT_MONTHLY = 2_000_000; // 성인 학생 아르바이트 월 급여

// 정부 긴급 대출
export const MIN_GOV_LOAN = 100_000_000;

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

// 스탯 감소 확률 임계값
export const STAT_DECAY_LOW_THRESHOLD = 0.33;
export const STAT_DECAY_HIGH_THRESHOLD = 0.66;

// 부업 월 소득
export const SIDE_JOB_MONTHLY = 1_000_000;

// 배당 성장률
export const DIVIDEND_GROWTH_BASE = 0.02;
export const DIVIDEND_GROWTH_BOOM = 0.005;
export const DIVIDEND_GROWTH_RECESSION = -0.005;

// 금리 경기사이클 조정
export const INTEREST_RATE_CYCLE_ADJ = 0.005; // boom: +, recession: -
export const INTEREST_RATE_MIN = 0.01;
export const INTEREST_RATE_MAX = 0.15;

// 입출금통장 / 마이너스통장
export const CASH_INTEREST_RATE = 0.001; // 입출금통장 연 이자율 0.1%
export const OVERDRAFT_RATE_PREMIUM = 0.01; // 마이너스통장 가산금리 (loanInterestRate + 이 값)

// 스킬 보너스
export const NEGOTIATION_BONUS = 1.1; // 협상 스킬 급여 배수

// 자동투자
export const AUTO_INVEST_RATIO = 0.1; // 자동투자 — 연 급여 대비 투자 비율

// 키 모먼트
export const KEY_MOMENT_LIMIT = 30; // 키 모먼트 최대 보관 수
