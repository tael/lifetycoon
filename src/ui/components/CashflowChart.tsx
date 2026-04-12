import { useState } from 'react';
import { formatWon } from '../../game/domain/asset';

type DataPoint = { age: number; netMonthly: number };

type Props = {
  data: DataPoint[];
};

export function CashflowChart({ data }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length < 2) return null;

  const chartH = 100;
  const chartW = 300;
  const stepX = chartW / (data.length - 1);

  const maxVal = Math.max(...data.map((d) => d.netMonthly), 1);
  const minVal = Math.min(...data.map((d) => d.netMonthly), -1);
  const range = maxVal - minVal || 1;

  // y 좌표: 상단 여백 8px, 하단 여백 8px
  const toY = (v: number) => 8 + ((maxVal - v) / range) * (chartH - 16);
  const zeroY = toY(0);

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: toY(d.netMonthly),
    age: d.age,
    netMonthly: d.netMonthly,
  }));

  // 양수 라인 (녹색)과 음수 라인 (빨간색)을 구분하기 위해 전체 path는 하나로 그리되
  // 색상 구분은 linearGradient 로 처리한다.
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // 0 기준선이 전체 chartH 내 어느 비율인지 (그라디언트 스톱 위치)
  const zeroRatio = Math.max(0, Math.min(1, (maxVal) / range));

  const gradId = 'cashflow-line-grad';

  return (
    <div style={{ width: '100%' }}>
      <svg
        viewBox={`-10 -4 ${chartW + 20} ${chartH + 26}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset={`${(zeroRatio * 100).toFixed(1)}%`} stopColor="var(--success, #2e7d32)" />
            <stop offset={`${(zeroRatio * 100).toFixed(1)}%`} stopColor="var(--danger, #c62828)" />
          </linearGradient>
        </defs>

        {/* 0 기준선 (점선) */}
        {minVal < 0 && maxVal > 0 && (
          <line
            x1="0"
            y1={zeroY.toFixed(1)}
            x2={chartW}
            y2={zeroY.toFixed(1)}
            stroke="#90a4ae"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        )}

        {/* 라인 */}
        <path
          d={pathD}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* 점 + 툴팁 */}
        {points.map((p, i) => {
          const isHovered = hoveredIndex === i;
          const isPositive = p.netMonthly >= 0;
          const dotColor = isPositive ? 'var(--success, #2e7d32)' : 'var(--danger, #c62828)';

          const tooltipW = 78;
          const tooltipH = 24;
          const rawTx = p.x - tooltipW / 2;
          const tx = Math.max(-10, Math.min(rawTx, chartW + 10 - tooltipW));
          const ty = p.y - tooltipH - 6;

          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="10"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  setHoveredIndex(hoveredIndex === i ? null : i);
                }}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 5 : 3}
                fill={dotColor}
                style={{ pointerEvents: 'none', transition: 'r 0.1s' }}
              />
              {/* X축 나이 레이블 (짝수 인덱스만) */}
              {i % 2 === 0 && (
                <text x={p.x} y={chartH + 16} textAnchor="middle" fontSize="8" fill="#999">
                  {p.age}세
                </text>
              )}
              {isHovered && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={tx}
                    y={ty}
                    width={tooltipW}
                    height={tooltipH}
                    rx="4"
                    fill="rgba(30,30,30,0.88)"
                  />
                  <text
                    x={tx + tooltipW / 2}
                    y={ty + 9}
                    textAnchor="middle"
                    fontSize="7"
                    fill="#fff"
                    fontWeight="bold"
                  >
                    {p.age}세
                  </text>
                  <text
                    x={tx + tooltipW / 2}
                    y={ty + 18}
                    textAnchor="middle"
                    fontSize="7"
                    fill={isPositive ? '#a5d6a7' : '#ef9a9a'}
                  >
                    {isPositive ? '+' : ''}{formatWon(p.netMonthly)}/월
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Y축 최대값 힌트 */}
        <text x={chartW + 3} y={12} fontSize="7" fill="#999" textAnchor="start">
          +{formatWon(maxVal)}
        </text>
        {minVal < 0 && (
          <text x={chartW + 3} y={chartH - 4} fontSize="7" fill="#999" textAnchor="start">
            {formatWon(minVal)}
          </text>
        )}
      </svg>
    </div>
  );
}
