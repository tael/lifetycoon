import type { Meta, StoryObj } from '@storybook/react';

function ColorSwatch({ name, var: varName, hex }: { name: string; var: string; hex: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `var(${varName}, ${hex})`,
          border: '2px solid rgba(0,0,0,0.08)',
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
        <div style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>{varName}</div>
        <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>{hex}</div>
      </div>
    </div>
  );
}

function ThemeShowcase() {
  return (
    <div style={{ padding: 24, maxWidth: 400, fontFamily: 'var(--font-main)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>🎨 인생타이쿤 × Duolingo 컬러 팔레트</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
        Duolingo 디자인 시스템 기반 색상 체계
      </p>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>주 색상 (Primary)</h3>
        <ColorSwatch name="듀오 그린 (성공/정답)" var="--success" hex="#58CC02" />
        <ColorSwatch name="듀오 레드 (위험/오답)" var="--danger" hex="#FF4B4B" />
        <ColorSwatch name="듀오 블루 (정보)" var="--info" hex="#1CB0F6" />
        <ColorSwatch name="듀오 옐로우 (보상/경고)" var="--warning" hex="#FFC800" />
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>액센트</h3>
        <ColorSwatch name="듀오 그린 (액센트)" var="--accent" hex="#58CC02" />
        <ColorSwatch name="보조 액센트 (보라)" var="--accent-secondary" hex="#7C3AED" />
        <ColorSwatch name="골드 (S등급)" var="--grade-s" hex="#FFD700" />
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>배경 & 표면</h3>
        <ColorSwatch name="주 배경" var="--bg-primary" hex="#FAF7F2" />
        <ColorSwatch name="카드 배경" var="--bg-card" hex="#FFFFFF" />
        <ColorSwatch name="보조 배경" var="--bg-secondary" hex="#FFF8E8" />
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>버튼 3D 효과</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-primary btn-lg" style={{ fontFamily: 'var(--font-display)' }}>계속하기</button>
          <button className="btn btn-secondary btn-lg">나중에</button>
          <button className="btn btn-danger btn-lg">대출받기</button>
          <button className="btn btn-success btn-lg">꿈 달성! 🎉</button>
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>카드</h3>
        <div className="card" style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>💰 총 자산</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>5,000만원</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>전년 대비 +12%</div>
        </div>
        <div className="card" style={{ border: '2px solid var(--success)', background: 'var(--section-assets)' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>✅ 꿈 달성!</div>
          <div style={{ color: 'var(--success)', fontWeight: 700 }}>첫 집 마련 완료</div>
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof ThemeShowcase> = {
  title: '인생타이쿤/Duolingo 테마',
  component: ThemeShowcase,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof ThemeShowcase>;

export const ColorPalette: Story = {};
