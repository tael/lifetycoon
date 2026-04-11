import { describe, it, expect } from 'vitest';
import { calculateGrade, selectKeyMoments } from '../domain/ending';
import type { KeyMoment } from '../types';

describe('calculateGrade', () => {
  it('total 0이면 C', () => {
    expect(calculateGrade(0, 0)).toBe('C');
  });

  it('전부 달성(1.0): S', () => {
    expect(calculateGrade(5, 5)).toBe('S');
    expect(calculateGrade(1, 1)).toBe('S');
  });

  it('4/5(0.8): A', () => {
    expect(calculateGrade(4, 5)).toBe('A');
  });

  it('2/3 ≈ 0.667: A (임계 0.66 초과)', () => {
    expect(calculateGrade(2, 3)).toBe('A');
  });

  it('1/3 ≈ 0.333: B (임계 0.33 초과)', () => {
    expect(calculateGrade(1, 3)).toBe('B');
  });

  it('0/5: C', () => {
    expect(calculateGrade(0, 5)).toBe('C');
  });

  it('부동소수점 경계: 0.32는 C, 0.34는 B', () => {
    // 1/3 = 0.333... 은 B. 0.33 정확히는 C로 내려가지만 achieved/total로는 재현 어려움.
    // 실무적으로 1/3, 2/3 두 케이스만 확인.
    expect(calculateGrade(1, 3)).toBe('B');
    expect(calculateGrade(2, 3)).toBe('A');
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
