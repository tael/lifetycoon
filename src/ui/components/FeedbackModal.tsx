import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xykbrdzn';

const CATEGORIES = [
  { value: '감상', emoji: '💛', label: '감상/후기' },
  { value: '버그', emoji: '🐛', label: '버그 신고' },
  { value: '제안', emoji: '💡', label: '기능 제안' },
  { value: '기타', emoji: '💬', label: '기타' },
] as const;

type Category = (typeof CATEGORIES)[number]['value'];

type SendState = 'idle' | 'sending' | 'sent' | 'error';

interface Props {
  onClose: () => void;
}

export function FeedbackModal({ onClose }: Props) {
  const [category, setCategory] = useState<Category>('감상');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<SendState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 익명 컨텍스트 수집 — 개인식별 정보는 포함하지 않는다.
  const phase = useGameStore((s) => s.phase);
  const character = useGameStore((s) => s.character);
  const dreams = useGameStore((s) => s.dreams);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 5) {
      setErrorMsg('5자 이상 입력해주세요.');
      setState('error');
      return;
    }
    if (trimmed.length > 2000) {
      setErrorMsg('2000자 이하로 입력해주세요.');
      setState('error');
      return;
    }
    setState('sending');
    setErrorMsg(null);

    const context = {
      phase: phase.kind,
      age: Math.floor(character.age),
      achievedDreams: dreams.filter((d) => d.achieved).length,
      totalDreams: dreams.length,
      language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          category,
          message: trimmed,
          context,
          // Formspree 자체 제목 필드
          _subject: `[인생타이쿤] ${category}: ${trimmed.slice(0, 40)}`,
        }),
      });
      if (res.ok) {
        setState('sent');
        setTimeout(() => onClose(), 1800);
      } else {
        setErrorMsg('전송에 실패했어요. 잠시 후 다시 시도해주세요.');
        setState('error');
      }
    } catch {
      setErrorMsg('네트워크 오류가 발생했어요.');
      setState('error');
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    zIndex: 9200, // SettingsModal(9000)보다 위
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    background: 'var(--bg-card, #fff)',
    borderRadius: 'var(--radius-lg, 16px)',
    width: '100%',
    maxWidth: 380,
    maxHeight: '85dvh',
    overflowY: 'auto',
    boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
    padding: '24px 20px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-sm, 14px)',
    fontWeight: 700,
    marginBottom: 8,
  };

  const isSent = state === 'sent';
  const isSending = state === 'sending';

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSending) onClose();
      }}
    >
      <div style={modalStyle}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg, 18px)', fontWeight: 800 }}>
            💬 피드백 보내기
          </h2>
          <button
            onClick={onClose}
            disabled={isSending}
            aria-label="피드백 닫기"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.4rem',
              cursor: isSending ? 'not-allowed' : 'pointer',
              lineHeight: 1,
              padding: 4,
              opacity: isSending ? 0.4 : 1,
            }}
          >
            ✕
          </button>
        </div>

        {isSent ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🙏</div>
            <div style={{ fontSize: 'var(--font-size-base, 16px)', fontWeight: 700, marginBottom: 4 }}>
              고마워요!
            </div>
            <div style={{ fontSize: 'var(--font-size-sm, 14px)', color: 'var(--text-muted, #888)' }}>
              소중한 의견이 전달됐어요.
            </div>
          </div>
        ) : (
          <>
            {/* Intro */}
            <div
              style={{
                fontSize: 'var(--font-size-xs, 12px)',
                color: 'var(--text-muted, #888)',
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              게임을 더 재미있게 만들 의견을 들려주세요.
              로그인 없이 익명으로 전달됩니다.
            </div>

            {/* Category */}
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>종류</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 6,
                }}
              >
                {CATEGORIES.map((c) => {
                  const active = category === c.value;
                  return (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      disabled={isSending}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md, 8px)',
                        border: active
                          ? '1.5px solid var(--accent, #ff9800)'
                          : '1px solid var(--border, #e0e0e0)',
                        background: active ? 'var(--accent-light, #fff3e0)' : 'var(--bg-secondary, #fafafa)',
                        color: active ? 'var(--accent, #ff9800)' : 'var(--text-primary, #333)',
                        fontWeight: active ? 700 : 500,
                        fontSize: 'var(--font-size-sm, 14px)',
                        cursor: isSending ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {c.emoji} {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message */}
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>의견</div>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (state === 'error') {
                    setState('idle');
                    setErrorMsg(null);
                  }
                }}
                disabled={isSending}
                placeholder="어떤 점이 좋았는지, 불편했는지, 어떤 기능이 있으면 좋을지 자유롭게 적어주세요."
                rows={6}
                maxLength={2000}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--border, #e0e0e0)',
                  fontSize: 'var(--font-size-sm, 14px)',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  lineHeight: 1.5,
                  boxSizing: 'border-box',
                }}
              />
              <div
                style={{
                  textAlign: 'right',
                  fontSize: 'var(--font-size-xs, 12px)',
                  color: 'var(--text-muted, #aaa)',
                  marginTop: 2,
                }}
              >
                {message.length} / 2000
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <div
                style={{
                  background: '#fff0f0',
                  color: 'var(--danger, #e53935)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: 'var(--font-size-xs, 12px)',
                  marginBottom: 12,
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSending || message.trim().length < 5}
              className="btn btn-block"
              style={{
                background: 'var(--accent, #ff9800)',
                color: '#fff',
                fontWeight: 700,
                opacity: isSending || message.trim().length < 5 ? 0.5 : 1,
                cursor: isSending || message.trim().length < 5 ? 'not-allowed' : 'pointer',
              }}
            >
              {isSending ? '전송 중...' : '📨 보내기'}
            </button>

            {/* Privacy note */}
            <div
              style={{
                fontSize: 'var(--font-size-xs, 12px)',
                color: 'var(--text-muted, #aaa)',
                textAlign: 'center',
                marginTop: 10,
                lineHeight: 1.4,
              }}
            >
              개인정보는 수집하지 않아요. 브라우저 종류, 언어, 현재 진행 중인
              나이(선택사항) 등 익명 정보만 함께 전달됩니다.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
