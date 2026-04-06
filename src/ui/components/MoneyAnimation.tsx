import { useEffect, useState } from 'react';

type MoneyPopProps = {
  amount: number;
  x?: string;
  y?: string;
};

export function MoneyPop({ amount, x = '50%', y = '50%' }: MoneyPopProps) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  const isPositive = amount >= 0;
  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        transform: 'translateX(-50%)',
        zIndex: 150,
        pointerEvents: 'none',
        animation: 'moneyFloat 1.2s ease-out forwards',
        fontSize: '1.2rem',
        fontWeight: 800,
        color: isPositive ? 'var(--success)' : 'var(--danger)',
        textShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }}
    >
      {isPositive ? '+' : ''}{formatCompact(amount)}
      <style>{`
        @keyframes moneyFloat {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-60px); }
        }
      `}</style>
    </div>
  );
}

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (abs >= 10000) return `${(n / 10000).toFixed(0)}만`;
  return n.toLocaleString();
}

// Confetti burst for achievements
export function ConfettiBurst() {
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.3,
      color: ['#ffd700', '#ff7043', '#42a5f5', '#4caf50', '#e91e63'][i % 5],
      size: 4 + Math.random() * 6,
    })),
  );
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '-10px',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            animation: `confettiFall 1.8s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
