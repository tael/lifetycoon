import { useState } from 'react';
import { useGameStore, STOCKS } from '../../../store/gameStore';
import { formatWon } from '../../../game/domain/asset';
import { sfx } from '../../../game/engine/soundFx';
import { showToast } from '../../components/Toast';
import { StockDetailModal } from '../../components/StockDetailModal';
import { incrementBought, incrementSold } from '../../../store/globalStats';
import { REAL_ESTATE_LISTINGS } from '../../../game/domain/realEstate';
import { dynamicListingPrice, dynamicMonthlyRent } from '../../../game/engine/economyCycle';
import type { EconomyPhase } from '../../../game/engine/economyCycle';
import { ANNUAL_INFLATION_RATE } from '../../../game/constants';
import type { StockDef, RealEstate } from '../../../game/types';
import { Icon } from '../../icons/Icon';

export function InvestTab({
  dividendIncome,
  selectedStock,
  setSelectedStock,
}: {
  dividendIncome: number;
  selectedStock: string | null;
  setSelectedStock: (ticker: string | null) => void;
}) {
  const cash = useGameStore((s) => s.cash);
  const holdings = useGameStore((s) => s.holdings);
  const prices = useGameStore((s) => s.prices);
  const autoInvest = useGameStore((s) => s.autoInvest);
  const dripEnabled = useGameStore((s) => s.dripEnabled);
  const toggleAutoInvest = useGameStore((s) => s.toggleAutoInvest);
  const realEstate = useGameStore((s) => s.realEstate);
  const buyRealEstate = useGameStore((s) => s.buyRealEstate);
  const sellRealEstate = useGameStore((s) => s.sellRealEstate);
  const economyPhase = useGameStore((s) => s.economyCycle.phase) as EconomyPhase;
  const inflationMult = useGameStore((s) => {
    const age = Math.floor(s.character.age);
    return age > 30 ? 1 + ANNUAL_INFLATION_RATE * (age - 30) : 1;
  });
  const dividendRates = useGameStore((s) => s.dividendRates);
  const buy = useGameStore((s) => s.buy);
  const sell = useGameStore((s) => s.sell);

  const [stockSectorFilter, setStockSectorFilter] = useState<string>('all');
  const stockSectors = ['all', ...Array.from(new Set(STOCKS.map((s) => s.sector).filter(Boolean)))];

  return (
    <>
      {/* Real Estate */}
      <RealEstateCard
        realEstate={realEstate}
        cash={cash}
        economyPhase={economyPhase}
        inflationMult={inflationMult}
        onBuy={(id) => {
          const result = buyRealEstate(id);
          if (result.success) {
            sfx.buy();
            showToast(`부동산 매입! 취득세 ${formatWon(result.acquisitionTax)} 납부`, '🏠', 'success', 2000);
          } else {
            showToast('현금이 부족해요', '😢', 'danger', 1500);
          }
        }}
        onSell={(idx) => {
          const result = sellRealEstate(idx);
          if (result.success) {
            sfx.sell();
            if (result.capitalGainsTax === 0) {
              showToast('부동산 매각! 1주택 2년 보유 비과세 적용', '💸', 'success', 2000);
            } else {
              showToast(`부동산 매각! 양도세 ${formatWon(result.capitalGainsTax)} 납부`, '💸', 'success', 2000);
            }
          }
        }}
      />

      {/* Stock Board */}
      <div className="card card--invest">
        <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 'var(--sp-sm)' }}>
          <span style={{ fontWeight: 700 }}><Icon slot="nav-invest" size="md" /> 주식</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {dividendIncome > 0 && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--success)', fontWeight: 600 }}>
                배당+{formatWon(dividendIncome)}
              </span>
            )}
            <button
              onClick={toggleAutoInvest}
              aria-label={autoInvest ? '자동투자 끄기' : '자동투자 켜기'}
              aria-pressed={autoInvest}
              style={{
                fontSize: '0.6rem',
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)',
                background: autoInvest ? 'var(--success)' : '#eee',
                color: autoInvest ? '#fff' : '#999',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {autoInvest ? '🤖 자동ON' : '자동OFF'}
            </button>
            <button
              onClick={() => useGameStore.getState().toggleDrip()}
              aria-label={dripEnabled ? '배당 재투자 끄기' : '배당 재투자 켜기'}
              aria-pressed={dripEnabled}
              title="배당재투자 (DRIP): 받은 배당금을 그 주식에 자동으로 다시 투자해요. 복리 효과가 커져요."
              style={{
                fontSize: '0.6rem',
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)',
                background: dripEnabled ? 'var(--accent)' : '#eee',
                color: dripEnabled ? '#fff' : '#999',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {dripEnabled ? '💎 배당재투자' : '배당재투자'}
            </button>
          </div>
        </div>
        {/* 섹터 필터 탭 */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 'var(--sp-sm)' }}>
          {stockSectors.map((sector) => {
            const isActive = stockSectorFilter === sector;
            return (
              <button
                key={sector}
                onClick={() => setStockSectorFilter(sector)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 700,
                  border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border-duo)'}`,
                  background: isActive ? 'var(--accent)' : 'var(--bg-card)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 0 var(--accent-shadow)' : '0 2px 0 var(--border-strong)',
                }}
              >
                {sector === 'all' ? '전체' : sector}
              </button>
            );
          })}
        </div>
        {[...STOCKS].sort((a, b) => {
          const priceA = prices[a.ticker] ?? a.basePrice;
          const priceB = prices[b.ticker] ?? b.basePrice;
          const sharesA = holdings.find((h) => h.ticker === a.ticker)?.shares ?? 0;
          const sharesB = holdings.find((h) => h.ticker === b.ticker)?.shares ?? 0;
          const valueA = priceA * sharesA;
          const valueB = priceB * sharesB;
          const hasA = sharesA > 0;
          const hasB = sharesB > 0;
          if (hasA !== hasB) return hasA ? -1 : 1;
          if (hasA && hasB) return valueB - valueA;
          return priceB - priceA;
        }).filter((s) => stockSectorFilter === 'all' || s.sector === stockSectorFilter)
        .map((s: StockDef) => {
          const price = prices[s.ticker] ?? s.basePrice;
          const holding = holdings.find((h) => h.ticker === s.ticker);
          return (
            <StockRow
              key={s.ticker}
              stock={s}
              price={price}
              holding={holding}
              onBuy={(n) => {
                const result = buy(s.ticker, n);
                if (result.success) { sfx.buy(); showToast(`${s.name} ${n}주 매수!`, s.iconEmoji, 'success', 1500); incrementBought(); }
                else if (result.reason) showToast(result.reason, '😢', 'danger', 1500);
              }}
              onSell={(n) => {
                const avgBuyPrice = holding?.avgBuyPrice ?? 0;
                const profit = avgBuyPrice > 0 ? (price - avgBuyPrice) * n : 0;
                const result = sell(s.ticker, n);
                if (result.success) {
                  sfx.sell();
                  const profitText = profit > 0 ? ` +${formatWon(profit)} 이익!` : profit < 0 ? ` ${formatWon(profit)} 손실` : '';
                  showToast(`${s.name} ${n}주 매도!${profitText}`, s.iconEmoji, profit >= 0 ? 'success' : 'warning', 2000);
                  incrementSold();
                }
                else if (result.reason) showToast(result.reason, '😢', 'danger', 1500);
              }}
              canBuy={cash >= price}
              cash={cash}
              onDetail={() => setSelectedStock(s.ticker)}
              dividendRates={dividendRates}
            />
          );
        })}
      </div>

      {/* Stock Detail modal */}
      {selectedStock && (() => {
        const s = STOCKS.find((st) => st.ticker === selectedStock);
        if (!s) return null;
        const p = prices[selectedStock] ?? s.basePrice;
        const h = holdings.find((hh) => hh.ticker === selectedStock);
        return (
          <StockDetailModal
            stock={s}
            price={p}
            holding={h}
            cash={cash}
            onBuy={(n) => {
              const result = buy(s.ticker, n);
              if (result.success) { sfx.buy(); showToast(`${s.name} ${n}주 매수!`, s.iconEmoji, 'success', 1500); incrementBought(); }
              else if (result.reason) showToast(result.reason, '😢', 'danger', 1500);
            }}
            onSell={(n) => {
              const avgBuyPrice = h?.avgBuyPrice ?? 0;
              const profit = avgBuyPrice > 0 ? (p - avgBuyPrice) * n : 0;
              const result = sell(s.ticker, n);
              if (result.success) {
                sfx.sell();
                const profitText = profit > 0 ? ` +${formatWon(profit)} 이익!` : profit < 0 ? ` ${formatWon(profit)} 손실` : '';
                showToast(`${s.name} ${n}주 매도!${profitText}`, s.iconEmoji, profit >= 0 ? 'success' : 'warning', 2000);
                incrementSold();
              }
              else if (result.reason) showToast(result.reason, '😢', 'danger', 1500);
            }}
            onClose={() => setSelectedStock(null)}
          />
        );
      })()}
    </>
  );
}

