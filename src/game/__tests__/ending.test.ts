import { describe, it, expect } from 'vitest';
import { calculateGrade, selectKeyMoments } from '../domain/ending';
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
});

function mkMoment(age: number, importance: number, text: string): KeyMoment {
  // tag 필드는 types.ts에서 LifeStageTag 문자열이지만 selectKeyMoments는
  // stageForAge(m.age)로 단계 판정을 하므로 tag 값은 중요하지 않다.
  return { age, importance, text, tag: '유년기' };
}

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
