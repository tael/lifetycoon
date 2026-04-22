import type { Meta, StoryObj } from '@storybook/react';

function Button({
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
}: {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
  }[variant];

  const sizeClass = size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : '';

  return (
    <button
      className={`btn ${variantClass} ${sizeClass}`.trim()}
      disabled={disabled}
      onClick={onClick}
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {label}
    </button>
  );
}

const meta: Meta<typeof Button> = {
  title: '인생타이쿤/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'success'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { label: '계속하기', variant: 'primary' },
};

export const Secondary: Story = {
  args: { label: '나중에', variant: 'secondary' },
};

export const Danger: Story = {
  args: { label: '대출받기', variant: 'danger' },
};

export const Success: Story = {
  args: { label: '꿈 달성!', variant: 'success' },
};

export const Large: Story = {
  args: { label: '게임 시작', variant: 'primary', size: 'lg' },
};

export const Disabled: Story = {
  args: { label: '잠금', variant: 'primary', disabled: true },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 280 }}>
      <Button label="계속하기" variant="primary" size="lg" />
      <Button label="나중에" variant="secondary" size="lg" />
      <Button label="꿈 달성! 🎉" variant="success" size="lg" />
      <Button label="대출받기" variant="danger" size="lg" />
      <Button label="잠금 🔒" variant="primary" disabled size="lg" />
    </div>
  ),
};
