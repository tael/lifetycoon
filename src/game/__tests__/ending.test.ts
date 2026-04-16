import { describe, it, expect } from 'vitest';
import { calculateGrade, selectKeyMoments, highlightMoment } from '../domain/ending';
import type { KeyMoment } from '../types';

// calculateGrade: 꿈 달성(0-60점) + 자산(0-40점) 복합 점수제
// 꿈: 전부달성=60점, 절반=30점, 0개=0점
// 자산: 100억+=40, 50억+=30, 20억+=20, 5억+=10, 미만=0
// 등급: 80+→S, 55+→A, 35+→B, 15+→C, 달성>0→D, else→F
describe('calculateGrade', () => {
  it('total 0이면 F', () => {
    expect(calculateGrade(0, 0)).toBe('F');
  });

  it('꿈 전부 달성 + 100억: S (60+40=100)', () => {
    expect(calculateGrade(2, 2, 0, 10_000_000_000)).toBe('S');
  });

  it('꿈 전부 달성 + 자산 없음: A (60+0=60, ≥55)', () => {
    expect(calculateGrade(2, 2, 0, 0)).toBe('A');
  });

  it('꿈 절반 + 100억: A (30+40=70, ≥55)', () => {
    expect(calculateGrade(1, 2, 0, 10_000_000_000)).toBe('A');
  });

  it('꿈 절반 + 50억: B (30+30=60, ≥55 → A)', () => {
    expect(calculateGrade(1, 2, 0, 5_000_000_000)).toBe('A');
  });

  it('꿈 절반 + 20억: B (30+20=50, ≥35)', () => {
    expect(calculateGrade(1, 2, 0, 2_000_000_000)).toBe('B');
  });

  it('꿈 0개 + 100억: B (0+40=40, ≥35)', () => {
    expect(calculateGrade(0, 2, 0, 10_000_000_000)).toBe('B');
  });

  it('꿈 절반 + 5억: C (30+10=40, ≥35 → B)', () => {
    expect(calculateGrade(1, 2, 0, 500_000_000)).toBe('B');
  });

  it('꿈 절반 + 자산 없음: C (30+0=30, ≥15)', () => {
    expect(calculateGrade(1, 2, 0, 0)).toBe('C');
  });

  it('꿈 0개 + 5억: C (0+10=10, < 15 → D, 달성>0 없음 → D/F)', () => {
    // 달성=0, score=10 → score>0이지만 achieved=0 → F
    expect(calculateGrade(0, 2, 0, 500_000_000)).toBe('D');
  });

  it('꿈 0개 + 자산 없음: F', () => {
    expect(calculateGrade(0, 2, 0, 0)).toBe('F');
  });

  it('crisisTurns=0: 하향 없음', () => {
    expect(calculateGrade(2, 2, 0, 10_000_000_000)).toBe('S');
    expect(calculateGrade(1, 2, 0, 2_000_000_000)).toBe('B');
  });

  it('crisisTurns>10: 1등급 하향', () => {
    // S(100점) → A
    expect(calculateGrade(2, 2, 15, 10_000_000_000)).toBe('A');
    // A(60점) → B
    expect(calculateGrade(2, 2, 15, 0)).toBe('B');
    // B(50점) → C
    expect(calculateGrade(1, 2, 15, 2_000_000_000)).toBe('C');
  });

  it('crisisTurns>20: 2등급 하향', () => {
    // S(100점) → B
    expect(calculateGrade(2, 2, 25, 10_000_000_000)).toBe('B');
    // A(60점) → C
    expect(calculateGrade(2, 2, 25, 0)).toBe('C');
  });

  it('F 이하로는 내려가지 않음', () => {
    expect(calculateGrade(0, 2, 25, 0)).toBe('F');
  });
});

function mkMoment(age: number, importance: number, text: string): KeyMoment {
  // tag 필드는 types.ts에서 LifeStageTag 문자열이지만 selectKeyMoments는
  // stageForAge(m.age)로 단계 판정을 하므로 tag 값은 중요하지 않다.
  return { age, importance, text, tag: '유년기' };
}

describe('highlightMoment', () => {
  it('importance >= 0.8인 non-asset moment를 자산 moment보다 우선 선정', () => {
    const moments: KeyMoment[] = [
      { age: 90, importance: 0.95, text: '자산 100억 달성', tag: '노년기' },
      { age: 30, importance: 0.85, text: '꿈의 직장 취업', tag: '청년기' },
    ];
    const result = highlightMoment(moments);
    expect(result?.text).toBe('꿈의 직장 취업');
  });

  it('text에 "돈" 키워드가 있으면 importance 0.1 감점 처리', () => {
    const moments: KeyMoment[] = [
      { age: 50, importance: 0.9, text: '큰돈을 벌었다', tag: '중년기' },
      { age: 40, importance: 0.85, text: '결혼을 했다', tag: '중년기' },
    ];
    // 자산 moment: 0.9 - 0.1 = 0.8, non-asset: 0.85 → non-asset 우선
    const result = highlightMoment(moments);
    expect(result?.text).toBe('결혼을 했다');
  });

  it('non-asset이 없으면 보정된 importance 기준 최고 moment 반환', () => {
    const moments: KeyMoment[] = [
      { age: 80, importance: 0.9, text: '자산 50억 돌파', tag: '노년기' },
      { age: 60, importance: 0.7, text: '자산 10억 달성', tag: '장년기' },
    ];
    const result = highlightMoment(moments);
    expect(result?.age).toBe(80);
  });

  it('빈 배열이면 undefined 반환', () => {
    expect(highlightMoment([])).toBeUndefined();
  });
});

describe('selectKeyMoments', () => {
  it('각 단계에서 최소 1개씩 우선 픽 (노년기 포함)', () => {
    const moments: KeyMoment[] = [
      mkMoment(12, 0.9, '유년기1'),
      mkMoment(25, 0.8, '청년기1'),
      mkMoment(45, 0.7, '중년기1'),
      mkMoment(65, 0.6, '장년기1'),
      mkMoment(85, 0.5, '노년기1'),
      mkMoment(90, 0.4, '노년기2'),
    ];
    const result = selectKeyMoments(moments, 8);
    // 노년기 moment가 최소 1개 포함돼야 한다 (이전 버그: requiredStages에서 노년기 누락)
    expect(result.some((m) => m.age >= 75)).toBe(true);
    // 단계별 최소 1개씩
    expect(result.some((m) => m.age < 20)).toBe(true);
    expect(result.some((m) => m.age >= 20 && m.age < 35)).toBe(true);
    expect(result.some((m) => m.age >= 35 && m.age < 55)).toBe(true);
    expect(result.some((m) => m.age >= 55 && m.age < 75)).toBe(true);
    expect(result.some((m) => m.age >= 75)).toBe(true);
  });

  it('maxCount 초과는 잘라낸다', () => {
    const moments: KeyMoment[] = Array.from({ length: 10 }, (_, i) =>
      mkMoment(10 + i * 8, 0.5 + i * 0.05, `moment${i}`),
    );
    const result = selectKeyMoments(moments, 3);
    expect(result).toHaveLength(3);
  });

  it('결과는 나이 순으로 정렬된다', () => {
    const moments: KeyMoment[] = [
      mkMoment(60, 0.9, 'a'),
      mkMoment(15, 0.8, 'b'),
      mkMoment(40, 0.7, 'c'),
    ];
    const result = selectKeyMoments(moments, 3);
    const ages = result.map((m) => m.age);
    expect(ages).toEqual([...ages].sort((a, b) => a - b));
  });
});
