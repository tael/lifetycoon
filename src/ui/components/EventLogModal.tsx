import type { LifeEvent } from '../../game/types';

interface Props {
  logs: LifeEvent[];
  onClose: () => void;
}

const MAX_DISPLAY = 50;

export function EventLogModal({ logs, onClose }: Props) {
  const sorted = [...logs]
    .sort((a, b) => b.age - a.age || b.timestamp - a.timestamp)
    .slice(0, MAX_DISPLAY);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 9000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    background: 'var(--bg-card, #fff)',
    borderRadius: 'var(--radius-lg, 16px)',
    width: '100%',
    maxWidth: 400,
    maxHeight: '80dvh',
    overflowY: 'auto',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    padding: '20px',
  };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg, 18px)', fontWeight: 800 }}>📜 이벤트 로그</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: 4 }}
          >
            ✕
          </button>
        </div>

        {sorted.length === 0 ? (
          <div style={{ color: 'var(--text-muted, #999)', fontSize: 'var(--font-size-sm, 14px)', textAlign: 'center', padding: '24px 0' }}>
            아직 기록된 이벤트가 없어요.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sorted.map((ev, i) => (
              <div
                key={i}
                style={{
                  fontSize: 'var(--font-size-xs, 12px)',
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border, #f0f0f0)',
                  color: 'var(--text-secondary, #555)',
                }}
              >
                <span style={{ color: 'var(--accent, #ff9800)', fontWeight: 600, marginRight: 6 }}>
                  {Math.floor(ev.age)}세
                </span>
                {ev.text}
              </div>
            ))}
            {logs.length > MAX_DISPLAY && (
              <div style={{ fontSize: 'var(--font-size-xs, 12px)', color: 'var(--text-muted, #999)', textAlign: 'center', paddingTop: 8 }}>
                최근 {MAX_DISPLAY}개만 표시됩니다 (전체 {logs.length}개)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
