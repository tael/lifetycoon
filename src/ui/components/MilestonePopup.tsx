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
        <div style={{
          background: '#e8f5e9',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 12px',
          marginBottom: 'var(--sp-md)',
          fontSize: 'var(--font-size-xs)',
          color: '#2e7d32',
          textAlign: 'left',
        }}>
          💡 {getMilestoneAdvice(age, totalAssets, dreamsAchieved, totalDreams)}
        </div>
        <button className="btn btn-primary btn-block" onClick={onClose}>
          계속 살아가기! 💪
        </button>
      </div>
    </div>
  );
}

function getMilestoneAdvice(age: number, totalAssets: number, dreamsAchieved: number, totalDreams: number): string {
  const ratio = dreamsAchieved / Math.max(1, totalDreams);
  if (age === 20) {
    return totalAssets > 0 ? '어른이 됐어요! 지금부터 월급의 30%는 저축해봐요. 복리가 시작됩니다!' : '첫 번째 월급을 받으면 바로 저축부터 시작해보세요!';
  }
  if (age === 30) {
    return totalAssets >= 100_000_000 ? '벌써 1억! 이 속도라면 40대에 큰 부자가 될 수 있어요.' : '30대는 자산을 키우기 최고의 시기예요. 투자를 늘려봐요!';
  }
  if (age === 40) {
    return ratio >= 0.5 ? '꿈의 절반을 이뤘어요! 나머지도 도전해봐요.' : '복리의 마법이 시작됩니다. 지금 투자한 돈이 스스로 불어나요!';
  }
  if (age === 50) {
    return totalAssets >= 500_000_000 ? '5억 달성! 은퇴 준비가 잘 되고 있네요.' : '은퇴까지 10-15년! 지금이 마지막 저축 기회예요.';
  }
  if (age === 60) {
    return '황금기에 접어들었어요! 지금까지 쌓아온 자산이 빛을 발할 때예요.';
  }
  if (age === 70) {
    return dreamsAchieved >= totalDreams ? '모든 꿈을 이뤘어요! 전설적인 인생이에요.' : `꿈 ${dreamsAchieved}/${totalDreams}개 달성. 남은 꿈에 도전해봐요!`;
  }
  return '인생의 지혜를 나누며 아름답게 나이 들어가고 있어요.';
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
