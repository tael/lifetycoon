import { useState, useEffect } from 'react';
import { formatWon } from '../../game/domain/asset';

type MilestoneProps = {
  age: number;
  totalAssets: number;
  dreamsAchieved: number;
  totalDreams: number;
  happiness: number;
  onClose: () => void;
};

const MILESTONE_AGES = [20, 30, 40, 50, 60, 70, 80, 90];
const AGE_TITLES: Record<number, string> = {
  20: '🎓 성인이 되었어!',
  30: '💼 30대 시작!',
  40: '🏆 인생 중반전!',
  50: '🧭 50대 진입!',
  60: '🌅 60대, 황금기!',
  70: '🎋 70대, 지혜의 시대!',
  80: '🌟 80대, 전설이 되어가!',
  90: '👑 90대, 거의 완주!',
};

export function isMilestoneAge(age: number): boolean {
  return MILESTONE_AGES.includes(age);
}

export function MilestonePopup({ age, totalAssets, dreamsAchieved, totalDreams, happiness, onClose }: MilestoneProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  const title = AGE_TITLES[age] ?? `${age}세!`;

  return (
    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="modal-content text-center"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.85)',
          transition: 'all 0.3s ease-out',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎉</div>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, marginBottom: 4 }}>
          {title}
        </h2>
        <p className="text-muted" style={{ marginBottom: 'var(--sp-lg)' }}>
          {age}세 인생 중간 점검
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 'var(--sp-lg)',
        }}>
          <StatBox emoji="💰" label="총 자산" value={formatWon(totalAssets)} />
          <StatBox emoji="😊" label="행복도" value={`${Math.round(happiness)}`} />
          <StatBox emoji="🌟" label="꿈 달성" value={`${dreamsAchieved}/${totalDreams}`} />
          <StatBox emoji="📅" label="남은 인생" value={`${100 - age}년`} />
        </div>
        <button className="btn btn-primary btn-block" onClick={onClose}>
          계속 살아가기! 💪
        </button>
      </div>
    </div>
  );
}

function StatBox({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--sp-sm)',
    }}>
      <div style={{ fontSize: '1.5rem' }}>{emoji}</div>
      <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>{value}</div>
      <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{label}</div>
    </div>
  );
}
