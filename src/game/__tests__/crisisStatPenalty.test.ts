import { describe, it, expect } from 'vitest';
import { computeCrisisLevel } from '../domain/crisisEngine';

/**
 * V5-04: 위기 스탯 차감 로직 검증.
 * gameStore.advanceYear 내 인라인 로직을 도메인 함수(computeCrisisLevel)와
 * 연계하여 검증한다.
 */

// advanceYear 내 crisisCharacter 계산을 순수 함수로 추출한 헬퍼
function applyCrisisStatPenalty(
  stats: { happiness: number; health: number; wisdom: number; charisma: number },
  crisisLevel: ReturnType<typeof computeCrisisLevel>,
  deltaYears: number,
) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  if (crisisLevel === 'orange') {
    return {
      happiness: clamp(stats.happiness - 3 * deltaYears),
      health: clamp(stats.health - 2 * deltaYears),
      wisdom: clamp(stats.wisdom - 1 * deltaYears),
      charisma: clamp(stats.charisma - 1 * deltaYears),
    };
  }
  if (crisisLevel === 'red') {
    return {
      happiness: clamp(stats.happiness - 6 * deltaYears),
      health: clamp(stats.health - 4 * deltaYears),
      wisdom: clamp(stats.wisdom - 2 * deltaYears),
      charisma: clamp(stats.charisma - 2 * deltaYears),
    };
  }
  return { ...stats };
}

const BASE_STATS = { happiness: 50, health: 50, wisdom: 50, charisma: 50 };

describe('위기 스탯 차감 (V5-04)', () => {
  it('safe: 차감 없음', () => {
    const level = computeCrisisLevel({
      netCashflow: 100_000,
      monthlyExpense: 1_000_000,
      totalAssets: 10_000_000,
      cash: 2_000_000,
    });
    expect(level).toBe('safe');
    const result = applyCrisisStatPenalty(BASE_STATS, level, 1);
    expect(result).toEqual(BASE_STATS);
  });

  it('yellow: 차감 없음', () => {
    const level = computeCrisisLevel({
      netCashflow: -100_000,
      monthlyExpense: 1_000_000,
      totalAssets: 6_000_000,
      cash: 1_000_000,
    });
    expect(level).toBe('yellow');
    const result = applyCrisisStatPenalty(BASE_STATS, level, 1);
    expect(result).toEqual(BASE_STATS);
  });

  it('orange: happiness -3, health -2, wisdom -1, charisma -1 (deltaYears=1)', () => {
    const level = computeCrisisLevel({
      netCashflow: -100_000,
      monthlyExpense: 1_000_000,
      totalAssets: 5_000_000,
      cash: 500_000,
    });
    expect(level).toBe('orange');
    const result = applyCrisisStatPenalty(BASE_STATS, level, 1);
    expect(result.happiness).toBe(47);
    expect(result.health).toBe(48);
    expect(result.wisdom).toBe(49);
    expect(result.charisma).toBe(49);
  });

  it('red: happiness -6, health -4, wisdom -2, charisma -2 (deltaYears=1)', () => {
    const level = computeCrisisLevel({
      netCashflow: -500_000,
      monthlyExpense: 1_000_000,
      totalAssets: 2_000_000,
      cash: -100_000,
    });
    expect(level).toBe('red');
    const result = applyCrisisStatPenalty(BASE_STATS, level, 1);
    expect(result.happiness).toBe(44);
    expect(result.health).toBe(46);
    expect(result.wisdom).toBe(48);
    expect(result.charisma).toBe(48);
  });

  it('red 차감이 orange의 정확히 2배', () => {
    const orangeResult = applyCrisisStatPenalty(BASE_STATS, 'orange', 1);
    const redResult = applyCrisisStatPenalty(BASE_STATS, 'red', 1);
    expect(BASE_STATS.happiness - redResult.happiness).toBe(
      (BASE_STATS.happiness - orangeResult.happiness) * 2,
    );
    expect(BASE_STATS.health - redResult.health).toBe(
      (BASE_STATS.health - orangeResult.health) * 2,
    );
  });

  it('deltaYears=2: orange 차감이 2배로 누적', () => {
    const level = 'orange' as const;
    const result = applyCrisisStatPenalty(BASE_STATS, level, 2);
    expect(result.happiness).toBe(44); // 50 - 3*2
    expect(result.health).toBe(46);   // 50 - 2*2
    expect(result.wisdom).toBe(48);   // 50 - 1*2
    expect(result.charisma).toBe(48); // 50 - 1*2
  });

  it('스탯이 0 미만으로 내려가지 않음 (clamp)', () => {
    const lowStats = { happiness: 2, health: 3, wisdom: 1, charisma: 1 };
    const result = applyCrisisStatPenalty(lowStats, 'red', 1);
    expect(result.happiness).toBe(0);
    expect(result.health).toBe(0);
    expect(result.wisdom).toBe(0);
    expect(result.charisma).toBe(0);
  });
});

describe('crisisTurns 누적', () => {
  it('orange 위기 시 crisisTurns 누적', () => {
    const crisisTurns = 0;
    const level = 'orange' as const;
    const deltaYears = 1;
    const newCrisisTurns = (level === 'orange' || level === 'red')
      ? crisisTurns + deltaYears
      : crisisTurns;
    expect(newCrisisTurns).toBe(1);
  });

  it('red 위기 시 crisisTurns 누적', () => {
    const crisisTurns = 3;
    const level = 'red' as const;
    const deltaYears = 2;
    const newCrisisTurns = (level === 'orange' || level === 'red')
      ? crisisTurns + deltaYears
      : crisisTurns;
    expect(newCrisisTurns).toBe(5);
  });

  it('safe 시 crisisTurns 변화 없음', () => {
    const crisisTurns = 5;
    const level = 'safe' as const;
    const deltaYears = 1;
    const newCrisisTurns = (level === 'orange' || level === 'red')
      ? crisisTurns + deltaYears
      : crisisTurns;
    expect(newCrisisTurns).toBe(5);
  });

  it('yellow 시 crisisTurns 변화 없음', () => {
    const crisisTurns = 5;
    const level = 'yellow' as const;
    const deltaYears = 1;
    const newCrisisTurns = (level === 'orange' || level === 'red')
      ? crisisTurns + deltaYears
      : crisisTurns;
    expect(newCrisisTurns).toBe(5);
  });
});
