import { useState } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { CashflowPanel } from '../../components/CashflowPanel';
import { CashflowChart } from '../../components/CashflowChart';
import { formatWon } from '../../../game/domain/asset';
import type { CashflowBreakdown } from '../../../game/domain/cashflow';

export function CashflowTab({
  cashflow,
  totalTaxPaid,
}: {
  cashflow: CashflowBreakdown;
  totalTaxPaid: number;
}) {
  const character = useGameStore((s) => s.character);
  const cashflowHistory = useGameStore((s) => s.cashflowHistory);
  const [cashflowChartExpanded, setCashflowChartExpanded] = useState(false);

  return (
    <>
      {/* Cashflow Panel */}
      <CashflowPanel data={cashflow} age={character.age} />

      {/* 현금흐름 추이 차트 (접이식) */}
      <div className="card" style={{ padding: 'var(--sp-sm)' }}>
        <button
          onClick={() => setCashflowChartExpanded((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>📈 현금흐름 추이</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            {cashflowChartExpanded ? '접기 ▲' : '보기 ▼'}
          </span>
        </button>
        {cashflowChartExpanded && (
          cashflowHistory.length < 2 ? (
            <div style={{ marginTop: 'var(--sp-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
              데이터 수집 중…
            </div>
          ) : (
            <div style={{ marginTop: 'var(--sp-sm)' }}>
              <CashflowChart data={cashflowHistory} />
            </div>
          )
        )}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          textAlign: 'right',
          padding: '0 4px',
        }}
      >
        지금까지 낸 세금: {formatWon(totalTaxPaid)}
      </div>
    </>
  );
}
