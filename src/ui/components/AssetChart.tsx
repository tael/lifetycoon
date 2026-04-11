import { useState } from 'react';
import { formatWon } from '../../game/domain/asset';

type Props = {
  data: { age: number; value: number }[];
};

export function AssetChart({ data }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length < 2) return null;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value));
  const chartH = 80;
  const chartW = 300;
  const stepX = chartW / (data.length - 1);

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: chartH - (d.value / maxVal) * chartH * 0.9 - 4,
    age: d.age,
    value: d.value,
  }));

  const maxIndex = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const minIndex = data.reduce((best, d, i) => (d.value < data[best].value ? i : best), 0);

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaD = pathD + ` L ${points[points.length - 1].x} ${chartH} L 0 ${chartH} Z`;

  return (
    <div style={{ width: '100%', maxWidth: 340, margin: '0 auto' }}>
      <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--sp-xs)', textAlign: 'center' }}>
        📊 자산 추이
      </div>
      <svg
        viewBox={`-10 -10 ${chartW + 20} ${chartH + 30}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      >
        {/* Area fill */}
        <path d={areaD} fill="rgba(255,112,67,0.15)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        {/* Dots */}
        {points.map((p, i) => {
          const isHovered = hoveredIndex === i;
          const isMax = i === maxIndex;
          const isMin = i === minIndex && minVal !== maxVal;

          // Tooltip position clamped to stay inside viewBox
          const tooltipW = 70;
          const tooltipH = 22;
          const rawTx = p.x - tooltipW / 2;
          const tx = Math.max(-10, Math.min(rawTx, chartW + 10 - tooltipW));
          const ty = p.y - tooltipH - 6;

          return (
            <g key={i}>
              {/* Invisible hit area for easier hover/touch */}
              <circle
                cx={p.x}
                cy={p.y}
                r="12"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  setHoveredIndex(hoveredIndex === i ? null : i);
                }}
              />
              {/* Visible dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6 : 4}
                fill="var(--accent)"
                style={{ pointerEvents: 'none', transition: 'r 0.1s' }}
              />
              {/* Age label */}
              {i % 2 === 0 && (
                <text x={p.x} y={chartH + 14} textAnchor="middle" fontSize="8" fill="#999">
                  {p.age}세
                </text>
              )}
              {/* Max/min emoji markers */}
              {isMax && (
                <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" style={{ pointerEvents: 'none' }}>
                  📈
                </text>
              )}
              {isMin && (
                <text x={p.x} y={p.y + 18} textAnchor="middle" fontSize="10" style={{ pointerEvents: 'none' }}>
                  📉
                </text>
              )}
              {/* Tooltip */}
              {isHovered && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={tx}
                    y={ty}
                    width={tooltipW}
                    height={tooltipH}
                    rx="4"
                    fill="rgba(30,30,30,0.85)"
                  />
                  <text
                    x={tx + tooltipW / 2}
                    y={ty + 8.5}
                    textAnchor="middle"
                    fontSize="7"
                    fill="#fff"
                    fontWeight="bold"
                  >
                    {p.age}세
                  </text>
                  <text
                    x={tx + tooltipW / 2}
                    y={ty + 17}
                    textAnchor="middle"
                    fontSize="7"
                    fill="#ffb299"
                  >
                    {formatWon(p.value)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {/* Max label */}
        <text x={chartW + 5} y={8} fontSize="7" fill="#999" textAnchor="start">
          {formatWon(maxVal)}
        </text>
      </svg>
    </div>
  );
}
