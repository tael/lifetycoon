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
import { NewsTicker } from '../components/NewsTicker';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { PHASE_LABEL } from '../../game/engine/economyCycle';
import type { StockDef } from '../../game/types';
import type { EconomyPhase } from '../../game/engine/economyCycle';

export function PlayScreen() {
  const loopRef = useRef<GameLoopHandle | null>(null);
  const [showMilestone, setShowMilestone] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const [cycleTickerMsg, setCycleTickerMsg] = useState<string | undefined>(undefined);
  const prevCyclePhaseRef = useRef<EconomyPhase | null>(null);
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
  const keyMoments = useGameStore((s) => s.keyMoments);
  const npcs = useGameStore((s) => s.npcs);
  const speedMultiplier = useGameStore((s) => s.speedMultiplier);
  const autoInvest = useGameStore((s) => s.autoInvest);
  const economyCycle = useGameStore((s) => s.economyCycle);
  const advanceYear = useGameStore((s) => s.advanceYear);
  const endGame = useGameStore((s) => s.endGame);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const buy = useGameStore((s) => s.buy);
  const sell = useGameStore((s) => s.sell);
  const deposit = useGameStore((s) => s.deposit);
  const withdraw = useGameStore((s) => s.withdraw);
  const takeLoan = useGameStore((s) => s.takeLoan);
  const repayLoan = useGameStore((s) => s.repayLoan);

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

  // Play timer
  useEffect(() => {
    const t = setInterval(() => setPlayTime((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

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

  // Economy cycle change → NewsTicker alert
  useEffect(() => {
    if (!economyCycle) return;
    const prev = prevCyclePhaseRef.current;
    if (prev !== null && prev !== economyCycle.phase) {
      const msg = economyCycle.phase === 'boom'
        ? '🔥 경제 호황기 돌입! 주가 상승 기대감 고조'
        : economyCycle.phase === 'recession'
          ? '🥶 경기 침체 시작. 투자에 신중하세요'
          : '⚡ 경기가 안정세로 돌아왔습니다';
      setCycleTickerMsg(msg);
      setTimeout(() => setCycleTickerMsg(undefined), 5500);
    }
    prevCyclePhaseRef.current = economyCycle.phase;
  }, [economyCycle?.phase]);

  const handleMilestoneClose = () => {
    setShowMilestone(null);
    loopRef.current?.resume();
  };

  const progress = progressFraction(character.age);
  const stocksValue = holdings.reduce((s, h) => s + (prices[h.ticker] ?? 0) * h.shares, 0);
  const totalAssets = cash + bank.balance + stocksValue;

  // Previous total for Y-o-Y change
  const prevTotalRef = useRef(totalAssets);
  const assetDelta = totalAssets - prevTotalRef.current;

  // Update prev total when age changes
  useEffect(() => {
    const intA = Math.floor(character.age);
    if (intA !== prevAgeRef.current) {
      prevTotalRef.current = totalAssets;
    }
  }, [character.age, totalAssets]);

  // Stock portfolio return + dividends
  const totalCost = holdings.reduce((s, h) => s + h.avgBuyPrice * h.shares, 0);
  const dividendIncome = holdings.reduce((sum, h) => {
    const def = STOCKS.find((s) => s.ticker === h.ticker);
    const divRate = def?.dividendRate ?? 0;
    const price = prices[h.ticker] ?? 0;
    return sum + Math.round(price * h.shares * divRate);
  }, 0);
  const stockReturnPct = totalCost > 0
    ? `${((stocksValue / totalCost - 1) * 100).toFixed(1)}%`
    : undefined;

  // Yearly income
  const salaryYearly = job ? job.salary * 12 : 0;
  const interestYearly = Math.round(bank.balance * bank.interestRate);
  const intAge = Math.floor(character.age);
  const pensionYearly = intAge >= 65 ? 500000 : 0;
  const yearlyIncome = salaryYearly + interestYearly + dividendIncome + pensionYearly;

  // NPC ranking
  const sortedNpcs = [...npcs].sort((a, b) => b.currentAssets - a.currentAssets);
  const myRank = sortedNpcs.filter((n) => n.currentAssets > totalAssets).length + 1;

  return (
    <div className="app-container flex flex-col gap-sm" style={{
      paddingBottom: 80,
      background: ageGradient(Math.floor(character.age)),
      minHeight: '100dvh',
      transition: 'background 2s ease',
    }}>
      {/* News Ticker */}
      <NewsTicker age={character.age} forcedMessage={cycleTickerMsg} />

      {/* Age Timeline */}
      <div className="card">
        <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 'var(--sp-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
              {formatAge(character.age)}
            </span>
            <span className="text-muted" style={{ fontSize: '0.6rem' }}>
              ⏱{Math.floor(playTime / 60)}:{(playTime % 60).toString().padStart(2, '0')}
            </span>
            {economyCycle && (
              <span style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
                background: economyCycle.phase === 'boom'
                  ? '#fff3e0'
                  : economyCycle.phase === 'recession'
                    ? '#e3f2fd'
                    : '#f3e5f5',
                color: economyCycle.phase === 'boom'
                  ? '#e65100'
                  : economyCycle.phase === 'recession'
                    ? '#1565c0'
                    : '#6a1b9a',
              }}>
                {PHASE_LABEL[economyCycle.phase]}
              </span>
            )}
          </div>
          <SpeedControl current={speedMultiplier} onChange={setSpeed} />
        </div>
        <div className="progress-bar" style={{ position: 'relative' }}>
          <div className="progress-bar__fill" style={{ width: `${progress * 100}%` }} />
          {/* Milestone markers */}
          {[20, 30, 40, 50, 60, 70, 80, 90].map((a) => (
            <div key={a} style={{
              position: 'absolute',
              left: `${((a - 10) / 90) * 100}%`,
              top: -1,
              width: 2,
              height: 14,
              background: Math.floor(character.age) >= a ? 'var(--accent)' : 'rgba(0,0,0,0.1)',
              borderRadius: 1,
            }} />
          ))}
        </div>
        <div className="flex flex-between text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 2 }}>
          <span>10세</span>
          <span>100세</span>
        </div>
      </div>

      {/* Character */}
      <div className="card text-center">
        {/* Speech bubble */}
        <div style={{
          background: '#fff',
          border: '1px solid #eee',
          borderRadius: 'var(--radius-md)',
          padding: '4px 12px',
          fontSize: 'var(--font-size-xs)',
          display: 'inline-block',
          position: 'relative',
          marginBottom: 4,
          color: 'var(--text-secondary)',
          animation: 'fadeIn 0.5s ease-in',
        }}>
          {characterSpeech(character, totalAssets, myRank, Math.floor(character.age))}
          <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #eee' }} />
        </div>
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
        {/* Tamagotchi care buttons */}
        <div className="flex gap-xs" style={{ marginTop: 'var(--sp-sm)', justifyContent: 'center' }}>
          <CareBtn emoji="🍕" label="간식" cost={5000} stat="happiness" delta={5} />
          <CareBtn emoji="💊" label="건강" cost={10000} stat="health" delta={8} />
          <CareBtn emoji="📖" label="공부" cost={8000} stat="wisdom" delta={4} />
          <CareBtn emoji="🎤" label="노래" cost={3000} stat="charisma" delta={4} />
        </div>
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
          <AssetRow label="예금" value={bank.balance} extra={`연 ${(bank.interestRate * 100).toFixed(1)}%`} />
          <AssetRow label="주식" value={stocksValue} extra={stockReturnPct} />
          {bank.loanBalance > 0 && (
            <div className="flex flex-between" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--danger)' }}>대출</span>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--danger)' }}>
                -{formatWon(bank.loanBalance)}
                <span style={{ fontWeight: 400, fontSize: 'var(--font-size-xs)', marginLeft: 4 }}>
                  연 {(bank.loanInterestRate * 100).toFixed(1)}%
                </span>
              </span>
            </div>
          )}
        </div>
        {/* Income summary */}
        <div style={{
          marginTop: 'var(--sp-sm)',
          padding: 'var(--sp-xs) var(--sp-sm)',
          background: '#f8fff8',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--success)',
        }}>
          📥 연 수입: {formatWon(yearlyIncome)}
          <span className="text-muted" style={{ marginLeft: 8 }}>
            (월급 {formatWon(salaryYearly)} + 이자 {formatWon(interestYearly)} + 배당 {formatWon(dividendIncome)}{pensionYearly > 0 ? ` + 연금 ${formatWon(pensionYearly)}` : ''})
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 'var(--sp-sm)' }}>
          <QuickActionBtn label="입금 10만" onClick={() => {
            if (deposit(100000)) showToast('10만원 입금!', '🏦', 'info', 1200);
          }} disabled={cash < 100000} />
          <QuickActionBtn label="출금 10만" onClick={() => {
            if (withdraw(100000)) showToast('10만원 출금!', '💸', 'info', 1200);
          }} disabled={bank.balance < 100000} />
          <QuickActionBtn label="입금 100만" onClick={() => {
            if (deposit(1000000)) showToast('100만원 입금!', '🏦', 'success', 1200);
          }} disabled={cash < 1000000} />
          <QuickActionBtn label="전액 입금" onClick={() => {
            if (cash > 0 && deposit(cash)) showToast('전액 입금!', '🏦', 'success', 1200);
          }} disabled={cash <= 0} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
          <QuickActionBtn label="대출 10만" onClick={() => {
            if (takeLoan(100000)) showToast('10만원 대출!', '🏧', 'warning', 1500);
            else showToast('대출 한도 초과!', '🚫', 'danger', 1500);
          }} disabled={false} danger />
          <QuickActionBtn label="상환 10만" onClick={() => {
            if (repayLoan(100000)) showToast('10만원 상환!', '✅', 'success', 1200);
          }} disabled={bank.loanBalance < 100000 || cash < 100000} />
          <QuickActionBtn label="대출 100만" onClick={() => {
            if (takeLoan(1000000)) showToast('100만원 대출!', '🏧', 'warning', 1500);
            else showToast('대출 한도 초과!', '🚫', 'danger', 1500);
          }} disabled={false} danger />
          <QuickActionBtn label="상환 100만" onClick={() => {
            if (repayLoan(1000000)) showToast('100만원 상환!', '✅', 'success', 1200);
          }} disabled={bank.loanBalance < 1000000 || cash < 1000000} />
        </div>
      </div>

      {/* Stock Board */}
      <div className="card">
        <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 'var(--sp-sm)' }}>
          <span style={{ fontWeight: 700 }}>📈 주식</span>
          <div className="flex gap-sm" style={{ alignItems: 'center' }}>
            {dividendIncome > 0 && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--success)' }}>
                배당+{formatWon(dividendIncome)}
              </span>
            )}
            <button
              onClick={() => useGameStore.setState({ autoInvest: !autoInvest })}
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
          </div>
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
        }).map((s: StockDef) => {
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
                  {npc.currentAssets < totalAssets * 0.5
                    ? '😢 부러워...'
                    : npc.currentAssets > totalAssets * 2
                      ? '😏 나를 이겨봐!'
                      : npc.status}
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

      {/* Life Diary */}
      {keyMoments.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 'var(--sp-xs)' }}>📖 인생 일기</div>
          {[...keyMoments].reverse().slice(0, 5).map((m, i) => (
            <div key={i} style={{ fontSize: 'var(--font-size-xs)', padding: '2px 0', color: 'var(--text-secondary)', borderBottom: '1px solid #f5f0e8' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{Math.floor(m.age)}세</span> {m.text}
            </div>
          ))}
          {keyMoments.length > 5 && (
            <div className="text-muted" style={{ fontSize: '0.6rem', marginTop: 2 }}>
              ...외 {keyMoments.length - 5}개의 순간
            </div>
          )}
        </div>
      )}

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

      {/* First-play tutorial */}
      <TutorialOverlay />
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
  const isLow = value < 30;
  return (
    <div style={{ textAlign: 'center', flex: 1, animation: isLow ? 'statPulse 1s infinite' : 'none' }}>
      <div style={{ fontSize: 'var(--font-size-xs)', color: isLow ? 'var(--danger)' : 'inherit', fontWeight: isLow ? 700 : 400 }}>
        {emoji} {Math.round(value)}{isLow ? '⚠️' : ''}
      </div>
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
          background: isLow ? 'var(--danger)' : clr,
          borderRadius: 3,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <div className="text-muted" style={{ fontSize: '0.55rem', marginTop: 1 }}>{label}</div>
      <style>{`@keyframes statPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>
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
          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginLeft: 3, fontWeight: 400 }}>
            {stock.sector}
          </span>
          {stock.dividendRate > 0 && (
            <span style={{ fontSize: '0.55rem', color: 'var(--success)', marginLeft: 3, fontWeight: 400 }}>
              배당{(stock.dividendRate * 100).toFixed(0)}%
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

function CareBtn({ emoji, label, cost, stat, delta }: {
  emoji: string; label: string; cost: number; stat: string; delta: number;
}) {
  const cash = useGameStore((s) => s.cash);
  const character = useGameStore((s) => s.character);
  const disabled = cash < cost || (character as any)[stat] >= 95;
  return (
    <button
      onClick={() => {
        const st = useGameStore.getState();
        if (st.cash < cost) return;
        useGameStore.setState({
          cash: st.cash - cost,
          character: {
            ...st.character,
            [stat]: Math.min(100, (st.character as any)[stat] + delta),
          },
        });
        showToast(`${emoji} ${label}! +${delta}`, emoji, 'success', 1000);
      }}
      disabled={disabled}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: 'var(--radius-md)',
        background: disabled ? '#f5f5f5' : 'var(--bg-secondary)',
        border: '1px solid #eee',
        fontSize: '0.65rem',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
        minWidth: 48,
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
      <span>{label}</span>
      <span className="text-muted" style={{ fontSize: '0.55rem' }}>{formatWon(cost)}</span>
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

function characterSpeech(
  c: { happiness: number; health: number; wisdom: number; age: number },
  assets: number,
  rank: number,
  intAge: number,
): string {
  // Context-sensitive one-liner
  if (c.health < 30) return '몸이 안 좋아... 💊 좀 줘!';
  if (c.happiness < 25) return '우울해... 🍕 간식 먹고 싶다';
  if (rank === 1 && assets > 10000000) return '내가 1등이다! 히히 😎';
  if (rank >= 4) return '다들 나보다 잘하네... 분발하자!';
  if (intAge === 10) return '인생 시작! 두근두근!';
  if (intAge < 15) return '학교 끝나면 뭐하지~';
  if (intAge === 20) return '드디어 20대! 뭐든 할 수 있어!';
  if (intAge < 25) return '세상 넓다~ 도전해볼까?';
  if (intAge === 30) return '30대... 벌써? 시간 빠르다!';
  if (intAge < 40) return '열심히 일하는 중!';
  if (intAge === 50) return '반쯤 왔네! 아직 갈 길이 멀어';
  if (intAge < 60) return '경험이 쌓이니 좋다';
  if (intAge === 65) return '은퇴할 때가 됐나?';
  if (intAge < 75) return '여유가 좋구만~';
  if (intAge < 90) return '좋은 인생이었어...';
  if (intAge >= 95) return '100세까지 가보자!';
  if (c.happiness > 80) return '행복해! 😊';
  if (c.wisdom > 80) return '많이 배웠다!';
  if (assets > 50000000) return '부자다! 배당금 최고!';
  if (rank === 2) return '1등 바로 뒤야! 조금만 더!';
  if (assets < 100000) return '돈이 없다... 알바라도 해야 하나';
  return '오늘도 파이팅!';
}

function ageGradient(age: number): string {
  if (age < 15) return 'linear-gradient(180deg, #fffde7 0%, #fff8e1 100%)'; // 유년: 밝은 노랑
  if (age < 25) return 'linear-gradient(180deg, #e8f5e9 0%, #f1f8e9 100%)'; // 청년: 상쾌한 초록
  if (age < 40) return 'linear-gradient(180deg, #e3f2fd 0%, #e8eaf6 100%)'; // 성인: 시원한 파랑
  if (age < 55) return 'linear-gradient(180deg, #fff3e0 0%, #fbe9e7 100%)'; // 중년: 따뜻한 주황
  if (age < 70) return 'linear-gradient(180deg, #fce4ec 0%, #f3e5f5 100%)'; // 장년: 부드러운 핑크
  if (age < 85) return 'linear-gradient(180deg, #ede7f6 0%, #e8eaf6 100%)'; // 노년: 차분한 보라
  return 'linear-gradient(180deg, #efebe9 0%, #d7ccc8 100%)'; // 말년: 포근한 베이지
}
