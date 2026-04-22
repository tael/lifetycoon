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

/**
 * StockRow — 토스증권/Robinhood 스타일 컴팩트 리스트 행
 * - 1행: 이모지 + 종목명/섹터 + 미니차트 + 가격/등락률 + (보유 배지)
 * - 거래는 클릭 → StockDetailModal에서 처리
 * - 한 종목당 ~60px만 차지하므로 10종목도 한 화면에 가시성 확보
 */
function StockRow({
  stock, price, holding, onDetail, dividendRates,
}: {
  stock: StockDef;
  price: number;
  holding?: { shares: number; avgBuyPrice: number };
  onBuy: (n: number) => void;
  onSell: (n: number) => void;
  canBuy: boolean;
  onDetail: () => void;
  cash: number;
  dividendRates: Record<string, number>;
}) {
  const pnl = holding ? (price - holding.avgBuyPrice) * holding.shares : 0;
  const pnlPct = holding && holding.avgBuyPrice > 0
    ? ((price - holding.avgBuyPrice) / holding.avgBuyPrice) * 100
    : 0;
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

  // 미니 스파크라인 (basePrice→현재가 곡선)
  const sparkW = 56;
  const sparkH = 28;
  const sparkRatio = stock.basePrice > 0 ? Math.max(0.6, Math.min(1.4, price / stock.basePrice)) : 1;
  const sparkEndY = sparkH / 2 - (sparkRatio - 1) * (sparkH * 0.7);
  const sparkPath = `M0 ${sparkH / 2} Q${sparkW / 2} ${(sparkH / 2 + sparkEndY) / 2} ${sparkW} ${sparkEndY}`;

  return (
    <button
      type="button"
      onClick={onDetail}
      aria-label={`${stock.name} 상세 보기 및 거래`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '10px 12px',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--border-soft)',
        cursor: 'pointer',
        textAlign: 'left',
        font: 'inherit',
      }}
    >
      {/* 이모지 */}
      <span style={{ fontSize: '1.6rem', flexShrink: 0, width: 32, textAlign: 'center' }}>
        {stock.iconEmoji}
      </span>

      {/* 종목 정보 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {stock.name}
          </span>
          {currentYield > 0 && (
            <span style={{ fontSize: '0.6rem', color: 'var(--success)', fontWeight: 600, flexShrink: 0 }}>
              💎{currentYield.toFixed(1)}%
            </span>
          )}
        </div>
        {holding ? (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            보유 {holding.shares}주
            <span style={{ color: pnl >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700, marginLeft: 4 }}>
              {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            {stock.sector}
          </div>
        )}
      </div>

      {/* 미니 스파크라인 */}
      <svg width={sparkW} height={sparkH} viewBox={`0 0 ${sparkW} ${sparkH}`} style={{ flexShrink: 0 }} aria-hidden="true">
        <path d={sparkPath} stroke={trendColor} strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx={sparkW} cy={sparkEndY} r="2.5" fill={trendColor} />
      </svg>

      {/* 가격 + 등락률 */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 76 }}>
        <div style={{ fontWeight: 800, fontSize: 'var(--font-size-base)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
          {formatWon(price)}
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: trendColor, fontWeight: 700, marginTop: 1 }}>
          {arrow} {priceDiffPct >= 0 ? '+' : ''}{priceDiffPct.toFixed(1)}%
        </div>
      </div>
    </button>
  );
}
