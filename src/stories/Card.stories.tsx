import type { Meta, StoryObj } from '@storybook/react';

function Card({
  title,
  content,
  variant = 'default',
  value,
  emoji,
}: {
  title: string;
  content?: string;
  variant?: 'default' | 'assets' | 'character' | 'invest' | 'bank' | 'success' | 'danger';
  value?: string;
  emoji?: string;
}) {
  const variantClass = variant !== 'default' ? `card--${variant}` : '';
  return (
    <div
      className={`card ${variantClass}`.trim()}
      style={{ width: 320 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{emoji} {title}</span>
      </div>
      {value && (
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
          {value}
        </div>
      )}
      {content && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          {content}
        </div>
      )}
    </div>
  );
}

const meta: Meta<typeof Card> = {
  title: '인생타이쿤/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: { title: '총 자산', value: '5,000만원', content: '전년 대비 +12%', emoji: '💰' },
};

export const Assets: Story = {
  args: { title: '투자 현황', value: '2,300만원', content: '주식 + 부동산', emoji: '📈', variant: 'assets' },
};

export const Character: Story = {
  args: { title: '캐릭터 스탯', content: '행복 80 · 건강 90 · 지혜 45', emoji: '😊', variant: 'character' },
};

export const Success: Story = {
  args: { title: '꿈 달성!', content: '첫 집 마련을 완료했어요', emoji: '🏠', variant: 'success' },
};

export const Danger: Story = {
  args: { title: '위기 경보!', content: '생활비가 수입을 초과하고 있어요', emoji: '🔴', variant: 'danger' },
};

export const Bank: Story = {
  args: { title: '은행 잔고', value: '1,500만원', content: '이자율 3.0% / 대출 없음', emoji: '🏦', variant: 'bank' },
};
