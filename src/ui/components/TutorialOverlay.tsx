import { useState, useEffect } from 'react';

const TUTORIAL_KEY = 'lifetycoon-kids:tutorial-seen';

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
    { emoji: '🎮', title: '인생타이쿤에 온 걸 환영해!', text: '10세부터 100세까지 약 10분 동안 인생을 경영해봐!' },
    { emoji: '⏱️', title: '시간은 자동으로 흘러', text: '중요 이벤트에서 멈추니까 선택을 잘 해! 속도는 0.5x/1x/2x로 조절 가능!' },
    { emoji: '💰', title: '돈을 모아봐!', text: '월급으로 주식을 사고, 예금도 하고, 배당금도 받아봐!' },
    { emoji: '🍕', title: '캐릭터를 돌봐!', text: '간식/건강/공부/노래 버튼으로 스탯을 관리해. 안 하면 떨어져!' },
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
        <div className="flex gap-sm" style={{ justifyContent: 'center' }}>
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
