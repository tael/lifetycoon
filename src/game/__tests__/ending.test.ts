import { describe, it, expect } from 'vitest';
import { calculateGrade, selectKeyMoments, highlightMoment } from '../domain/ending';
import type { KeyMoment } from '../types';

describe('calculateGrade', () => {
  it('total 0이면 F', () => {
    expect(calculateGrade(0, 0)).toBe('F');
  });

  it('전부 달성(1.0): S', () => {
    expect(calculateGrade(5, 5)).toBe('S');
    expect(calculateGrade(1, 1)).toBe('S');
  });

  it('4/5(0.8): A (임계 0.75 초과)', () => {
    expect(calculateGrade(4, 5)).toBe('A');
  });

  it('3/4(0.75): A (임계 0.75 경계)', () => {
    expect(calculateGrade(3, 4)).toBe('A');
  });

  it('3/6(0.5): B (임계 0.50 경계)', () => {
    expect(calculateGrade(3, 6)).toBe('B');
  });

  it('2/5(0.4): C (임계 0.25 초과)', () => {
    expect(calculateGrade(2, 5)).toBe('C');
  });

  it('1/5(0.2): D (0 < r < 0.25)', () => {
    expect(calculateGrade(1, 5)).toBe('D');
  });

  it('0/5(0): F (r = 0)', () => {
    expect(calculateGrade(0, 5)).toBe('F');
  });

  it('부동소수점 경계 케이스', () => {
    // S: ≥0.999
    expect(calculateGrade(999, 1000)).toBe('S');
    expect(calculateGrade(99, 100)).toBe('A');
    // A: ≥0.75
    expect(calculateGrade(3, 4)).toBe('A');
    expect(calculateGrade(2, 3)).toBe('B');
    // B: ≥0.50
    expect(calculateGrade(1, 2)).toBe('B');
    expect(calculateGrade(2, 5)).toBe('C');
    // C: ≥0.25
    expect(calculateGrade(1, 4)).toBe('C');
    expect(calculateGrade(1, 5)).toBe('D');
    // D: > 0
    expect(calculateGrade(1, 100)).toBe('D');
    // F: = 0
    expect(calculateGrade(0, 100)).toBe('F');
  });

  it('crisisTurns=0: 기존과 동일', () => {
    expect(calculateGrade(5, 5, 0)).toBe('S');
    expect(calculateGrade(4, 5, 0)).toBe('A');
    expect(calculateGrade(3, 6, 0)).toBe('B');
  });

  it('crisisTurns>10: 1등급 하향', () => {
    // 기본이 A → crisisTurns=15 → B
    expect(calculateGrade(4, 5, 15)).toBe('B');
    // 기본이 S → crisisTurns=15 → A
    expect(calculateGrade(5, 5, 15)).toBe('A');
    // 기본이 B → crisisTurns=15 → C
    expect(calculateGrade(3, 6, 15)).toBe('C');
  });

  it('crisisTurns>20: 2등급 하향', () => {
    // 기본이 A → crisisTurns=25 → C
    expect(calculateGrade(4, 5, 25)).toBe('C');
    // 기본이 S → crisisTurns=25 → B
    expect(calculateGrade(5, 5, 25)).toBe('B');
    // 기본이 B → crisisTurns=25 → D
    expect(calculateGrade(3, 6, 25)).toBe('D');
  });

  it('F 이하로는 내려가지 않음', () => {
    // 기본이 D → crisisTurns=25 → F
    expect(calculateGrade(1, 5, 25)).toBe('F');
    // 기본이 F → crisisTurns=25 → F
    expect(calculateGrade(0, 5, 25)).toBe('F');
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
