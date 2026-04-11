import { SKILLS } from '../../game/domain/skills';
import { useGameStore } from '../../store/gameStore';
import { showToast } from '../components/Toast';

type Props = {
  onClose: () => void;
};

export function SkillModal({ onClose }: Props) {
  const wisdom = useGameStore((s) => s.character.wisdom);
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const unlockSkill = useGameStore((s) => s.unlockSkill);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--sp-md)',
          width: '100%',
          maxWidth: 400,
          maxHeight: '85dvh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 'var(--sp-md)' }}>
          <span style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)' }}>🎓 스킬</span>
          <span
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--accent)',
              fontWeight: 700,
              background: '#e8f0fe',
              padding: '4px 10px',
              borderRadius: '999px',
            }}
          >
            📘 지혜 {Math.floor(wisdom)}
          </span>
        </div>

        {/* 스킬 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SKILLS.map((skill) => {
            const unlocked = unlockedSkills.includes(skill.id);
            const canUnlock = !unlocked && wisdom >= skill.wisdomCost;
            const lacking = !unlocked && !canUnlock;
            const needed = Math.ceil(skill.wisdomCost - wisdom);

            const bgColor = unlocked ? '#e8f5e9' : canUnlock ? '#fff8e1' : '#fafafa';
            const borderColor = unlocked ? '#43a047' : canUnlock ? '#ffa726' : '#e0e0e0';
            const borderWidth = unlocked ? 2 : canUnlock ? 2 : 1;
            const titleColor = unlocked ? '#2e7d32' : canUnlock ? '#e65100' : '#757575';

            return (
              <div
                key={skill.id}
                style={{
                  background: bgColor,
                  border: `${borderWidth}px solid ${borderColor}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                {/* 이모지 */}
                <span
                  style={{
                    fontSize: '2rem',
                    lineHeight: 1,
                    flexShrink: 0,
                    filter: lacking ? 'grayscale(80%)' : 'none',
                  }}
                >
                  {skill.emoji}
                </span>

                {/* 텍스트 영역 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 'var(--font-size-sm)',
                      color: titleColor,
                      marginBottom: 2,
                    }}
                  >
                    {skill.name}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: lacking ? '#9e9e9e' : 'var(--text-secondary)',
                      marginBottom: 6,
                    }}
                  >
                    {skill.description}
                  </div>

                  {/* 상태 표시 */}
                  {unlocked ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 700,
                        color: '#2e7d32',
                        background: '#c8e6c9',
                        padding: '3px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      ✓ 해금됨
                    </span>
                  ) : canUnlock ? (
                    <button
                      onClick={() => {
                        const ok = unlockSkill(skill.id);
                        if (ok) showToast(`${skill.name} 해금!`, skill.emoji, 'success', 2000);
                        else showToast('지혜가 부족해요', '📘', 'warning', 1500);
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 'var(--font-size-xs)',
                        background: '#ffa726',
                        color: '#fff',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      📘 지혜 {skill.wisdomCost} 사용하여 해금
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: '#9e9e9e',
                        fontWeight: 600,
                      }}
                    >
                      📘 지혜 {needed} 더 필요 (필요: {skill.wisdomCost})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          style={{
            marginTop: 'var(--sp-md)',
            width: '100%',
            padding: 'var(--sp-sm)',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
