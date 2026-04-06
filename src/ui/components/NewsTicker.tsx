import { useState, useEffect, useRef } from 'react';

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
];

export function NewsTicker({ age }: { age: number }) {
  const [text, setText] = useState('');
  const prevAge = useRef(age);

  useEffect(() => {
    const intAge = Math.floor(age);
    if (intAge !== prevAge.current && intAge % 3 === 0) {
      prevAge.current = intAge;
      const idx = Math.floor(Math.random() * NEWS_POOL.length);
      setText(NEWS_POOL[idx]);
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
