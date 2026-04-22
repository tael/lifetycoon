import type { StockDef, Holding } from '../../game/types';
import { formatWon } from '../../game/domain/asset';
import { useGameStore } from '../../store/gameStore';

interface Props {
  stock: StockDef;
  price: number;
  holding?: Holding;
  cash: number;
  onBuy: (n: number) => void;
  onSell: (n: number) => void;
  onClose: () => void;
}

export function StockDetailModal({ stock, price, holding, cash, onBuy, onSell, onClose }: Props) {
  const dividendRates = useGameStore((s) => s.dividendRates);
  const priceDiffPct = ((price - stock.basePrice) / stock.basePrice) * 100;
  const priceDiffColor = priceDiffPct > 0 ? 'var(--success)' : priceDiffPct < 0 ? 'var(--danger)' : 'inherit';

  const shares = holding?.shares ?? 0;
  const avgBuy = holding?.avgBuyPrice ?? 0;
  const currentValue = price * shares;
  const totalCost = avgBuy * shares;
  const pnl = currentValue - totalCost;
  const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
  const pnlColor = pnl >= 0 ? 'var(--success)' : 'var(--danger)';

  const canBuyN = (n: number) => cash >= price * n;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 9000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    background: 'var(--bg-card, #fff)',
    borderRadius: 'var(--radius-lg, 16px)',
    width: '100%',
    maxWidth: 360,
    maxHeight: '85dvh',
    overflowY: 'auto',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    padding: '20px 18px',
  };

  const sectionStyle: React.CSSProperties = {
    borderBottom: '1px solid var(--border, #f0f0f0)',
    paddingBottom: 14,
    marginBottom: 14,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-xs, 12px)',
    color: 'var(--text-muted, #999)',
    marginBottom: 2,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-sm, 14px)',
    fontWeight: 600,
  };

  const infoRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  };

  const buyBtnStyle = (disabled: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 4px',
    borderRadius: 'var(--radius-md, 8px)',
    background: disabled ? '#eee' : '#e8f5e9',
    color: disabled ? '#aaa' : 'var(--success)',
    fontWeight: 700,
    fontSize: 'var(--font-size-sm, 14px)',
    border: 'none',
    cursor: disabled ? 'default' : 'pointer',
  });

  const sellBtnStyle = (disabled: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 4px',
    borderRadius: 'var(--radius-md, 8px)',
    background: disabled ? '#eee' : '#ffebee',
    color: disabled ? '#aaa' : 'var(--danger)',
    fontWeight: 700,
    fontSize: 'var(--font-size-sm, 14px)',
    border: 'none',
    cursor: disabled ? 'default' : 'pointer',
  });

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.6rem' }}>{stock.iconEmoji}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 'var(--font-size-md, 16px)' }}>{stock.name}</div>
              <div style={{ fontSize: 'var(--font-size-xs, 12px)', color: 'var(--text-muted, #999)' }}>{stock.sector}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Flavor text */}
        <div style={{ ...sectionStyle, fontSize: 'var(--font-size-xs, 12px)', color: 'var(--text-secondary, #666)', fontStyle: 'italic' }}>
          {stock.flavorText}
        </div>

        {/* Price info */}
        <div style={sectionStyle}>
          <div style={infoRowStyle}>
            <div>
              <div style={labelStyle}>현재가</div>
              <div style={{ ...valueStyle, fontSize: 'var(--font-size-md, 16px)', color: priceDiffColor }}>
                {formatWon(price)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={labelStyle}>기본가 대비</div>
              <div style={{ ...valueStyle, color: priceDiffColor }}>
                {priceDiffPct >= 0 ? '+' : ''}{priceDiffPct.toFixed(1)}%
              </div>
            </div>
          </div>
          <div style={infoRowStyle}>
            <div>
              <div style={labelStyle}>변동성</div>
              <div style={valueStyle}>{(stock.volatility * 100).toFixed(0)}%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={labelStyle}>시가배당률</div>
              <div style={{ ...valueStyle, color: stock.dividendRate > 0 ? 'var(--success)' : 'inherit' }}>
                {stock.dividendRate > 0
                  ? `${((stock.basePrice * (dividendRates[stock.ticker] ?? stock.dividendRate)) / price * 100).toFixed(1)}%`
                  : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Holdings info */}
        {shares > 0 && (
          <div style={sectionStyle}>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm, 14px)', marginBottom: 8 }}>보유 현황</div>
            <div style={infoRowStyle}>
              <div>
                <div style={labelStyle}>보유량</div>
                <div style={valueStyle}>{shares}주</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={labelStyle}>평균 매수가</div>
                <div style={valueStyle}>{formatWon(avgBuy)}</div>
              </div>
            </div>
            <div style={infoRowStyle}>
              <div>
                <div style={labelStyle}>현재 평가액</div>
                <div style={valueStyle}>{formatWon(currentValue)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={labelStyle}>총 손익</div>
                <div style={{ ...valueStyle, color: pnlColor }}>
                  {pnl >= 0 ? '+' : ''}{formatWon(pnl)}{' '}
                  <span style={{ fontSize: 'var(--font-size-xs, 12px)' }}>
                    ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
            {stock.dividendRate > 0 && avgBuy > 0 && (
              <div style={infoRowStyle}>
                <div>
                  <div style={labelStyle}>시가배당률</div>
                  <div style={{ ...valueStyle, color: 'var(--success)' }}>
                    {((stock.basePrice * (dividendRates[stock.ticker] ?? stock.dividendRate)) / price * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={labelStyle}>내 수익률</div>
                  <div style={{ ...valueStyle, color: 'var(--success)' }}>
                    {((price * stock.dividendRate) / avgBuy * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 배당 교육 팁 */}
        {stock.dividendRate > 0 && (
          <div style={{ background: '#e8f5e9', borderRadius: 'var(--radius-sm)', padding: '8px 10px', marginBottom: 12, fontSize: 'var(--font-size-xs)' }}>
            <div style={{ fontWeight: 700, color: '#2e7d32', marginBottom: 2 }}>💡 배당금이란?</div>
            {shares > 0 ? (
              <div style={{ color: '#388e3c' }}>
                {stock.name} {shares}주 보유 시 연 약{' '}
                <strong>{formatWon(Math.round(stock.basePrice * (dividendRates[stock.ticker] ?? stock.dividendRate) * shares))}</strong>
                을 배당금으로 받을 수 있어요! 돈이 돈을 버는 거예요 🎉
              </div>
            ) : (
              <div style={{ color: '#388e3c' }}>
                주식을 사면 회사 이익을 나눠받아요. 1주당 연 약{' '}
                <strong>{formatWon(Math.round(stock.basePrice * (dividendRates[stock.ticker] ?? stock.dividendRate)))}</strong>
                을 받을 수 있어요!
              </div>
            )}
          </div>
        )}

        {/* Buy buttons */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm, 14px)', marginBottom: 6 }}>매수</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {([1, 5, 10] as const).map((n) => (
              <button
                key={n}
                style={buyBtnStyle(!canBuyN(n))}
                disabled={!canBuyN(n)}
                onClick={() => onBuy(n)}
                aria-label={`${stock.name} ${n}주 매수`}
              >
                ▲{n}주
              </button>
            ))}
          </div>
        </div>

        {/* Sell buttons */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm, 14px)', marginBottom: 6 }}>매도</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {([1, 5, 10] as const).map((n) => (
              <button
                key={n}
                style={sellBtnStyle(shares < n)}
                disabled={shares < n}
                onClick={() => onSell(n)}
                aria-label={`${stock.name} ${n}주 매도`}
              >
                ▼{n}주
              </button>
            ))}
            <button
              style={sellBtnStyle(shares < 1)}
              disabled={shares < 1}
              onClick={() => onSell(shares)}
              aria-label={`${stock.name} 전량 매도`}
            >
              ▼전량
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
