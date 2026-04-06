import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore, STOCKS } from '../../store/gameStore';
import { createGameLoop, type GameLoopHandle } from '../../game/engine/gameLoop';
import { createVisibilityController } from '../../game/engine/visibility';
import { saveGame } from '../../store/persistence';
import { formatAge, progressFraction } from '../../game/engine/timeAxis';
import { formatWon } from '../../game/domain/asset';
import { emojiFor } from '../../game/domain/character';
import { EventModal } from './EventModal';
import { showToast } from '../components/Toast';
import { MilestonePopup, isMilestoneAge } from '../components/MilestonePopup';
import { ConfettiBurst } from '../components/MoneyAnimation';
import type { StockDef } from '../../game/types';

export function PlayScreen() {
  const loopRef = useRef<GameLoopHandle | null>(null);
  const [showMilestone, setShowMilestone] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevAgeRef = useRef(10);
  const prevDreamsRef = useRef(0);
  const phase = useGameStore((s) => s.phase);
  const character = useGameStore((s) => s.character);
  const cash = useGameStore((s) => s.cash);
  const bank = useGameStore((s) => s.bank);
  const holdings = useGameStore((s) => s.holdings);
  const prices = useGameStore((s) => s.prices);
  const job = useGameStore((s) => s.job);
  const dreams = useGameStore((s) => s.dreams);
  const traits = useGameStore((s) => s.traits);
  const npcs = useGameStore((s) => s.npcs);
  const speedMultiplier = useGameStore((s) => s.speedMultiplier);
  const advanceYear = useGameStore((s) => s.advanceYear);
  const endGame = useGameStore((s) => s.endGame);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const buy = useGameStore((s) => s.buy);
  const sell = useGameStore((s) => s.sell);
  const deposit = useGameStore((s) => s.deposit);
  const withdraw = useGameStore((s) => s.withdraw);

  const onIntAgeChange = useCallback(
    (newIntAge: number, deltaYears: number, _elapsedMs: number) => {
      advanceYear(newIntAge, deltaYears);
      // Save periodically
      if (newIntAge % 5 === 0) saveGame(useGameStore.getState());
    },
    [advanceYear],
  );

  const onFinished = useCallback(() => {
    endGame();
  }, [endGame]);

  useEffect(() => {
    const loop = createGameLoop({ onIntAgeChange, onFinished });
    loopRef.current = loop;
    const vis = createVisibilityController();
    vis.attach(
      () => loop.pause(),
      () => { if (useGameStore.getState().phase.kind === 'playing') loop.resume(); },
    );
    loop.start();
    return () => {
      loop.stop();
      vis.detach();
      saveGame(useGameStore.getState());
    };
  }, [onIntAgeChange, onFinished]);

  // Sync pause/resume with phase
  useEffect(() => {
    const loop = loopRef.current;
    if (!loop) return;
    if (phase.kind === 'paused') loop.pause();
    else if (phase.kind === 'playing') loop.resume();
    else if (phase.kind === 'ending') loop.stop();
  }, [phase]);

  // Sync speed
  useEffect(() => {
    loopRef.current?.setSpeed(speedMultiplier);
  }, [speedMultiplier]);

  // Milestone + toast triggers
  useEffect(() => {
    const intAge = Math.floor(character.age);
    if (intAge > prevAgeRef.current) {
      // Milestone popup every 10 years
      if (isMilestoneAge(intAge) && phase.kind === 'playing') {
        loopRef.current?.pause();
        setShowMilestone(intAge);
      }
      prevAgeRef.current = intAge;
    }
    // Dream achievement toast
    const achieved = dreams.filter((d) => d.achieved).length;
    if (achieved > prevDreamsRef.current) {
      const newDream = dreams.find(
        (d) => d.achieved && d.achievedAtAge === intAge,
      );
      if (newDream) {
        showToast(`꿈 달성! ${newDream.title}`, newDream.iconEmoji, 'achievement', 3500);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
      }
      prevDreamsRef.current = achieved;
    }
  }, [character.age, dreams, phase]);

  const handleMilestoneClose = () => {
    setShowMilestone(null);
    loopRef.current?.resume();
  };

  const progress = progressFraction(character.age);
  const stocksValue = holdings.reduce((s, h) => s + (prices[h.ticker] ?? 0) * h.shares, 0);
  const totalAssets = cash + bank.balance + stocksValue;

  // NPC ranking
  const sortedNpcs = [...npcs].sort((a, b) => b.currentAssets - a.currentAssets);
  const myRank = sortedNpcs.filter((n) => n.currentAssets > totalAssets).length + 1;

  return (
    <div className="app-container flex flex-col gap-sm" style={{ paddingBottom: 80 }}>
      {/* Age Timeline */}
      <div className="card">
        <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 'var(--sp-xs)' }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
            {formatAge(character.age)}
          </span>
          <SpeedControl current={speedMultiplier} onChange={setSpeed} />
        </div>
        <div className="progress-bar">
          <div className="progress-bar__fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="flex flex-between text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 2 }}>
          <span>10세</span>
          <span>100세</span>
        </div>
      </div>

      {/* Character */}
      <div className="card text-center">
        <div style={{ fontSize: '4rem', lineHeight: 1 }}>{emojiFor(character)}</div>
        <div style={{ fontWeight: 700, marginTop: 'var(--sp-xs)' }}>{character.name}</div>
        <div className="flex flex-center gap-md" style={{ marginTop: 'var(--sp-sm)' }}>
          <StatMini label="행복" value={character.happiness} emoji="💛" color="#ffd54f" />
          <StatMini label="건강" value={character.health} emoji="❤️" color="#ef5350" />
          <StatMini label="지혜" value={character.wisdom} emoji="📘" color="#42a5f5" />
          <StatMini label="매력" value={character.charisma} emoji="✨" color="#ab47bc" />
        </div>
        {job && (
          <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--sp-xs)' }}>
            {job.iconEmoji} {job.title} (월 {formatWon(job.salary)})
          </div>
        )}
        {traits.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 'var(--sp-xs)' }}>
            {traits.map((t) => (
              <span key={t} style={{
                background: 'var(--accent-light)',
                color: 'var(--accent)',
                padding: '1px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.65rem',
                fontWeight: 600,
              }}>#{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Dreams */}
      <div className="card">
        <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 'var(--sp-xs)' }}>
          <span style={{ fontWeight: 700 }}>🌟 나의 꿈</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent)' }}>
            {dreams.filter((d) => d.achieved).length}/{dreams.length}
          </span>
        </div>
        {dreams.map((d) => {
          const progress = dreamProgress(d, totalAssets, character.happiness, character.age, job);
          return (
            <div key={d.id} style={{ padding: '4px 0' }}>
              <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                <span>{d.iconEmoji}</span>
                <span style={{
                  fontSize: 'var(--font-size-sm)',
                  flex: 1,
                  textDecoration: d.achieved ? 'line-through' : 'none',
                  opacity: d.achieved ? 0.6 : 1,
                }}>
                  {d.title}
                </span>
                {d.achieved ? (
                  <span>✅</span>
                ) : (
                  <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                    {Math.round(progress * 100)}%
                  </span>
                )}
              </div>
              {!d.achieved && (
                <div style={{ height: 3, borderRadius: 2, background: '#eee', marginTop: 2, marginLeft: 28 }}>
                  <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.5s' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Assets */}
      <div className="card">
        <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 'var(--sp-sm)' }}>
          <span style={{ fontWeight: 700 }}>💰 자산</span>
          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatWon(totalAssets)}</span>
        </div>
        <div className="flex flex-col gap-xs">
          <AssetRow label="현금" value={cash} />
          <AssetRow label="예금" value={bank.balance} extra={`연 ${(bank.interestRate * 100).toFixed(1)}%`} />
          <AssetRow label="주식" value={stocksValue} />
        </div>
        <div className="flex gap-xs" style={{ marginTop: 'var(--sp-sm)' }}>
          <QuickActionBtn label="입금 10만" onClick={() => {
            if (deposit(Math.min(cash, 100000))) showToast('예금 완료!', '🏦', 'info', 1500);
          }} disabled={cash < 100000} />
          <QuickActionBtn label="출금 10만" onClick={() => {
            if (withdraw(Math.min(bank.balance, 100000))) showToast('출금 완료!', '💸', 'info', 1500);
          }} disabled={bank.balance < 100000} />
        </div>
      </div>

      {/* Stock Board */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 'var(--sp-sm)' }}>📈 주식</div>
        {STOCKS.slice(0, 8).map((s: StockDef) => {
          const price = prices[s.ticker] ?? s.basePrice;
          const holding = holdings.find((h) => h.ticker === s.ticker);
          return (
            <StockRow
              key={s.ticker}
              stock={s}
              price={price}
              holding={holding}
              onBuy={(n) => {
                if (buy(s.ticker, n)) showToast(`${s.name} ${n}주 매수!`, s.iconEmoji, 'success', 1500);
              }}
              onSell={(n) => {
                if (sell(s.ticker, n)) showToast(`${s.name} ${n}주 매도!`, s.iconEmoji, 'warning', 1500);
              }}
              canBuy={cash >= price}
            />
          );
        })}
      </div>

      {/* NPCs + Ranking */}
      <div className="card">
        <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 'var(--sp-sm)' }}>
          <span style={{ fontWeight: 700 }}>👥 라이벌</span>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: myRank <= 1 ? 'var(--grade-s)' : myRank <= 2 ? 'var(--accent)' : 'var(--text-muted)' }}>
            내 순위: {myRank}위/{npcs.length + 1}명
          </span>
        </div>
        {/* Player row */}
        <div className="npc-row" style={{ background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', padding: '4px 6px', marginBottom: 2 }}>
          <span style={{ fontSize: '1.2rem', width: 24, textAlign: 'center', fontWeight: 800 }}>
            {myRank === 1 ? '👑' : `${myRank}`}
          </span>
          <span style={{ fontSize: '1.2rem' }}>{emojiFor(character)}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{character.name} (나)</div>
          </div>
          <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--accent)' }}>
            {formatWon(totalAssets)}
          </div>
        </div>
        {sortedNpcs.map((npc, i) => {
          const rank = npc.currentAssets > totalAssets ? i + 1 : i + (myRank <= i + 1 ? 2 : 1);
          return (
            <div key={npc.id} className="npc-row">
              <span style={{ fontSize: '0.7rem', width: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                {rank}위
              </span>
              <span style={{ fontSize: '1.2rem' }}>{npc.iconEmoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{npc.name}</div>
                <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                  {npc.status}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                  {formatWon(npc.currentAssets)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Modal */}
      {phase.kind === 'paused' && <EventModal event={phase.event} />}

      {/* Milestone Popup */}
      {showMilestone && (
        <MilestonePopup
          age={showMilestone}
          totalAssets={totalAssets}
          dreamsAchieved={dreams.filter((d) => d.achieved).length}
          totalDreams={dreams.length}
          happiness={character.happiness}
          onClose={handleMilestoneClose}
        />
      )}

      {/* Confetti on dream achieved */}
      {showConfetti && <ConfettiBurst />}
    </div>
  );
}

function SpeedControl({ current, onChange }: { current: number; onChange: (s: 0.5 | 1 | 2) => void }) {
  const speeds: (0.5 | 1 | 2)[] = [0.5, 1, 2];
  return (
    <div className="flex gap-xs">
      {speeds.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          style={{
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 700,
            background: current === s ? 'var(--accent)' : 'var(--bg-secondary)',
            color: current === s ? '#fff' : 'var(--text-secondary)',
          }}
        >
          {s}x
        </button>
      ))}
    </div>
  );
}

function StatMini({ label, value, emoji, color }: { label: string; value: number; emoji: string; color?: string }) {
  const clr = color ?? 'var(--accent)';
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 'var(--font-size-xs)' }}>{emoji} {Math.round(value)}</div>
      <div style={{
        height: 5,
        borderRadius: 3,
        background: '#eee',
        marginTop: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: clr,
          borderRadius: 3,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <div className="text-muted" style={{ fontSize: '0.55rem', marginTop: 1 }}>{label}</div>
    </div>
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

function QuickActionBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      className="btn btn-secondary"
      style={{ flex: 1, fontSize: 'var(--font-size-sm)', minHeight: 36, opacity: disabled ? 0.4 : 1 }}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

function StockRow({
  stock, price, holding, onBuy, onSell, canBuy,
}: {
  stock: StockDef; price: number; holding?: { shares: number; avgBuyPrice: number };
  onBuy: (n: number) => void; onSell: (n: number) => void; canBuy: boolean;
}) {
  const pnl = holding ? (price - holding.avgBuyPrice) * holding.shares : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f5f0e8' }}>
      <span style={{ fontSize: '1.2rem', width: 28 }}>{stock.iconEmoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {stock.name}
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
      <div style={{ display: 'flex', gap: 3 }}>
        <TradBtn label="1" color="buy" onClick={() => onBuy(1)} disabled={!canBuy} />
        <TradBtn label="5" color="buy" onClick={() => onBuy(5)} disabled={!canBuy} />
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        <TradBtn label="1" color="sell" onClick={() => onSell(1)} disabled={!holding || holding.shares < 1} />
        <TradBtn label="전량" color="sell" onClick={() => onSell(holding?.shares ?? 0)} disabled={!holding || holding.shares < 1} />
      </div>
    </div>
  );
}

function TradBtn({ label, color, onClick, disabled }: { label: string; color: 'buy' | 'sell'; onClick: () => void; disabled: boolean }) {
  const isBuy = color === 'buy';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '2px 6px',
        borderRadius: 'var(--radius-sm)',
        background: disabled ? '#eee' : isBuy ? '#e8f5e9' : '#ffebee',
        color: disabled ? '#aaa' : isBuy ? 'var(--success)' : 'var(--danger)',
        fontSize: '0.65rem',
        fontWeight: 700,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        minWidth: 28,
      }}
    >
      {isBuy ? '▲' : '▼'}{label}
    </button>
  );
}

function dreamProgress(
  d: { targetCondition: { kind: string; value?: number; shares?: number; jobId?: string } },
  totalAssets: number,
  happiness: number,
  age: number,
  job: { id: string } | null,
): number {
  const cond = d.targetCondition;
  switch (cond.kind) {
    case 'totalAssetsGte':
    case 'cashGte':
      return Math.min(1, totalAssets / (cond.value ?? 1));
    case 'happinessGte':
      return Math.min(1, happiness / (cond.value ?? 1));
    case 'ageReached':
      return Math.min(1, age / (cond.value ?? 100));
    case 'stockOwnedShares':
      return 0; // can't compute without holdings here, show 0
    case 'jobHeld':
      return job?.id === cond.jobId ? 1 : 0;
    default:
      return 0;
  }
}
