import { formatWon } from '../../game/domain/asset';
import type { CashflowBreakdown } from '../../game/domain/cashflow';

type Props = {
  data: CashflowBreakdown;
  /** 현재 나이 — 유년기 힌트 표시용 (V3-13). 없으면 힌트 미노출. */
  age?: number;
};

/**
 * 은행 탭 최상단 — 올해 캐시플로를 손익계산서 스타일로 해체한다.
 *
 * 톤: 드라이한 팩트 전달. 칭찬·격려 금지. "자동수입이 월 지출을 넘으면
 * 일하지 않아도 생활이 가능합니다" 수준의 중립적 시스템 메시지만 사용.
 */
export function CashflowPanel({ data, age }: Props) {
  const {
    income,
    expense,
    totalIncome,
    totalExpense,
    netCashflow,
    passiveIncome,
    freedomRatio,
    financiallyFree,
  } = data;

  // 연 단위 → 월 단위 환산 (UI 표시용)
  const monthly = (v: number) => Math.round(v / 12);

  const netPositive = netCashflow >= 0;
  const ratioPct = Math.round(freedomRatio * 100);
  const barPct = Math.min(100, Math.max(0, ratioPct));
  const barColor = financiallyFree ? 'var(--success)' : 'var(--accent)';

  return (
    <div
      className="card"
      style={{
        border: '2px solid var(--accent)',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #fff 40%)',
        padding: 'var(--sp-md)',
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 'var(--font-size-base)',
          marginBottom: 'var(--sp-sm)',
        }}
      >
        💰 이달의 현금흐름
      </div>
      {/* V3-13: 유년기 힌트 — 월급이 아니라 부모 용돈이 주 수입이라는 점을 안내 */}
      {age != null && Math.floor(age) >= 10 && Math.floor(age) < 19 && (
        <div
          style={{
            fontSize: '0.62rem',
            color: 'var(--text-muted)',
            marginBottom: 4,
            lineHeight: 1.4,
          }}
        >
          유년기에는 월급 대신 부모님이 용돈을 주고, 그중 일부가 학원비로 나갑니다.
        </div>
      )}

      {/* Income 섹션 */}
      <Section
        title="수입"
        totalLabel={`+${formatWon(monthly(totalIncome))}`}
        totalColor="var(--success)"
      >
        {income.length === 0 ? (
          <EmptyRow text="이달 들어올 수입이 없습니다" />
        ) : (
          income.map((it) => (
            <Row
              key={it.label}
              emoji={it.emoji}
              label={it.label}
              amount={`+${formatWon(monthly(it.amount))}`}
              color="var(--success)"
              tag={it.passive ? '자동' : undefined}
            />
          ))
        )}
      </Section>

      {/* Expense 섹션 */}
      <Section
        title="지출"
        totalLabel={`-${formatWon(monthly(totalExpense))}`}
        totalColor="var(--danger, #c62828)"
      >
        {expense.length === 0 ? (
          <EmptyRow text="이달 나갈 고정 지출이 없습니다" />
        ) : (
          expense.map((it) => (
            <Row
              key={it.label}
              emoji={it.emoji}
              label={it.label}
              amount={`-${formatWon(monthly(it.amount))}`}
              color="var(--danger, #c62828)"
            />
          ))
        )}
      </Section>

      {/* 구분선 + 순현금흐름 */}
      <div
        style={{
          borderTop: '1px dashed #cfd8dc',
          marginTop: 'var(--sp-sm)',
          paddingTop: 'var(--sp-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
          순현금흐름
        </span>
        <span
          style={{
            fontWeight: 800,
            fontSize: 'var(--font-size-base)',
            color: netPositive ? 'var(--success)' : 'var(--danger, #c62828)',
          }}
        >
          {netPositive ? '+' : '-'}
          {formatWon(Math.abs(monthly(netCashflow)))} {netPositive ? '🟢' : '🔴'}
        </span>
      </div>

      {/* 자동수입 바 */}
      <div style={{ marginTop: 'var(--sp-md)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 'var(--font-size-xs)',
            marginBottom: 4,
          }}
        >
          <span style={{ fontWeight: 700 }}>
            자동수입 / 월 지출
          </span>
          <span
            style={{
              fontWeight: 700,
              color: financiallyFree ? 'var(--success)' : 'var(--text-muted)',
            }}
          >
            {ratioPct}% ({formatWon(monthly(passiveIncome))} / {formatWon(monthly(totalExpense))})
          </span>
        </div>
        <div
          style={{
            height: 10,
            borderRadius: 5,
            background: '#e0e7ef',
            overflow: 'hidden',
            position: 'relative',
          }}
          role="progressbar"
          aria-valuenow={ratioPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="자동수입 비율"
        >
          <div
            style={{
              height: '100%',
              width: `${barPct}%`,
              background: barColor,
              transition: 'width 0.5s ease',
            }}
          />
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 'var(--font-size-xs)',
            fontWeight: 700,
            color: financiallyFree ? 'var(--success)' : 'var(--text-muted)',
          }}
        >
          {financiallyFree ? '재정 자유 도달' : '자동수입만으로는 부족'}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: '0.62rem',
            color: 'var(--text-muted)',
            lineHeight: 1.4,
          }}
        >
          자동수입이 지출을 넘으면 일하지 않아도 생활이 가능합니다.
        </div>
      </div>
    </div>
  );
}

function Section(props: {
  title: string;
  totalLabel: string;
  totalColor: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 'var(--sp-xs)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 700,
          color: 'var(--text-muted)',
          marginTop: 'var(--sp-xs)',
          marginBottom: 2,
        }}
      >
        <span>{props.title}</span>
        <span style={{ color: props.totalColor }}>{props.totalLabel}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {props.children}
      </div>
    </div>
  );
}

function Row(props: {
  emoji: string;
  label: string;
  amount: string;
  color: string;
  tag?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 'var(--font-size-sm)',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{props.emoji}</span>
        <span>{props.label}</span>
        {props.tag && (
          <span
            style={{
              fontSize: '0.58rem',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 'var(--radius-full)',
              background: '#e3f2fd',
              color: '#1565c0',
            }}
          >
            {props.tag}
          </span>
        )}
      </span>
      <span style={{ fontWeight: 700, color: props.color }}>{props.amount}</span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 'var(--font-size-xs)',
        color: 'var(--text-muted)',
        padding: '2px 0',
      }}
    >
      {text}
    </div>
  );
}
