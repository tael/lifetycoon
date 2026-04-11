import { describe, it, expect } from 'vitest';
import { computeStatPenalty } from '../domain/character';
import type { Character } from '../types';

function makeChar(overrides: Partial<Character> = {}): Character {
  return {
    name: '테스트',
    age: 30,
    happiness: 50,
    health: 50,
    wisdom: 50,
    charisma: 50,
    traits: [],
    emoji: '🙂',
    ...overrides,
  };
}

describe('computeStatPenalty', () => {
  it('정상 스탯에서는 페널티가 없다', () => {
    const p = computeStatPenalty(makeChar());
    expect(p.salaryMult).toBe(1);
    expect(p.returnMult).toBe(0);
    expect(p.careEffMult).toBe(1);
    expect(p.charmMult).toBe(1);
    expect(p.reasons).toEqual([]);
  });

  it('지혜 < 30: 연봉 -15% + 수익률 -2%p', () => {
    const p = computeStatPenalty(makeChar({ wisdom: 20 }));
    expect(p.salaryMult).toBeCloseTo(0.85, 5);
    expect(p.returnMult).toBeCloseTo(-0.02, 5);
    expect(p.reasons).toHaveLength(1);
    expect(p.reasons[0]).toContain('지혜');
  });

  it('건강 < 30: 케어 효율 -25%', () => {
    const p = computeStatPenalty(makeChar({ health: 10 }));
    expect(p.careEffMult).toBeCloseTo(0.75, 5);
    expect(p.salaryMult).toBe(1);
    expect(p.reasons[0]).toContain('건강');
  });

  it('매력 < 30: 상호작용 보너스 -15%', () => {
    const p = computeStatPenalty(makeChar({ charisma: 25 }));
    expect(p.charmMult).toBeCloseTo(0.85, 5);
    expect(p.reasons[0]).toContain('매력');
  });

  it('복합 저스탯: 페널티가 모두 누적된다', () => {
    const p = computeStatPenalty(makeChar({ wisdom: 10, health: 15, charisma: 20 }));
    expect(p.salaryMult).toBeCloseTo(0.85, 5);
    expect(p.returnMult).toBeCloseTo(-0.02, 5);
    expect(p.careEffMult).toBeCloseTo(0.75, 5);
    expect(p.charmMult).toBeCloseTo(0.85, 5);
    expect(p.reasons).toHaveLength(3);
  });

  it('임계치 30은 페널티 경계 밖(30 이상 정상)', () => {
    const p = computeStatPenalty(makeChar({ wisdom: 30, health: 30, charisma: 30 }));
    expect(p.reasons).toEqual([]);
  });

  it('임계 직전/직후: 29는 페널티, 30은 정상', () => {
    const at29 = computeStatPenalty(makeChar({ wisdom: 29, health: 29, charisma: 29 }));
    expect(at29.reasons).toHaveLength(3);
    expect(at29.salaryMult).toBeCloseTo(0.85, 5);
    expect(at29.careEffMult).toBeCloseTo(0.75, 5);
    expect(at29.charmMult).toBeCloseTo(0.85, 5);

    const at30 = computeStatPenalty(makeChar({ wisdom: 30, health: 30, charisma: 30 }));
    expect(at30.reasons).toHaveLength(0);

    const at31 = computeStatPenalty(makeChar({ wisdom: 31, health: 31, charisma: 31 }));
    expect(at31.reasons).toHaveLength(0);
  });
});