function RealEstateCard({
  realEstate, cash, economyPhase, inflationMult, onBuy, onSell,
}: {
  realEstate: RealEstate[];
  cash: number;
  economyPhase: EconomyPhase;
  inflationMult: number;
  onBuy: (id: string) => void;
  onSell: (idx: number) => void;
}) {
  const ownedIds = new Set(realEstate.map((re) => re.id));
  const nextListing = REAL_ESTATE_LISTINGS.find((l) => !ownedIds.has(l.id));
  const dynPrice = nextListing
    ? dynamicListingPrice(nextListing.price, economyPhase, inflationMult)
    : 0;
  const dynRent = nextListing && nextListing.monthlyRent > 0
    ? dynamicMonthlyRent(nextListing.monthlyRent, economyPhase)
    : 0;

  return (
    <div className="card card--invest">
      <div style={{ fontWeight: 700, marginBottom: 'var(--sp-xs)' }}><Icon slot="nav-home" size="md" /> 부동산</div>
      {realEstate.length === 0 && (
        <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginBottom: 'var(--sp-xs)' }}>
          보유 부동산 없음
        </div>
      )}
      {realEstate.map((re, i) => {
        const gain = re.currentValue - re.purchasePrice;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid #f5f0e8' }}>
            <span style={{ fontSize: '1.2rem' }}><Icon slot="nav-home" size="md" /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{re.name}</div>
              <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                {formatWon(re.currentValue)}
                <span style={{ marginLeft: 4, color: gain >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {gain >= 0 ? '+' : ''}{formatWon(gain)}
                </span>
                {re.monthlyRent > 0 && (
                  <span style={{ marginLeft: 4, color: 'var(--success)' }}>
                    월세+{formatWon(re.monthlyRent)}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onSell(i)}
              aria-label={`${re.name} 매각`}
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: '#ffebee',
                color: 'var(--danger)',
                fontSize: '0.65rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              매각
            </button>
          </div>
        );
      })}
      {nextListing && (
        <div style={{ marginTop: 'var(--sp-xs)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
            매물: {nextListing.name} ({formatWon(dynPrice)})
            {dynRent > 0 && ` · 월세 ${formatWon(dynRent)}`}
          </div>
          <button
            onClick={() => onBuy(nextListing.id)}
            disabled={cash < dynPrice}
            aria-label={`${nextListing.name} 매입 ${formatWon(dynPrice)}`}
            style={{
              padding: '2px 10px',
              borderRadius: 'var(--radius-sm)',
              background: cash >= dynPrice ? '#e8f5e9' : '#eee',
              color: cash >= dynPrice ? 'var(--success)' : '#aaa',
              fontSize: '0.65rem',
              fontWeight: 700,
              border: 'none',
              cursor: cash >= dynPrice ? 'pointer' : 'default',
            }}
          >
            매입
          </button>
        </div>
      )}
      {!nextListing && realEstate.length > 0 && (
        <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 4 }}>
          모든 매물 보유 중 🎉
        </div>
      )}
    </div>
  );
}

