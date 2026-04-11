import { useState, useEffect } from 'react';

export const TUTORIAL_KEY = 'lifetycoon-kids:tutorialSeen';

export function TutorialOverlay() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(TUTORIAL_KEY)) return;
      setVisible(true);
    } catch { /* ignore */ }
  }, []);

  if (!visible) return null;

  const steps = [
    { emoji: '🎮', title: '인생타이쿤에 온 걸 환영해!', text: '10세부터 100세까지, 너의 인생을 경영해봐!' },
    { emoji: '🧭', title: '화면 아래 5개 메뉴', text: '🏠홈 · 🏦은행 · 📈투자 · 👥친구 · ⚙️설정 — 화면 맨 아래에서 언제든 이동할 수 있어!' },
    { emoji: '💰', title: '돈을 모아봐!', text: '월급으로 주식을 사고, 예금도 하고, 배당금도 받아봐!' },
    { emoji: '🍕', title: '캐릭터를 돌봐!', text: '간식/건강/공부/노래 버튼으로 스탯을 관리해. 안 하면 떨어져!' },
    { emoji: '⏱️', title: '속도 조절', text: '0.5x / 1x / 2x 로 시간 빠르기 조절 가능' },
    { emoji: '💎', title: '배당금 자동 투자', text: '받은 배당금으로 주식을 자동으로 다시 사면 돈이 눈덩이처럼 불어나!' },
    { emoji: '📈', title: '경제 사이클', text: '호황/불황 주기에 따라 투자 전략을 바꿔봐' },
    { emoji: '🏆', title: '업적 수집', text: '여러 번 플레이하면 업적이 쌓여요' },
  ];

  const current = steps[step];

  const handleNext = () => {
    if (step >= steps.length - 1) {
      setVisible(false);
      try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch { /* ignore */ }
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 250 }}>
      <div className="modal-content text-center" style={{ animation: 'modalPop 0.25s ease-out' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--sp-sm)' }}>{current.emoji}</div>
        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--sp-xs)' }}>
          {current.title}
        </h3>
        <p style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.6, marginBottom: 'var(--sp-lg)', color: 'var(--text-secondary)' }}>
          {current.text}
        </p>
        <div className="flex gap-sm" style={{ justifyContent: 'center', alignItems: 'center' }}>
          {step > 0 && (
            <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              ← 이전
            </button>
          )}
          <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)', alignSelf: 'center' }}>
            {step + 1}/{steps.length}
          </span>
          <button className="btn btn-primary" onClick={handleNext}>
            {step >= steps.length - 1 ? '시작하기! 🚀' : '다음 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
