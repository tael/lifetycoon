import { describe, it, expect } from 'vitest';
import { ageSalaryMultiplier } from '../domain/salaryCurve';

describe('ageSalaryMultiplier', () => {
  it('은퇴자는 항상 1.0', () => {
    expect(ageSalaryMultiplier(30, 'retired')).toBe(1.0);
    expect(ageSalaryMultiplier(70, 'retired')).toBe(1.0);
  });

  it('매핑되지 않은 직업은 1.0 폴백', () => {
    expect(ageSalaryMultiplier(30, 'unknownjob')).toBe(1.0);
  });

  it('일반직(회사원)은 22세에 0.7, 35세에 1.0, 50세에 1.3', () => {
    expect(ageSalaryMultiplier(22, 'officeworker')).toBeCloseTo(0.7, 2);
    expect(ageSalaryMultiplier(35, 'officeworker')).toBeCloseTo(1.0, 2);
    expect(ageSalaryMultiplier(50, 'officeworker')).toBeCloseTo(1.3, 2);
  });

  it('전문직(의사)은 30세에 0.8, 45세에 1.2, 60세에 1.3', () => {
    expect(ageSalaryMultiplier(30, 'doctor')).toBeCloseTo(0.8, 2);
    expect(ageSalaryMultiplier(45, 'doctor')).toBeCloseTo(1.2, 2);
    expect(ageSalaryMultiplier(60, 'doctor')).toBeCloseTo(1.3, 2);
  });

  it('조기피크(운동선수)는 25세에 1.5, 45세에 0.3', () => {
    expect(ageSalaryMultiplier(25, 'athlete')).toBeCloseTo(1.5, 2);
    expect(ageSalaryMultiplier(45, 'athlete')).toBeCloseTo(0.3, 2);
  });

  it('자영업(사장님)은 45세에 1.5, 60세에 1.0', () => {
    expect(ageSalaryMultiplier(45, 'ceo')).toBeCloseTo(1.5, 2);
    expect(ageSalaryMultiplier(60, 'ceo')).toBeCloseTo(1.0, 2);
  });

  it('예술가는 50세에 1.5 (후반 가치 상승)', () => {
    expect(ageSalaryMultiplier(50, 'artist')).toBeCloseTo(1.5, 2);
  });

  it('보간이 두 점 사이에서 올바르게 동작한다', () => {
    // officeworker: 22세=0.7, 35세=1.0 → 28.5세 = (0.7+1.0)/2 = 0.85
    const mid = ageSalaryMultiplier(28.5, 'officeworker');
    expect(mid).toBeCloseTo(0.85, 2);
  });

  it('student/parttime는 나이에 관계없이 항상 1.0', () => {
    expect(ageSalaryMultiplier(16, 'student')).toBe(1.0);
    expect(ageSalaryMultiplier(22, 'student')).toBe(1.0);
    expect(ageSalaryMultiplier(30, 'parttime')).toBe(1.0);
  });

  it('곡선 범위 밖(어린 나이/고령)은 첫/마지막 점 값을 반환', () => {
    // officeworker: 10세=0.5가 최소
    expect(ageSalaryMultiplier(5, 'officeworker')).toBeCloseTo(0.5, 2);
    // officeworker: 80세=0.8이 최대 나이
    expect(ageSalaryMultiplier(100, 'officeworker')).toBeCloseTo(0.8, 2);
  });
});
