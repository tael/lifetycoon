import type { Meta, StoryObj } from '@storybook/react';

function StatGauge({
  label,
  value,
  maxValue = 100,
  color = 'var(--success)',
  shadowColor = 'var(--success-shadow)',
  emoji,
}: {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
  shadowColor?: string;
  emoji?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / maxValue) * 100));

  return (
    <div style={{ width: 300, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          {emoji} {label}
        </span>
        <span style={{ fontWeight: 800, fontSize: 14, color }}>{value}/{maxValue}</span>
      </div>
      {/* Duolingo-style progress bar */}
      <div
        style={{
          width: '100%',
          height: 20,
          background: 'var(--surface-3, #f5f5f5)',
          borderRadius: 9999,
          overflow: 'hidden',
          border: '2px solid rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
            borderRadius: 9999,
            transition: 'width 400ms ease-out',
            boxShadow: `inset 0 -3px 0 ${shadowColor}, inset 0 3px 0 rgba(255,255,255,0.3)`,
          }}
        />
      </div>
    </div>
  );
}

const meta: Meta<typeof StatGauge> = {
  title: '인생타이쿤/StatGauge',
  component: StatGauge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof StatGauge>;

export const Happiness: Story = {
  args: { label: '행복도', value: 75, emoji: '💛', color: '#ffc800', shadowColor: '#e6a800' },
};

export const Health: Story = {
  args: { label: '건강', value: 88, emoji: '❤️', color: '#ff4b4b', shadowColor: '#cc3c3c' },
};

export const Wisdom: Story = {
  args: { label: '지혜', value: 45, emoji: '📘', color: '#1cb0f6', shadowColor: '#1899d6' },
};

export const Charisma: Story = {
  args: { label: '매력', value: 62, emoji: '✨', color: '#ce82ff', shadowColor: '#a855f7' },
};

export const AllStats: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <StatGauge label="행복도" value={75} emoji="💛" color="#ffc800" shadowColor="#e6a800" />
      <StatGauge label="건강" value={88} emoji="❤️" color="#ff4b4b" shadowColor="#cc3c3c" />
      <StatGauge label="지혜" value={45} emoji="📘" color="#1cb0f6" shadowColor="#1899d6" />
      <StatGauge label="매력" value={62} emoji="✨" color="#ce82ff" shadowColor="#a855f7" />
    </div>
  ),
};

export const LowHealth: Story = {
  args: { label: '건강 (위험!)', value: 15, emoji: '❤️', color: '#ff4b4b', shadowColor: '#cc3c3c' },
};
