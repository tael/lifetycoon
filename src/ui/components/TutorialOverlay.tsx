import { useState, useEffect } from 'react';

export const TUTORIAL_KEY = 'lifetycoon-kids:tutorialSeen';
// SettingsModal "튜토리얼 다시 보기" 버튼이 현재 게임을 유지한 채 오버레이만 다시
// 띄울 수 있게, 커스텀 이벤트로 요청을 전달한다. 기존 구현은 페이지 리로드라서
// 유저가 타이틀 화면으로 튕겨나가는 문제가 있었음.
export const TUTORIAL_SHOW_EVENT = 'lifetycoon:show-tutorial';
export function requestShowTutorial() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TUTORIAL_SHOW_EVENT));
}

export function TutorialOverlay() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(TUTORIAL_KEY)) return;
      setVisible(true);
    } catch { /* ignore */ }
  }, []);

  // 외부(설정의 "튜토리얼 다시 보기")에서 오는 요청을 듣고 오버레이를 다시 띄운다.
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setVisible(true);
    };
    window.addEventListener(TUTORIAL_SHOW_EVENT, handler);
    return () => window.removeEventListener(TUTORIAL_SHOW_EVENT, handler);
  }, []);

  if (!visible) return null;

  const steps = [
    { emoji: '🎮', title: '인생타이쿤에 오신 것을 환영합니다', text: '10세부터 100세까지, 여러분의 인생을 직접 경영하세요.' },
    { emoji: '🧭', title: '화면 아래 5개 메뉴', text: '🏠홈 · 🏦은행 · 📈투자 · 👥친구 · ⚙️설정 — 화면 맨 아래에서 언제든 이동할 수 있습니다.' },
    { emoji: '💰', title: '자산을 늘려보세요', text: '월급으로 주식을 매수하고, 예금도 하고, 배당금도 받아보세요.' },
    { emoji: '🍕', title: '캐릭터를 관리하세요', text: '간식/건강/공부/노래 버튼으로 스탯을 유지하세요. 관리하지 않으면 수치가 하락합니다.' },
    { emoji: '⏱️', title: '속도 조절', text: '0.5x / 1x / 2x 로 게임 진행 속도를 조절할 수 있습니다.' },
    { emoji: '💎', title: '배당금 자동 재투자', text: '배당금을 자동으로 재투자하면 복리 효과로 자산이 빠르게 늘어납니다.' },
    { emoji: '📈', title: '경제 사이클', text: '호황/불황 주기에 따라 투자 전략을 조정해 보세요.' },
    { emoji: '🏆', title: '업적 수집', text: '여러 번 플레이하면 업적이 쌓입니다.' },
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
