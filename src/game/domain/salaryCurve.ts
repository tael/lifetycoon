/**
 * 직업별 연령-월급 곡선.
 *
 * ageSalaryMultiplier(age, jobId) → 배율 (1.0 = 기본 salary 그대로).
 * 곡선 유형별로 선형 보간(lerp)하여 부드러운 곡선을 만든다.
 */

type CurvePoint = [age: number, multiplier: number];

// 일반직: 회사원, 선생님, 편의점 알바
const GENERAL: CurvePoint[] = [
  [10, 0.5],
  [22, 0.7],
  [35, 1.0],
  [50, 1.3],
  [60, 1.1],
  [80, 0.8],
];

// 전문직: 의사, 과학자
const PROFESSIONAL: CurvePoint[] = [
  [10, 0.3],
  [30, 0.8],
  [45, 1.2],
  [60, 1.3],
  [80, 1.0],
];

// 조기피크: 운동선수, 유튜버
const EARLY_PEAK: CurvePoint[] = [
  [10, 0.5],
  [16, 1.0],
  [25, 1.5],
  [35, 0.7],
  [45, 0.3],
  [60, 0.2],
  [80, 0.1],
];

// 자영업: 사장님, 셰프
const SELF_EMPLOYED: CurvePoint[] = [
  [10, 0.3],
  [30, 0.5],
  [45, 1.5],
  [60, 1.0],
  [80, 0.7],
];

// 예술가
const ARTIST: CurvePoint[] = [
  [10, 0.2],
  [18, 0.3],
  [35, 1.0],
  [50, 1.5],
  [65, 1.2],
  [80, 0.8],
];

const JOB_CURVE_MAP: Record<string, CurvePoint[]> = {
  // 일반직
  officeworker: GENERAL,
  teacher: GENERAL,
  parttime: GENERAL,
  student: GENERAL,
  // 전문직
  doctor: PROFESSIONAL,
  scientist: PROFESSIONAL,
  // 조기피크
  athlete: EARLY_PEAK,
  youtuber: EARLY_PEAK,
  // 자영업
  ceo: SELF_EMPLOYED,
  chef: SELF_EMPLOYED,
  // 예술가
  artist: ARTIST,
  // 은퇴자 — 곡선 적용 안 함
};

/** 곡선 위 두 점 사이를 선형 보간 */
function lerpCurve(curve: CurvePoint[], age: number): number {
  if (age <= curve[0][0]) return curve[0][1];
  if (age >= curve[curve.length - 1][0]) return curve[curve.length - 1][1];

  for (let i = 0; i < curve.length - 1; i++) {
    const [a0, m0] = curve[i];
    const [a1, m1] = curve[i + 1];
    if (age >= a0 && age <= a1) {
      const t = (age - a0) / (a1 - a0);
      return m0 + (m1 - m0) * t;
    }
  }
  return 1.0;
}

/**
 * 주어진 나이와 직업에 대한 월급 배율을 반환한다.
 * 은퇴자(retired)는 곡선 없이 항상 1.0을 반환.
 * 매핑되지 않은 직업도 1.0 (안전 폴백).
 */
export function ageSalaryMultiplier(age: number, jobId: string): number {
  if (jobId === 'retired') return 1.0;
  const curve = JOB_CURVE_MAP[jobId];
  if (!curve) return 1.0;
  return lerpCurve(curve, age);
}
