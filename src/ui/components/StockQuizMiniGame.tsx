import { useState, useMemo } from 'react';
import { formatWon } from '../../game/domain/asset';
import { Icon } from '../icons/Icon';

type Props = {
  seed: number;
  onClose: (result: { correct: boolean } | null) => void;
};

type StockScenario = {
  name: string;
  emoji: string;
  sector: string;
};

const STOCK_SCENARIOS: StockScenario[] = [
  { name: '서울전자', emoji: '📱', sector: '반도체' },
  { name: '한국자동차', emoji: '🚗', sector: '자동차' },
  { name: '바이오헬스', emoji: '💊', sector: '바이오' },
  { name: '에너지코리아', emoji: '⚡', sector: '에너지' },
  { name: '푸드테크', emoji: '🍕', sector: '식품' },
  { name: '게임스튜디오', emoji: '🎮', sector: '게임' },
  { name: '클라우드시스템', emoji: '☁️', sector: 'IT' },
  { name: '건설그룹', emoji: '🏗️', sector: '건설' },
];

// 결정론적 seeded random
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

type PricePoint = { year: number; price: number };

function generateChartData(rng: () => number, basePrice: number): {
  history: PricePoint[];
  futurePrice: number;
  answer: 'up' | 'down';
} {
  // 3년 과거 데이터 (분기별 12포인트)
  const history: PricePoint[] = [];
  let price = basePrice;
  for (let i = 0; i < 12; i++) {
    const drift = (rng() - 0.45) * 0.15;
    price = Math.round(price * (1 + drift));
    if (price < 1000) price = 1000;
    history.push({ year: i, price });
  }

  // 1년 후 가격 (4분기 뒤)
  let futurePrice = price;
  const futureDrift = (rng() - 0.4) * 0.25; // 약간 상승 편향
  futurePrice = Math.round(futurePrice * (1 + futureDrift));
  if (futurePrice < 1000) futurePrice = 1000;

  const answer: 'up' | 'down' = futurePrice >= price ? 'up' : 'down';
  return { history, futurePrice, answer };
}

function PriceChart({ data, width = 260, height = 100 }: { data: PricePoint[]; width?: number; height?: number }) {
  if (data.length === 0) return null;

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  const padX = 8;
  const padY = 8;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1)) * chartW;
    const y = padY + (1 - (d.price - minPrice) / range) * chartH;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  const firstPt = points[0].split(',');
  const lastPt = points[points.length - 1].split(',');

  // 그라데이션 fill 경로
  const fillPath = `M${firstPt[0]},${padY + chartH} L${polyline.replace(/(\d+\.?\d*),(\d+\.?\d*)/g, 'L$1,$2').substring(1)} L${lastPt[0]},${padY + chartH} Z`;

  const lastPrice = data[data.length - 1].price;
  const firstPrice = data[0].price;
  const isUp = lastPrice >= firstPrice;
  const lineColor = isUp ? '#ef5350' : '#42a5f5';
  const fillColor = isUp ? 'rgba(239,83,80,0.12)' : 'rgba(66,165,245,0.12)';

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={padX}
          y1={padY + t * chartH}
          x2={padX + chartW}
          y2={padY + t * chartH}
          stroke="#eee"
          strokeWidth={1}
        />
      ))}
      {/* Fill */}
      <path d={fillPath} fill={fillColor} />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Last dot */}
      <circle
        cx={parseFloat(lastPt[0])}
        cy={parseFloat(lastPt[1])}
        r={3}
        fill={lineColor}
      />
    </svg>
  );
}

