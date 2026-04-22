import { useState } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { formatWon } from '../../../game/domain/asset';
import { showToast } from '../../components/Toast';
import { Icon } from '../../icons/Icon';

export function BankTab({
  effectiveInterestRate,
  totalAssets,
}: {
  effectiveInterestRate: number;
  totalAssets: number;
}) {
  const economyPhase = useGameStore((s) => s.economyCycle.phase);
  const cash = useGameStore((s) => s.cash);
  const bank = useGameStore((s) => s.bank);
  const deposit = useGameStore((s) => s.deposit);
  const withdraw = useGameStore((s) => s.withdraw);
  const takeLoan = useGameStore((s) => s.takeLoan);
  const repayLoan = useGameStore((s) => s.repayLoan);
  const loanHistory = useGameStore((s) => s.loanHistory);
  const totalTaxPaid = useGameStore((s) => s.totalTaxPaid);
  const autoSave = useGameStore((s) => s.autoSave);
  const toggleAutoSave = useGameStore((s) => s.toggleAutoSave);

  const [loanHistoryExpanded, setLoanHistoryExpanded] = useState(false);
  const [pendingLoan, setPendingLoan] = useState<number | null>(null);

  const loanLimit = Math.max(0, Math.floor(totalAssets * 0.5) - bank.loanBalance);
  const maxRepay = Math.min(cash, bank.loanBalance);

  const confirmLoan = () => {
    if (pendingLoan !== null) {
      if (takeLoan(pendingLoan)) {
        showToast(`${formatWon(pendingLoan)} 대출!`, '🏧', 'warning', 1500);
      } else {
        showToast('대출 한도 초과!', '🚫', 'danger', 1500);
      }
      setPendingLoan(null);
    }
  };

  return (
    <>
      {/* 대출 경고 모달 */}
      {pendingLoan !== null && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content animate-pop" style={{ border: '2px solid var(--danger)' }}>
            <h3 style={{ color: 'var(--danger)', marginBottom: 'var(--sp-sm)', fontFamily: 'var(--font-display)' }}>
              ⚠️ 잠깐! 대출은 꼭 갚아야 해요
            </h3>
            <p style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--sp-md)', lineHeight: 1.5 }}>
              원금 <strong>{formatWon(pendingLoan)}</strong>원을 빌리면,
              <br />
            </p>
            <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: 8 }}>
              12개월 뒤 이자까지 총{' '}
              <strong style={{ color: 'var(--danger)', fontSize: '1.1em' }}>
                {formatWon(Math.round(pendingLoan * (1 + bank.loanInterestRate)))}
              </strong>
              원을 갚아야 해요.
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, background: '#fff3e0', padding: '6px 10px', borderRadius: 8 }}>
              💡 이자는 빌린 돈의 대가예요. 갚을 수 있을 때만 빌리세요!
            </div>
            <div className="flex gap-sm">
              <button
                className="btn btn-secondary"
                style={{ flex: 1, minHeight: 44 }}
                onClick={() => setPendingLoan(null)}
              >
                취소
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1, minHeight: 44 }}
                onClick={confirmLoan}
              >
                그래도 빌릴래
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 은행 잔액 요약 */}
      <div className="card card--bank">
        <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 'var(--sp-sm)' }}>
          <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center' }}>
            <Icon slot="nav-bank" size="md" /> 은행
            <span style={{
              fontSize: '0.6rem', fontWeight: 700,
              padding: '2px 7px', borderRadius: 999,
              background: economyPhase === 'boom' ? '#fff3e0' : economyPhase === 'recession' ? '#e3f2fd' : '#f5f5f5',
              color: economyPhase === 'boom' ? '#e65100' : economyPhase === 'recession' ? '#1565c0' : '#9e9e9e',
              marginLeft: 6,
            }}>
              {economyPhase === 'boom' ? '호황' : economyPhase === 'recession' ? '불황' : '보통'}
            </span>
          </span>
        </div>
        <div className="flex flex-col gap-xs">
          <div className="flex flex-between" style={{ fontSize: 'var(--font-size-sm)', padding: '2px 0' }}>
            <span className="text-muted">현금</span>
            <span>{formatWon(cash)}</span>
          </div>
          <div className="flex flex-between" style={{ fontSize: 'var(--font-size-sm)', padding: '2px 0' }}>
            <span className="text-muted">예금</span>
            <span>
              {formatWon(bank.balance)}
              <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginLeft: 4 }}>
                (연 {(effectiveInterestRate * 100).toFixed(1)}%)
              </span>
              <span style={{
                fontSize: '0.55rem',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 'var(--radius-full)',
                marginLeft: 4,
                background: economyPhase === 'boom' ? '#fff3e0'
                  : economyPhase === 'recession' ? '#e3f2fd'
                  : '#f5f5f5',
                color: economyPhase === 'boom' ? '#e65100'
                  : economyPhase === 'recession' ? '#1565c0'
                  : '#757575',
              }}>
                {economyPhase === 'boom' ? '📈 호황' : economyPhase === 'recession' ? '📉 불황' : '─ 보통'}
              </span>
            </span>
          </div>
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
              {bank.loanBalance > 0 && economyPhase !== 'normal' && (
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {economyPhase === 'boom' ? '💡 호황기에는 대출 이자 부담이 커요' : '💡 불황기에는 금리가 낮아질 수 있어요'}
                </div>
              )}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--sp-xs)' }}>
          <button
            onClick={toggleAutoSave}
            aria-pressed={autoSave}
            title="자동저축: 매년 월급의 20%를 자동으로 예금에 저축해요!"
            style={{
              fontSize: '0.6rem',
              padding: '2px 7px',
              borderRadius: 'var(--radius-full)',
              background: autoSave ? 'var(--info)' : '#eee',
              color: autoSave ? '#fff' : '#999',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {autoSave ? '💰 자동저축 ON' : '자동저축 OFF'}
          </button>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            세금 합계: {formatWon(totalTaxPaid)}
          </div>
        </div>

        {/* 입금 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, marginTop: 'var(--sp-sm)' }}>
          <QuickActionBtn label="입금 100만" onClick={() => {
            const r = deposit(1000000);
            if (r.success) showToast('100만원 입금!', '🏦', 'info', 1200);
            else if (r.reason) showToast(r.reason, '😢', 'danger', 1200);
          }} disabled={cash < 1000000} />
          <QuickActionBtn label="25% 입금" onClick={() => {
            const amt = Math.floor(cash * 0.25);
            if (amt > 0) {
              const r = deposit(amt);
              if (r.success) showToast(`${formatWon(amt)} 입금!`, '🏦', 'info', 1200);
              else if (r.reason) showToast(r.reason, '😢', 'danger', 1200);
            }
          }} disabled={cash <= 0} />
          <QuickActionBtn label="절반 입금" onClick={() => {
            const amt = Math.floor(cash * 0.5);
            if (amt > 0) {
              const r = deposit(amt);
              if (r.success) showToast(`${formatWon(amt)} 입금!`, '🏦', 'success', 1200);
              else if (r.reason) showToast(r.reason, '😢', 'danger', 1200);
            }
          }} disabled={cash <= 0} />
          <QuickActionBtn label="전액 입금" onClick={() => {
            if (cash > 0) {
              const r = deposit(cash);
              if (r.success) showToast(`${formatWon(cash)} 입금!`, '🏦', 'success', 1200);
              else if (r.reason) showToast(r.reason, '😢', 'danger', 1200);
            }
          }} disabled={cash <= 0} />
        </div>
        {/* 출금 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, marginTop: 4 }}>
          <QuickActionBtn label="출금 100만" onClick={() => {
            const r = withdraw(1000000);
            if (r.success) showToast('100만원 출금!', '💸', 'info', 1200);
            else if (r.reason) showToast(r.reason, '😢', 'danger', 1200);
          }} disabled={bank.balance < 1000000} />
          <QuickActionBtn label="출금 500만" onClick={() => {
            const r = withdraw(5000000);
            if (r.success) showToast('500만원 출금!', '💸', 'info', 1200);
            else if (r.reason) showToast(r.reason, '😢', 'danger', 1200);
          }} disabled={bank.balance < 5000000} />
          <QuickActionBtn label="출금 1천만" onClick={() => {
            const r = withdraw(10000000);
            if (r.success) showToast('1,000만원 출금!', '💸', 'success', 1200);
            else if (r.reason) showToast(r.reason, '😢', 'danger', 1200);
          }} disabled={bank.balance < 10000000} />
          <QuickActionBtn label="전액 출금" onClick={() => {
            if (bank.balance > 0) {
              const r = withdraw(bank.balance);
              if (r.success) showToast(`${formatWon(bank.balance)} 출금!`, '💸', 'success', 1200);
              else if (r.reason) showToast(r.reason, '😢', 'danger', 1200);
            }
          }} disabled={bank.balance <= 0} />
        </div>
        {/* 대출/상환 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, marginTop: 4 }}>
          <QuickActionBtn label="대출 100만" onClick={() => setPendingLoan(1000000)} disabled={loanLimit < 1000000} danger />
          <QuickActionBtn label="대출 500만" onClick={() => setPendingLoan(5000000)} disabled={loanLimit < 5000000} danger />
          <QuickActionBtn label="대출 1천만" onClick={() => setPendingLoan(10000000)} disabled={loanLimit < 10000000} danger />
          <QuickActionBtn label="한도까지" onClick={() => {
            if (loanLimit > 0) setPendingLoan(loanLimit);
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

      {/* 대출 이력 */}
      {loanHistory.length > 0 && (
      <div className="card card--bank">
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
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-xs)', padding: '4px 0', borderBottom: '1px solid var(--border-duo)' }}>
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
