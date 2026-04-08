import { useState, useEffect, useRef } from 'react';

const ECON_TIPS = [
  '💡 팁: 일찍 시작할수록 복리 효과가 커요!',
  '💡 팁: 분산 투자 = 달걀을 여러 바구니에!',
  '💡 팁: 예금은 안전, 주식은 성장 가능성!',
  '💡 팁: 충동 구매 대신 필요한 것만 사기!',
  '💡 팁: 수입의 일부를 꼭 저축하자!',
  '💡 팁: 빚은 적을수록 마음이 편해요!',
  '💡 팁: 투자는 오래 기다리는 게 중요해요!',
  '💡 팁: 남들이 무서워할 때가 기회일 수 있어!',
];

const NEWS_POOL = [
  '📰 떡볶이 가격이 올해도 올랐습니다',
  '📺 펭귄 택배, 북극까지 배달 성공',
  '🎵 무지개 전자 신제품 출시 임박',
  '🐱 고양이 은행 "냥냥 적금" 인기',
  '🚀 로켓김밥 우주 진출 계획 발표',
  '💜 보라보라 화장품 매출 사상 최대',
  '🍗 레전드 치킨 할인 이벤트 진행 중',
  '🌌 메타우주여행 예약률 300% 돌파',
  '🐕 댕댕이 사료 신맛 출시',
  '🍱 두부공주 비건 인기몰이',
  '📈 전문가 "지금은 저축의 시대"',
  '📉 전문가 "지금이 투자 적기"',
  '🏦 은행 금리 변동 예고',
  '🎓 교육부 "용돈 교육 필수화"',
  '🌤️ 오늘 날씨 맑음, 재테크 하기 좋은 날',
  '🎮 인생타이쿤 플레이어 100만 돌파 (거짓)',
  '🏠 부동산 시장 "지금 사야 한다" vs "기다려야 한다"',
  '💡 경제 상식: 복리는 시간이 만드는 마법',
  '🧊 얼음 사업이 뜬다? 펭귄 택배 급등',
  '🎪 전국 경제 올림픽 개최, 참가자 모집 중',
  '🍕 피자 배달 시장 연 10조원 돌파',
  '🤖 AI가 주식 추천? "아직 믿지 마세요"',
  '🏋️ 건강 투자가 최고의 투자!',
  '📱 스마트폰 앱으로 용돈 관리하는 시대',
  '🌍 글로벌 경제 "불확실성 높아져"',
  '🎂 떡볶이 제국 창립 10주년 기념 할인',
  '🐧 펭귄 택배 CEO "남극 물류센터 짓겠다"',
  '💰 어린이 저축왕 대회 우승 상금 100만원',
  '🏆 올해의 투자자 시상식 개최',
  '📊 "분산 투자하면 잠을 잘 잔다" 연구 결과',
  '🌙 밤에 주식 보지 마세요! 건강 해칩니다',
  '🎵 무지개 전자 자율주행 라디오 개발 중',
  '🐱 고양이 은행 "반려동물 전용 통장" 출시',
  '🍗 치킨 소비량 세계 1위 갱신',
  '💜 보라보라 화장품 "보라색 선크림" 히트',
  '🚀 로켓김밥 "화성 김밥 프로젝트" 발표',
  '🧮 용돈으로 배우는 경제: 첫 저축이 중요',
  '🏠 전세 vs 월세 영원한 논쟁',
  '🎓 경제 교육 의무화 법안 국회 통과',
];

export function NewsTicker({ age, forcedMessage }: { age: number; forcedMessage?: string }) {
  const [text, setText] = useState('');
  const prevAge = useRef(age);

  // Show forced message (e.g. economy cycle change) immediately
  useEffect(() => {
    if (!forcedMessage) return;
    setText(forcedMessage);
    const timer = setTimeout(() => setText(''), 5000);
    return () => clearTimeout(timer);
  }, [forcedMessage]);

  useEffect(() => {
    const intAge = Math.floor(age);
    if (intAge !== prevAge.current && intAge % 3 === 0) {
      prevAge.current = intAge;
      // 30% chance of econ tip, 70% news
      const pool = Math.random() < 0.3 ? ECON_TIPS : NEWS_POOL;
      const idx = Math.floor(Math.random() * pool.length);
      setText(pool[idx]);
      const timer = setTimeout(() => setText(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [age]);

  if (!text) return null;

  return (
    <div style={{
      background: 'var(--bg-dark)',
      color: '#fff',
      fontSize: 'var(--font-size-xs)',
      padding: '4px 12px',
      borderRadius: 'var(--radius-full)',
      marginBottom: 'var(--sp-xs)',
      animation: 'tickerSlide 0.4s ease-out',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>
      {text}
      <style>{`
        @keyframes tickerSlide {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
