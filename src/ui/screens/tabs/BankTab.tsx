import { useState } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { CashflowPanel } from '../../components/CashflowPanel';
import { CashflowChart } from '../../components/CashflowChart';
import { formatWon } from '../../../game/domain/asset';
import { showToast } from '../../components/Toast';
import type { CashflowBreakdown } from '../../../game/domain/cashflow';

export function BankTab({
  cashflow,
  effectiveInterestRate,
  totalAssets,
  stocksValue,
  realEstateValue,
  stockReturnPct,
  assetDelta,
}: {
  cashflow: CashflowBreakdown;
  effectiveInterestRate: number;
  totalAssets: number;
  stocksValue: number;
  realEstateValue: number;
  stockReturnPct: string | undefined;
  assetDelta: number;
}) {
  const cash = useGameStore((s) => s.cash);
  const bank = useGameStore((s) => s.bank);
  const realEstate = useGameStore((s) => s.realEstate);
  const deposit = useGameStore((s) => s.deposit);
  const withdraw = useGameStore((s) => s.withdraw);
  const takeLoan = useGameStore((s) => s.takeLoan);
  const repayLoan = useGameStore((s) => s.repayLoan);
  const loanHistory = useGameStore((s) => s.loanHistory);
  const insurance = useGameStore((s) => s.insurance);
  const toggleInsurance = useGameStore((s) => s.toggleInsurance);
  const totalTaxPaid = useGameStore((s) => s.totalTaxPaid);
  const character = useGameStore((s) => s.character);

  const cashflowHistory = useGameStore((s) => s.cashflowHistory);
  const [loanHistoryExpanded, setLoanHistoryExpanded] = useState(false);
  const [cashflowChartExpanded, setCashflowChartExpanded] = useState(false);

  const loanLimit = Math.max(0, Math.floor(totalAssets * 0.5) - bank.loanBalance);
  const maxRepay = Math.min(cash, bank.loanBalance);

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

      {/* Assets 상세 */}
      <div className="card">
        <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 'var(--sp-sm)' }}>
          <span style={{ fontWeight: 700 }}>💰 자산</span>
          <span>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatWon(totalAssets)}</span>
            {assetDelta !== 0 && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: assetDelta > 0 ? 'var(--success)' : 'var(--danger)', marginLeft: 4 }}>
                {assetDelta > 0 ? '▲' : '▼'}{formatWon(Math.abs(assetDelta))}
              </span>
            )}
          </span>
        </div>
        <div className="flex flex-col gap-xs">
          <AssetRow label="현금" value={cash} />
          <AssetRow label="예금" value={bank.balance} extra={`연 ${(effectiveInterestRate * 100).toFixed(1)}%`} />
          <AssetRow label="주식" value={stocksValue} extra={stockReturnPct} />
          {realEstateValue > 0 && (
            <AssetRow label="부동산" value={realEstateValue} extra={`${realEstate.length}채`} />
          )}
          <div className="flex flex-between" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: bank.loanBalance > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
              💳 대출
            </span>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: bank.loanBalance > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
              {bank.loanBalance > 0 ? `-${formatWon(bank.loanBalance)}` : '0원'}
              {bank.loanBalance > 0 && (
                <span style={{ fontWeight: 400, fontSize: 'var(--font-size-xs)', marginLeft: 4 }}>
                  연 {(bank.loanInterestRate * 100).toFixed(1)}%
                </span>
              )}
            </span>
          </div>
        </div>

        {/* 입금 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, marginTop: 'var(--sp-sm)' }}>
          <QuickActionBtn label="입금 100만" onClick={() => {
            if (deposit(1000000)) showToast('100만원 입금!', '🏦', 'info', 1200);
          }} disabled={cash < 1000000} />
          <QuickActionBtn label="입금 500만" onClick={() => {
            if (deposit(5000000)) showToast('500만원 입금!', '🏦', 'info', 1200);
          }} disabled={cash < 5000000} />
          <QuickActionBtn label="입금 1천만" onClick={() => {
            if (deposit(10000000)) showToast('1,000만원 입금!', '🏦', 'success', 1200);
          }} disabled={cash < 10000000} />
          <QuickActionBtn label="전액 입금" onClick={() => {
            if (cash > 0 && deposit(cash)) showToast(`${formatWon(cash)} 입금!`, '🏦', 'success', 1200);
          }} disabled={cash <= 0} />
        </div>
        {/* 출금 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, marginTop: 4 }}>
          <QuickActionBtn label="출금 100만" onClick={() => {
            if (withdraw(1000000)) showToast('100만원 출금!', '💸', 'info', 1200);
          }} disabled={bank.balance < 1000000} />
          <QuickActionBtn label="출금 500만" onClick={() => {
            if (withdraw(5000000)) showToast('500만원 출금!', '💸', 'info', 1200);
          }} disabled={bank.balance < 5000000} />
          <QuickActionBtn label="출금 1천만" onClick={() => {
            if (withdraw(10000000)) showToast('1,000만원 출금!', '💸', 'success', 1200);
          }} disabled={bank.balance < 10000000} />
          <QuickActionBtn label="전액 출금" onClick={() => {
            if (bank.balance > 0 && withdraw(bank.balance)) showToast(`${formatWon(bank.balance)} 출금!`, '💸', 'success', 1200);
          }} disabled={bank.balance <= 0} />
        </div>
        {/* 대출/상환 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, marginTop: 4 }}>
          <QuickActionBtn label="대출 100만" onClick={() => {
            if (takeLoan(1000000)) showToast('100만원 대출!', '🏧', 'warning', 1500);
            else showToast('대출 한도 초과!', '🚫', 'danger', 1500);
          }} disabled={loanLimit < 1000000} danger />
          <QuickActionBtn label="대출 500만" onClick={() => {
            if (takeLoan(5000000)) showToast('500만원 대출!', '🏧', 'warning', 1500);
            else showToast('대출 한도 초과!', '🚫', 'danger', 1500);
          }} disabled={loanLimit < 5000000} danger />
          <QuickActionBtn label="대출 1천만" onClick={() => {
            if (takeLoan(10000000)) showToast('1,000만원 대출!', '🏧', 'warning', 1500);
            else showToast('대출 한도 초과!', '🚫', 'danger', 1500);
          }} disabled={loanLimit < 10000000} danger />
          <QuickActionBtn label="한도까지" onClick={() => {
            if (loanLimit > 0 && takeLoan(loanLimit)) showToast(`${formatWon(loanLimit)} 대출!`, '🏧', 'warning', 1500);
            else showToast('대출 한도 없음!', '🚫', 'danger', 1500);
          }} disabled={loanLimit <= 0} danger />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, marginTop: 4 }}>
          <QuickActionBtn label="상환 100만" onClick={() => {
            if (repayLoan(1000000)) showToast('100만원 상환!', '✅', 'success', 1200);
          }} disabled={bank.loanBalance < 1000000 || cash < 1000000} />
          <QuickActionBtn label="상환 500만" onClick={() => {
            if (repayLoan(5000000)) showToast('500만원 상환!', '✅', 'success', 1200);
          }} disabled={bank.loanBalance < 5000000 || cash < 5000000} />
          <QuickActionBtn label="상환 1천만" onClick={() => {
            if (repayLoan(10000000)) showToast('1,000만원 상환!', '✅', 'success', 1200);
          }} disabled={bank.loanBalance < 10000000 || cash < 10000000} />
          <QuickActionBtn label="전액 상환" onClick={() => {
            if (maxRepay > 0 && repayLoan(maxRepay)) showToast(`${formatWon(maxRepay)} 상환!`, '✅', 'success', 1200);
          }} disabled={maxRepay <= 0} />
        </div>
      </div>

      {/* Insurance */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 'var(--sp-sm)' }}>🛡️ 보험</div>
        <div className="flex flex-col gap-xs">
          <div className="flex flex-between" style={{ alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 'var(--font-size-sm)' }}>건강보험</span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginLeft: 6 }}>
                연 20만 · 건강 피해 -50%
              </span>
            </div>
            <button
              onClick={() => {
                toggleInsurance('health');
                showToast(
                  insurance.health ? '건강보험 해지' : '건강보험 가입!',
                  '🛡️',
                  insurance.health ? 'warning' : 'success',
                  1200,
                );
              }}
              aria-label={insurance.health ? '건강보험 해지' : '건강보험 가입'}
              aria-pressed={insurance.health}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 'var(--font-size-xs)',
                background: insurance.health ? 'var(--success)' : '#ccc',
                color: '#fff',
              }}
            >
              {insurance.health ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="flex flex-between" style={{ alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 'var(--font-size-sm)' }}>자산보험</span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginLeft: 6 }}>
                연 30만 · 현금 손실 -30%
              </span>
            </div>
            <button
              onClick={() => {
                toggleInsurance('asset');
                showToast(
                  insurance.asset ? '자산보험 해지' : '자산보험 가입!',
                  '🛡️',
                  insurance.asset ? 'warning' : 'success',
                  1200,
                );
              }}
              aria-label={insurance.asset ? '자산보험 해지' : '자산보험 가입'}
              aria-pressed={insurance.asset}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 'var(--font-size-xs)',
                background: insurance.asset ? 'var(--success)' : '#ccc',
                color: '#fff',
              }}
            >
              {insurance.asset ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
        {insurance.premium > 0 && (
          <div style={{
            marginTop: 'var(--sp-sm)',
            padding: 'var(--sp-xs) var(--sp-sm)',
            background: '#f0fff4',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--success)',
          }}>
            📋 연 보험료 합계: {(insurance.premium / 10000).toFixed(0)}만원
          </div>
        )}
      </div>

      {/* 대출 이력 */}
      {loanHistory.length > 0 && (
      <div className="card">
        <button
          onClick={() => setLoanHistoryExpanded((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <span style={{ fontWeight: 700 }}>📋 대출 이력</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            {loanHistoryExpanded ? '접기 ▲' : `${Math.min(loanHistory.length, 10)}건 보기 ▼`}
          </span>
        </button>
        {loanHistoryExpanded && (
          <div style={{ marginTop: 'var(--sp-sm)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[...loanHistory].reverse().slice(0, 10).map((r, i) => {
              const sourceLabel = r.source === 'bank' ? '은행 대출' : r.source === 'government' ? '정부 긴급 대출' : '이벤트 강제 대출';
              const color = r.source === 'government' ? 'var(--warning)' : r.source === 'forced' ? 'var(--danger)' : 'var(--text-secondary)';
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-xs)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.age}세 | {sourceLabel}</span>
                  <span style={{ fontWeight: 700, color }}>{formatWon(r.amount)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </>
  );
}

function AssetRow({ label, value, extra }: { label: string; value: number; extra?: string }) {
  return (
    <div className="flex flex-between" style={{ fontSize: 'var(--font-size-sm)', padding: '2px 0' }}>
      <span className="text-muted">{label}</span>
      <span>
        {formatWon(value)}
        {extra && <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginLeft: 4 }}>({extra})</span>}
      </span>
    </div>
  );
}

function QuickActionBtn({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled: boolean; danger?: boolean }) {
  return (
    <button
      className="btn btn-secondary"
      style={{
        flex: 1,
        fontSize: 'var(--font-size-sm)',
        minHeight: 36,
        opacity: disabled ? 0.4 : 1,
        ...(danger ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : {}),
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
