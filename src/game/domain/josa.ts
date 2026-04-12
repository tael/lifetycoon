/**
 * 한국어 조사 자동 선택 유틸리티
 * 마지막 글자의 유니코드 종성(받침) 유무로 판별
 */

/** 한글 유니코드 범위: AC00 ~ D7A3 */
function hasFinalConsonant(char: string): boolean {
  const code = char.charCodeAt(0);
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
