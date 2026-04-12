
export type AssetSegment = {
  label: string;
  value: number;
  color: string;
  emoji: string;
};

type Props = {
  segments: AssetSegment[];
  total: number;
};

export function AssetCompositionBar({ segments, total }: Props) {
  if (total <= 0) return null;

  const positiveSegments = segments.filter((s) => s.value > 0);
  const positiveTotal = positiveSegments.reduce((sum, s) => sum + s.value, 0);

  if (positiveTotal <= 0) return null;

  return (
    <div style={{ marginTop: 8, marginBottom: 4 }}>
      <div
        style={{
          display: 'flex',
          height: 24,
          borderRadius: 6,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {positiveSegments.map((seg) => {
          const pct = (seg.value / positiveTotal) * 100;
          return (
            <div
              key={seg.label}
              title={`${seg.emoji} ${seg.label} ${pct.toFixed(1)}%`}
              style={{
                width: `${pct}%`,
                backgroundColor: seg.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {pct >= 10 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                    lineHeight: 1,
                  }}
                >
                  {Math.round(pct)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px 10px',
          marginTop: 4,
        }}
      >
        {positiveSegments.map((seg) => {
          const pct = (seg.value / positiveTotal) * 100;
          return (
            <span
              key={seg.label}
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: seg.color,
                  flexShrink: 0,
                }}
              />
              {seg.emoji} {seg.label} {Math.round(pct)}%
            </span>
          );
        })}
      </div>
    </div>
  );
}
