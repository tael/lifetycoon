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
          maxWidth: 380,
          maxHeight: '80dvh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 'var(--sp-sm)' }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>🎓 스킬</span>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--accent)' }}>
            📘 지혜 {Math.floor(wisdom)}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SKILLS.map((skill) => {
            const unlocked = unlockedSkills.includes(skill.id);
            const canUnlock = !unlocked && wisdom >= skill.wisdomCost;
            const bgColor = unlocked ? '#e8f5e9' : canUnlock ? '#fff3e0' : '#f5f5f5';
            const borderColor = unlocked ? '#66bb6a' : canUnlock ? '#ffa726' : '#e0e0e0';
            const textColor = unlocked ? '#2e7d32' : canUnlock ? '#e65100' : '#9e9e9e';

            return (
              <div
                key={skill.id}
                style={{
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--sp-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{skill.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: textColor }}>
                    {skill.name}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    {skill.description}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: textColor, marginTop: 2 }}>
                    📘 지혜 {skill.wisdomCost} 필요
                  </div>
                </div>
                {unlocked ? (
                  <span style={{ fontSize: '1.2rem' }}>✅</span>
                ) : (
                  <button
                    disabled={!canUnlock}
                    onClick={() => {
                      const ok = unlockSkill(skill.id);
                      if (ok) showToast(`${skill.name} 해금!`, skill.emoji, 'success', 2000);
                      else showToast('지혜가 부족해요', '📘', 'warning', 1500);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      cursor: canUnlock ? 'pointer' : 'not-allowed',
                      fontWeight: 700,
                      fontSize: 'var(--font-size-xs)',
                      background: canUnlock ? '#ffa726' : '#e0e0e0',
                      color: canUnlock ? '#fff' : '#9e9e9e',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    해금
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: 'var(--sp-sm)',
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
