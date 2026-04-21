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
      <div className="card">
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
                const result = sell(s.ticker, n);
                if (result.success) { sfx.sell(); showToast(`${s.name} ${n}주 매도!`, s.iconEmoji, 'warning', 1500); incrementSold(); }
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
              const result = sell(s.ticker, n);
              if (result.success) { sfx.sell(); showToast(`${s.name} ${n}주 매도!`, s.iconEmoji, 'warning', 1500); incrementSold(); }
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
    <div className="card">
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
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '2px solid var(--border-duo)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
      marginBottom: 8,
      boxShadow: '0 2px 0 var(--border-strong)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1.2rem', width: 28, flexShrink: 0 }}>{stock.iconEmoji}</span>
        <div
          role="button"
          tabIndex={0}
          onClick={onDetail}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onDetail(); }}
          aria-label={`${stock.name} 상세 보기`}
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
        >
          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {stock.name}
            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginLeft: 3, fontWeight: 400 }}>
              {stock.sector}
            </span>
            {stock.dividendRate > 0 && (
              <span style={{ fontSize: '0.55rem', color: 'var(--success)', marginLeft: 3, fontWeight: 400 }}>
                {(() => {
                  const currentRate = dividendRates[stock.ticker] ?? stock.dividendRate;
                  const currentPrice = price > 0 ? price : stock.basePrice;
                  const currentYield = (stock.basePrice * currentRate / currentPrice) * 100;
                  return `시가배당률 ${currentYield.toFixed(1)}%`;
                })()}
              </span>
            )}
          </div>
          <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
            <span style={{ color: price > stock.basePrice ? 'var(--success)' : price < stock.basePrice ? 'var(--danger)' : 'inherit' }}>
              {price > stock.basePrice ? '▲' : price < stock.basePrice ? '▼' : '─'}{formatWon(price)}
            </span>
            {holding && ` · ${holding.shares}주`}
            {holding && (
              <span style={{ color: pnl >= 0 ? 'var(--success)' : 'var(--danger)', marginLeft: 4 }}>
                {pnl >= 0 ? '+' : ''}{formatWon(pnl)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
        <TradBtn label="▲1주" color="buy" onClick={() => onBuy(1)} disabled={!canBuy} stockName={stock.name} />
        <TradBtn label="▲5주" color="buy" onClick={() => onBuy(5)} disabled={maxBuyable < 5} stockName={stock.name} />
        <TradBtn label={`▲전량${maxBuyable > 0 ? `(${maxBuyable})` : ''}`} color="buy" onClick={() => maxBuyable > 0 && onBuy(maxBuyable)} disabled={maxBuyable < 1} stockName={stock.name} />
        <TradBtn label="▼1주" color="sell" onClick={() => onSell(1)} disabled={!holding || holding.shares < 1} stockName={stock.name} />
        <TradBtn label="▼전량" color="sell" onClick={() => onSell(holding?.shares ?? 0)} disabled={!holding || holding.shares < 1} stockName={stock.name} />
      </div>
    </div>
  );
}

function TradBtn({ label, color, onClick, disabled, stockName }: { label: string; color: 'buy' | 'sell'; onClick: () => void; disabled: boolean; stockName?: string }) {
  const isBuy = color === 'buy';
  const namePrefix = stockName ? `${stockName} ` : '';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={isBuy ? `${namePrefix}${label} 매수` : `${namePrefix}${label} 매도`}
      style={{
        padding: '8px 10px',
        borderRadius: 'var(--radius-sm)',
        background: disabled ? '#eee' : isBuy ? '#e8f5e9' : '#ffebee',
        color: disabled ? '#aaa' : isBuy ? 'var(--success)' : 'var(--danger)',
        fontSize: '0.7rem',
        fontWeight: 700,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        minHeight: 44,
        minWidth: 52,
      }}
    >
      {label}
    </button>
  );
}
