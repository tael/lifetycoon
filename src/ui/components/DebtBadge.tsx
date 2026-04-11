import { useGameStore } from '../../store/gameStore';
import { formatWon } from '../../game/domain/asset';

/**
 * 부채 뱃지 — 대출 잔액이 존재할 때만 HUD 상단에 렌더된다.
 * "한 말은 지킨다" 원칙: 대출이 있으면 화면에 상시 노출해서 이자 부담을
 * 외면할 수 없게 만든다. 점멸/빨간 화면 같은 과장 연출은 피하고, 드라이한
 * 팩트(잔액 + 다음 이자 예상)만 표시한다.
 */
export function DebtBadge() {
  const bank = useGameStore((s) => s.bank);
  if (bank.loanBalance <= 0) return null;

  // 다음 이자 예상 — bankAccount.applyLoanInterest와 동일 공식(선형 근사, 1년).
  const nextInterest = Math.round(bank.loanBalance * bank.loanInterestRate);

  return (
    <div
      role="status"
      aria-label={`대출 잔액 ${formatWon(bank.loanBalance)}, 다음 이자 예상 ${formatWon(nextInterest)}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '4px 10px',
        background: '#fff5f5',
        border: '1px solid #ef9a9a',
        borderRadius: 'var(--radius-full)',
        color: 'var(--danger, #c62828)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 700,
        marginBottom: 'var(--sp-xs)',
      }}
    >
      <span>💳 대출 -{formatWon(bank.loanBalance)}</span>
      <span style={{ fontWeight: 500, fontSize: '0.66rem', opacity: 0.85 }}>
        다음 이자 ≈ {formatWon(nextInterest)}
      </span>
    </div>
  );
}
