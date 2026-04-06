import { formatWon } from '../../game/domain/asset';

type Props = {
  data: { age: number; value: number }[];
};

export function AssetChart({ data }: Props) {
  if (data.length < 2) return null;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const chartH = 80;
  const chartW = 300;
  const stepX = chartW / (data.length - 1);

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: chartH - (d.value / maxVal) * chartH * 0.9 - 4,
    age: d.age,
    value: d.value,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaD = pathD + ` L ${points[points.length - 1].x} ${chartH} L 0 ${chartH} Z`;

  return (
    <div style={{ width: '100%', maxWidth: 340, margin: '0 auto' }}>
      <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--sp-xs)', textAlign: 'center' }}>
        📊 자산 추이
      </div>
      <svg viewBox={`-10 -10 ${chartW + 20} ${chartH + 30}`} style={{ width: '100%', height: 'auto' }}>
        {/* Area fill */}
        <path d={areaD} fill="rgba(255,112,67,0.15)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="var(--accent)" />
            {i % 2 === 0 && (
              <text x={p.x} y={chartH + 14} textAnchor="middle" fontSize="8" fill="#999">
                {p.age}세
              </text>
            )}
          </g>
        ))}
        {/* Max label */}
        <text x={chartW + 5} y={8} fontSize="7" fill="#999" textAnchor="start">
          {formatWon(maxVal)}
        </text>
      </svg>
    </div>
  );
}