export function StockQuizMiniGame({ seed, onClose }: Props) {
  const [phase, setPhase] = useState<'quiz' | 'result'>('quiz');
  const [userAnswer, setUserAnswer] = useState<'up' | 'down' | null>(null);
  const [visible, setVisible] = useState(true);

  const rng = useMemo(() => seededRandom(seed), [seed]);

  const { stock, chartData } = useMemo(() => {
    const r = seededRandom(seed);
    const stockIdx = Math.floor(r() * STOCK_SCENARIOS.length);
    const picked = STOCK_SCENARIOS[stockIdx];
    const basePrice = Math.round(10000 + r() * 90000);
    const data = generateChartData(r, basePrice);
    return { stock: picked, chartData: data };
  }, [seed, rng]);

  const handleAnswer = (choice: 'up' | 'down') => {
    setUserAnswer(choice);
    setPhase('result');
  };

  const isCorrect = userAnswer === chartData.answer;

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      if (phase === 'result') {
        onClose({ correct: isCorrect });
      } else {
        onClose(null);
      }
    }, 200);
  };

  return (
    <div
      className="modal-overlay"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="modal-content"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.9)',
          transition: 'all 0.2s ease-out',
          maxWidth: 340,
          width: '92%',
        }}
      >
        {/* 헤더 */}
        <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 'var(--sp-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.3rem' }}><Icon slot="feature-dream" size="md" /></span>
            <span style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)' }}>주식 차트 퀴즈</span>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        {phase === 'quiz' && (
          <>
            {/* 종목 정보 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 'var(--sp-sm)',
              padding: '6px 10px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
            }}>
              <span style={{ fontSize: '1.5rem' }}>{stock.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{stock.name}</div>
                <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{stock.sector} 섹터</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                  {formatWon(chartData.history[chartData.history.length - 1].price)}
                </div>
                <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>현재가</div>
              </div>
            </div>

            {/* 차트 */}
            <div style={{
              background: '#fafafa',
              borderRadius: 'var(--radius-md)',
              padding: '8px 4px 4px',
              marginBottom: 6,
              border: '1px solid #eee',
            }}>
              <div className="text-muted" style={{ fontSize: '0.6rem', textAlign: 'center', marginBottom: 2 }}>
                ← 과거 3년 주가 흐름
              </div>
              <PriceChart data={chartData.history} width={300} height={110} />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0 8px',
              }}>
                <span className="text-muted" style={{ fontSize: '0.6rem' }}>3년 전</span>
                <span className="text-muted" style={{ fontSize: '0.6rem' }}>현재</span>
              </div>
            </div>

            <p style={{ fontSize: 'var(--font-size-sm)', textAlign: 'center', margin: '10px 0 12px', fontWeight: 600 }}>
              <Icon slot="nav-invest" size="md" /> 1년 후 이 주식 가격은?
            </p>

            {/* 선택 버튼 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={() => handleAnswer('up')}
                style={{
                  padding: '14px 8px',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid #ef5350',
                  background: '#fff5f5',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 'var(--font-size-lg)',
                  color: '#ef5350',
                  transition: 'transform 0.1s',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <Icon slot="nav-invest" size="md" /> 상승
              </button>
              <button
                onClick={() => handleAnswer('down')}
                style={{
                  padding: '14px 8px',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid #42a5f5',
                  background: '#f0f8ff',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 'var(--font-size-lg)',
                  color: '#42a5f5',
                  transition: 'transform 0.1s',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <Icon slot="eco-slump" size="md" /> 하락
              </button>
            </div>
          </>
        )}

        {phase === 'result' && (
          <>
            {/* 결과 헤더 */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--sp-md)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 4 }}>
                {isCorrect ? '🎉' : '😅'}
              </div>
              <div style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)', marginBottom: 4 }}>
                {isCorrect ? '정답!' : '오답!'}
              </div>
              <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                {chartData.answer === 'up'
                  ? `${stock.name}은 1년 후 상승했어요 📈`
                  : `${stock.name}은 1년 후 하락했어요 📉`}
              </div>
            </div>

            {/* 가격 비교 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: 8,
              alignItems: 'center',
              marginBottom: 'var(--sp-md)',
              padding: '12px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>현재가</div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                  {formatWon(chartData.history[chartData.history.length - 1].price)}
                </div>
              </div>
              <div style={{ fontSize: '1.2rem' }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>1년 후</div>
                <div style={{
                  fontWeight: 700,
                  fontSize: 'var(--font-size-sm)',
                  color: chartData.answer === 'up' ? '#ef5350' : '#42a5f5',
                }}>
                  {formatWon(chartData.futurePrice)}
                </div>
              </div>
            </div>

            {/* 보상 */}
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: isCorrect ? '#f1f8e9' : '#fff8e1',
              border: `1px solid ${isCorrect ? '#aed581' : '#ffe082'}`,
              marginBottom: 'var(--sp-md)',
            }}>
              {isCorrect ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>획득 보상</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', display: 'flex', gap: 12 }}>
                    <span><Icon slot="stat-wisdom" size="md" /> 지혜 +5</span>
                    <span><Icon slot="asset-total" size="md" /> 현금 +10만원</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>교훈 획득</div>
                  <div style={{ fontSize: 'var(--font-size-sm)' }}>
                    <span><Icon slot="stat-wisdom" size="md" /> 지혜 +2  (실패도 배움이에요!)</span>
                  </div>
                </div>
              )}
            </div>

            <button className="btn btn-primary btn-block" onClick={handleClose}>
              확인
            </button>
          </>
        )}
      </div>
    </div>
  );
}
