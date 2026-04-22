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

// 부동산 가치 상승률 범위 (연)
export const REAL_ESTATE_APPRECIATION_MIN = 0.03;
export const REAL_ESTATE_APPRECIATION_MAX = 0.05;

// 위기 스탯 페널티 — orange/red 단계별 deltaYears당 감소량
export const CRISIS_ORANGE_STAT = { happiness: 3, health: 2, wisdom: 1, charisma: 1 };
export const CRISIS_RED_STAT = { happiness: 6, health: 4, wisdom: 2, charisma: 2 };

// 업적 임계값
export const ACHIEVEMENT_BILLIONAIRE = 100_000_000;   // 억만장자 기준 (1억)
export const ACHIEVEMENT_RICH = 1_000_000_000;        // 10억 부자 기준
export const ACHIEVEMENT_BALANCED_ASSETS = 50_000_000; // 균형 인생 자산 기준
export const ACHIEVEMENT_POOR_THRESHOLD = 1_000_000;  // 가난하지만 행복 자산 상한

// 엔딩 등급 자산 보너스 임계값 (calculateGrade)
export const GRADE_ASSET_TIER_4 = 10_000_000_000; // 100억+: 40점
export const GRADE_ASSET_TIER_3 = 5_000_000_000;  // 50억+: 30점
export const GRADE_ASSET_TIER_2 = 2_000_000_000;  // 20억+: 20점
export const GRADE_ASSET_TIER_1 = 500_000_000;    // 5억+: 10점
export const GRADE_ASSET_TIER_0 = 100_000_000;    // 1억+: 5점

// 엔딩 등급 점수 컷오프
export const GRADE_SCORE_S = 80;
export const GRADE_SCORE_A = 55;
export const GRADE_SCORE_B = 25;
export const GRADE_SCORE_C = 15;

// 위기 턴 누적 하향 임계값
export const CRISIS_TURNS_HEAVY = 20; // 2단계 하향
export const CRISIS_TURNS_LIGHT = 10; // 1단계 하향

// 위기 레벨 판정 — 월 지출 대비 자산 배수 임계값
export const CRISIS_EXPENSE_MONTHS_RED = 3;    // 3개월치 미만 → red
export const CRISIS_EXPENSE_MONTHS_YELLOW = 6; // 6개월치 이상 → yellow

// 강제 매각 할인율
export const FIRE_SALE_RATIO = 0.8; // 부동산 급매 시가의 80%

// 은행 초기값
export const BANK_INITIAL_INTEREST_RATE = 0.03; // 초기 예금 이자율
export const BANK_INITIAL_LOAN_RATE = 0.05;     // 초기 대출 이자율
export const LOAN_LTV_RATIO = 0.5;              // 대출 LTV 상한 (자산의 50%)

// 부동산 취득세율
export const ACQ_TAX_COMMERCIAL = 0.04;   // 상가
export const ACQ_TAX_1ST_HOME = 0.02;    // 1주택
export const ACQ_TAX_2ND_HOME = 0.08;    // 2주택
export const ACQ_TAX_3RD_PLUS_HOME = 0.12; // 3주택+

// 부동산 양도세율
export const CAP_GAINS_TAX_SHORT = 0.70;      // 1년 미만 보유
export const CAP_GAINS_TAX_MID = 0.40;        // 1-2년 보유
export const CAP_GAINS_TAX_LONG_MULTI = 0.20; // 2년+ 다주택

// 나이 임계값 (경제 시스템)
export const ADULT_START_AGE = 19;            // 성인 생활비 시작 나이 (기본 고졸 기준)

// 연금 정책
export const PENSION_BASE_PER_CAREER = 400_000; // 경력 1건당 연금 기본 금액(원/년)
export const PENSION_CAREER_CAP = 5;            // 경력 인정 상한 (건 수)
