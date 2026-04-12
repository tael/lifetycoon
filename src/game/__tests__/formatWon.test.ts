import { describe, it, expect } from 'vitest';
import { formatWon } from '../domain/asset';

describe('formatWon', () => {
  it('1만 미만은 toLocaleString + 원', () => {
    expect(formatWon(0)).toBe('0원');
    expect(formatWon(999)).toBe('999원');
    expect(formatWon(9999)).toBe('9,999원');
  });

  it('1만 이상은 X만원 (소수점 첫째 자리)', () => {
    expect(formatWon(10000)).toBe('1만원');
    expect(formatWon(35000)).toBe('3.5만원');
    expect(formatWon(100000)).toBe('10만원');
    expect(formatWon(9990000)).toBe('999만원');
  });

  it('1억 이상은 X억원', () => {
    expect(formatWon(100000000)).toBe('1억원');
    expect(formatWon(150000000)).toBe('1.5억원');
    expect(formatWon(1234560000)).toBe('12.3억원');
    expect(formatWon(9999000000)).toBe('100억원');
  });

  it('1조 이상은 X조원', () => {
    expect(formatWon(1000000000000)).toBe('1조원');
    expect(formatWon(1500000000000)).toBe('1.5조원');
    expect(formatWon(12345000000000)).toBe('12.3조원');
  });

  it('음수 처리', () => {
    expect(formatWon(-35000)).toBe('-3.5만원');
    expect(formatWon(-350000000)).toBe('-3.5억원');
    expect(formatWon(-1500000000000)).toBe('-1.5조원');
    expect(formatWon(-500)).toBe('-500원');
  });

  it('NaN/Infinity는 0 반환', () => {
    expect(formatWon(NaN)).toBe('0');
    expect(formatWon(Infinity)).toBe('0');
    expect(formatWon(-Infinity)).toBe('0');
  });

  it('.0 소수점 제거', () => {
    expect(formatWon(10000)).toBe('1만원');
    expect(formatWon(100000000)).toBe('1억원');
    expect(formatWon(1000000000000)).toBe('1조원');
  });
});
