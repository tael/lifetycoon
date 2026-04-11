import { getAllAchievements, loadUnlocked } from '../../game/domain/achievements';

interface Props {
  onClose: () => void;
}

export function AchievementsModal({ onClose }: Props) {
  const allAchievements = getAllAchievements();
  const unlocked = loadUnlocked();
  const unlockedIds = new Set(unlocked.map((u) => u.id));
  const unlockedCount = unlockedIds.size;
  const totalCount = allAchievements.length;
  const percent = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievements-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content" style={{ animation: 'modalPop 0.25s ease-out', maxWidth: 480, width: '100%' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-md)' }}>
          <h2
            id="achievements-modal-title"
            style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, margin: 0 }}
          >
            🏆 업적
          </h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              fontSize: 'var(--font-size-lg)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              lineHeight: 1,
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* 진행률 */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 'var(--sp-lg)',
            padding: 'var(--sp-sm) var(--sp-md)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
            {unlockedCount}/{totalCount} 해금 · {percent}%
          </span>
          <div
            style={{
              marginTop: 'var(--sp-xs)',
              height: 6,
              background: 'var(--accent-light, #ffe0b2)',
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${percent}%`,
                background: 'var(--accent, #ff9800)',
                borderRadius: 99,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* 업적 그리드 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--sp-sm)',
            maxHeight: '60dvh',
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {allAchievements.map((a) => {
            const isUnlocked = unlockedIds.has(a.id);
            return (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--sp-xs)',
                  padding: 'var(--sp-sm)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: isUnlocked ? '1.5px solid var(--accent-light, #ffe0b2)' : '1.5px solid transparent',
                  filter: isUnlocked ? 'none' : 'grayscale(1)',
                  opacity: isUnlocked ? 1 : 0.45,
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '2rem', lineHeight: 1 }} role="img" aria-label={isUnlocked ? a.title : '잠긴 업적'}>
                  {a.emoji}
                </span>
                <span style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)', lineHeight: 1.3 }}>
                  {isUnlocked ? a.title : '???'}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                  {isUnlocked ? a.description : '???'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