function StockRow({
  stock, price, holding, onBuy, onSell, canBuy, onDetail, cash, dividendRates,
}: {
  stock: StockDef; price: number; holding?: { shares: number; avgBuyPrice: number };
  onBuy: (n: number) => void; onSell: (n: number) => void; canBuy: boolean;
  onDetail: () => void; cash: number; dividendRates: Record<string, number>;
}) {
  const maxBuyable = price > 0 ? Math.floor(cash / price) : 0;
  const pnl = holding ? (price - holding.avgBuyPrice) * holding.shares : 0;
  const pnlPct = holding && holding.avgBuyPrice > 0
    ? ((price - holding.avgBuyPrice) / holding.avgBuyPrice) * 100
    : 0;
  const holdingValue = holding ? price * holding.shares : 0;
  const priceDiff = price - stock.basePrice;
  const priceDiffPct = stock.basePrice > 0 ? (priceDiff / stock.basePrice) * 100 : 0;
  const isUp = priceDiff > 0;
  const isDown = priceDiff < 0;
  const arrow = isUp ? '▲' : isDown ? '▼' : '─';
  const trendColor = isUp ? 'var(--success)' : isDown ? 'var(--danger)' : 'var(--text-muted)';
  const currentDivRate = dividendRates[stock.ticker] ?? stock.dividendRate;
  const currentYield = currentDivRate > 0 && price > 0
    ? (stock.basePrice * currentDivRate / price) * 100
    : 0;

  // Sparkline: basePrice 중심선에서 현재가까지 곡선 (등락 시각화)
  const sparkW = 80;
  const sparkH = 22;
  const sparkRatio = stock.basePrice > 0 ? Math.max(0.6, Math.min(1.4, price / stock.basePrice)) : 1;
  const sparkEndY = sparkH / 2 - (sparkRatio - 1) * sparkH;
  const sparkPath = `M0 ${sparkH / 2} Q${sparkW / 2} ${(sparkH / 2 + sparkEndY) / 2} ${sparkW} ${sparkEndY}`;

  return (
    <div className="card card--invest" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={onDetail} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onDetail(); }} aria-label={`${stock.name} 상세 보기`}>
      {/* 헤더: 종목명 + 등락률 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{stock.iconEmoji}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 'var(--font-size-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stock.name}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              {stock.ticker} · {stock.sector}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: trendColor }}>
            {arrow} {priceDiffPct >= 0 ? '+' : ''}{priceDiffPct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 가격 + 스파크라인 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
            {formatWon(price)}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: trendColor, marginTop: 2, fontWeight: 600 }}>
            전일대비 {priceDiff >= 0 ? '+' : ''}{formatWon(priceDiff)}
          </div>
        </div>
        <svg width={sparkW} height={sparkH} viewBox={`0 0 ${sparkW} ${sparkH}`} style={{ flexShrink: 0 }} aria-hidden="true">
          <path d={sparkPath} stroke={trendColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx={sparkW} cy={sparkEndY} r="3" fill={trendColor} />
        </svg>
      </div>

      {/* 보유 정보 (홀딩 있을 때만) */}
      {holding && (
        <div style={{
          background: 'var(--surface-2)',
          padding: '8px 10px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 8,
          border: '1px solid var(--border-soft)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-sm)' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>보유 {holding.shares}주</span>
            <span style={{ fontWeight: 700 }}>{formatWon(holdingValue)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', marginTop: 3 }}>
            <span style={{ color: 'var(--text-muted)' }}>평균 {formatWon(holding.avgBuyPrice)}</span>
            <span style={{ fontWeight: 700, color: pnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {pnl >= 0 ? '+' : ''}{formatWon(pnl)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {/* 시가배당률 */}
      {currentYield > 0 && (
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--success)', marginBottom: 8, fontWeight: 600 }}>
          💎 시가배당률 {currentYield.toFixed(2)}%
        </div>
      )}

      {/* 매수/매도 큰 버튼 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }} onClick={(e) => e.stopPropagation()}>
        <button
          className="btn btn-success"
          disabled={!canBuy}
          onClick={() => onBuy(1)}
          aria-label={`${stock.name} 매수`}
          style={{ minHeight: 48, fontSize: 'var(--font-size-base)' }}
        >
          매수
        </button>
        <button
          className="btn btn-danger"
          disabled={!holding || holding.shares < 1}
          onClick={() => holding && onSell(1)}
          aria-label={`${stock.name} 매도`}
          style={{ minHeight: 48, fontSize: 'var(--font-size-base)' }}
        >
          매도
        </button>
      </div>

      {/* 빠른 옵션 */}
      <div style={{ display: 'flex', gap: 4, marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
        <QuickQty label="+5주" onClick={() => onBuy(5)} disabled={maxBuyable < 5} positive />
        <QuickQty label={`+전량${maxBuyable > 0 ? `(${maxBuyable})` : ''}`} onClick={() => maxBuyable > 0 && onBuy(maxBuyable)} disabled={maxBuyable < 1} positive />
        <QuickQty label="-전량" onClick={() => onSell(holding?.shares ?? 0)} disabled={!holding || holding.shares < 1} positive={false} />
      </div>
    </div>
  );
}

function QuickQty({ label, onClick, disabled, positive }: { label: string; onClick: () => void; disabled: boolean; positive: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '4px 6px',
        background: disabled ? 'transparent' : positive ? 'var(--success-soft)' : 'var(--danger-soft)',
        color: disabled ? 'var(--text-muted)' : positive ? 'var(--success)' : 'var(--danger)',
        border: `1px solid ${disabled ? 'var(--border-duo)' : 'transparent'}`,
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.7rem',
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        minHeight: 32,
      }}
    >
      {label}
    </button>
  );
}
