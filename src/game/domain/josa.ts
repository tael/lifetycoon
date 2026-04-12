/**
 * 한국어 조사 자동 선택 유틸리티
 * 마지막 글자의 유니코드 종성(받침) 유무로 판별
 */

/** 한글 유니코드 범위: AC00 ~ D7A3 */
function hasFinalConsonant(char: string): boolean {
  const code = char.charCodeAt(0);

  // 숫자: 한국어 수사 발음 기준 받침 여부
  // 받침 있음: 0(영), 1(일), 3(삼), 6(육), 7(칠), 8(팔)
  // 받침 없음: 2(이), 4(사), 5(오), 9(구)
  if (code >= 0x30 && code <= 0x39) {
    return [0, 1, 3, 6, 7, 8].includes(code - 0x30);
  }

  // 영문: 자음으로 끝나면 받침 있음, 모음으로 끝나면 없음
  const upper = char.toUpperCase();
  if ((upper >= 'A' && upper <= 'Z')) {
    return !'AEIOU'.includes(upper);
  }

  if (code < 0xac00 || code > 0xd7a3) return false;
  // (code - 0xAC00) % 28 === 0 이면 받침 없음
  return (code - 0xac00) % 28 !== 0;
}

type Particle = '은/는' | '이/가' | '을/를' | '과/와' | '으로/로';

/**
 * word의 마지막 글자 받침 유무에 따라 올바른 조사를 반환합니다.
 * @example josa('민준', '은/는') // '은'
 * @example josa('하나', '은/는') // '는'
 */
export function josa(word: string, particle: Particle): string {
  if (!word) return particle.split('/')[0];
  const last = word[word.length - 1];
  const closed = hasFinalConsonant(last);

  switch (particle) {
    case '은/는': return closed ? '은' : '는';
    case '이/가': return closed ? '이' : '가';
    case '을/를': return closed ? '을' : '를';
    case '과/와': return closed ? '과' : '와';
    case '으로/로': {
      // ㄹ 받침(종성 8)은 예외적으로 '로' 사용
      const lastCode = last.charCodeAt(0);
      if (lastCode >= 0xac00 && lastCode <= 0xd7a3) {
        const jongseong = (lastCode - 0xac00) % 28;
        if (jongseong === 0) return '로';   // 받침 없음
        if (jongseong === 8) return '로';   // ㄹ 받침
        return '으로';
      }
      return closed ? '으로' : '로';
    }
  }
}
