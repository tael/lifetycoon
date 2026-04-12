import { describe, it, expect } from 'vitest';
import { josa } from '../domain/josa';

describe('josa', () => {
  describe('은/는', () => {
    it('받침 있는 이름 "민준" → 은', () => {
      expect(josa('민준', '은/는')).toBe('은');
    });
    it('받침 없는 이름 "하나" → 는', () => {
      expect(josa('하나', '은/는')).toBe('는');
    });
    it('받침 없는 이름 "철수" → 는', () => {
      expect(josa('철수', '은/는')).toBe('는');
    });
    it('받침 없는 이름 "지아" → 는', () => {
      expect(josa('지아', '은/는')).toBe('는');
    });
  });

  describe('이/가', () => {
    it('받침 있는 "민준" → 이', () => {
      expect(josa('민준', '이/가')).toBe('이');
    });
    it('받침 없는 "하나" → 가', () => {
      expect(josa('하나', '이/가')).toBe('가');
    });
  });

  describe('을/를', () => {
    it('받침 있는 "민준" → 을', () => {
      expect(josa('민준', '을/를')).toBe('을');
    });
    it('받침 없는 "하나" → 를', () => {
      expect(josa('하나', '을/를')).toBe('를');
    });
  });

  describe('과/와', () => {
    it('받침 있는 "민준" → 과', () => {
      expect(josa('민준', '과/와')).toBe('과');
    });
    it('받침 없는 "하나" → 와', () => {
      expect(josa('하나', '과/와')).toBe('와');
    });
  });

  describe('으로/로', () => {
    it('받침 있는 "민준" → 으로', () => {
      expect(josa('민준', '으로/로')).toBe('으로');
    });
    it('받침 없는 "하나" → 로', () => {
      expect(josa('하나', '으로/로')).toBe('로');
    });
    it('"ㄹ" 받침 "서울" → 로 (ㄹ 받침은 로)', () => {
      expect(josa('서울', '으로/로')).toBe('로');
    });
  });

  describe('빈 문자열', () => {
    it('빈 문자열 → 첫 번째 선택지 반환', () => {
      expect(josa('', '은/는')).toBe('은');
    });
  });
});
