import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { createGameLoop, type GameLoopHandle } from '../../game/engine/gameLoop';
import { monthsToMs } from '../../game/engine/timeAxis';
import { createVisibilityController } from '../../game/engine/visibility';
import { saveGame } from '../../store/persistence';
import { formatAge, progressFraction } from '../../game/engine/timeAxis';
import { formatWon } from '../../game/domain/asset';
import { ageSalaryMultiplier } from '../../game/domain/salaryCurve';
import { emojiFor, computeStatPenalty, costOfLivingMultiplier } from '../../game/domain/character';
import { EventModal } from './EventModal';
import { SkillModal } from './SkillModal';
import { showToast } from '../components/Toast';
import { MilestonePopup, isMilestoneAge } from '../components/MilestonePopup';
import { ConfettiBurst } from '../components/MoneyAnimation';
import { NewsTicker } from '../components/NewsTicker';
import { DebtBadge } from '../components/DebtBadge';
import { AssetCompositionBar } from '../components/AssetCompositionBar';
import { AssetChart } from '../components/AssetChart';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { StockQuizMiniGame } from '../components/StockQuizMiniGame';
import { PHASE_LABEL } from '../../game/engine/economyCycle';
import type { EconomyPhase } from '../../game/engine/economyCycle';
import { KEY_SHOW_STAT_HINTS, SettingsModal } from '../components/SettingsModal';
import { computeCrisisLevel } from '../../game/domain/crisisEngine';
import { usePlayDerived } from '../hooks/usePlayDerived';
import { BankTab } from './tabs/BankTab';
import { InvestTab } from './tabs/InvestTab';
import { CashflowTab } from './tabs/CashflowTab';
import { Icon } from '../icons/Icon';

export function PlayScreen() {
  const loopRef = useRef<GameLoopHandle | null>(null);
  const [showMilestone, setShowMilestone] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [lastQuizAge, setLastQuizAge] = useState<number | null>(null);
  const [cycleTickerMsg, setCycleTickerMsg] = useState<string | undefined>(undefined);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [tab, setTab] = useState<'home' | 'cashflow' | 'bank' | 'assets' | 'friends'>('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showAdultModal, setShowAdultModal] = useState(false);
  const [dreamExpanded, setDreamExpanded] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [showStatHints] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY_SHOW_STAT_HINTS) === 'true'; } catch { return false; }
  });
  const prevCyclePhaseRef = useRef<EconomyPhase | null>(null);
  const prevAgeRef = useRef(10);
  const prevDreamsRef = useRef(0);
  const phase = useGameStore((s) => s.phase);
  const character = useGameStore((s) => s.character);
  const cash = useGameStore((s) => s.cash);
  const bank = useGameStore((s) => s.bank);
  const job = useGameStore((s) => s.job);
  const dreams = useGameStore((s) => s.dreams);
  const traits = useGameStore((s) => s.traits);
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const keyMoments = useGameStore((s) => s.keyMoments);
  const npcs = useGameStore((s) => s.npcs);
  const speedMultiplier = useGameStore((s) => s.speedMultiplier);
  const bonds = useGameStore((s) => s.bonds);
  const assetHistory = useGameStore((s) => s.assetHistory);
  const economyCycle = useGameStore((s) => s.economyCycle);
  const advanceYear = useGameStore((s) => s.advanceYear);
  const endGame = useGameStore((s) => s.endGame);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const totalTaxPaid = useGameStore((s) => s.totalTaxPaid);
  const splitNotices = useGameStore((s) => s.splitNotices);
  const clearSplitNotices = useGameStore((s) => s.clearSplitNotices);

  const {
    stocksValue,
    realEstateValue,
    totalAssets,
    dividendIncome,
    effectiveInterestRate,
    intAge,
    cashflow,
    displayAge,
    onDisplayAgeChange,
  } = usePlayDerived();

  const onIntAgeChange = useCallback(
    (newIntAge: number, deltaYears: number, _elapsedMs: number) => {
      advanceYear(newIntAge, deltaYears);
      if (newIntAge % 5 === 0) saveGame(useGameStore.getState());
    },
    [advanceYear],
  );

  const onFinished = useCallback(() => {
    endGame();
  }, [endGame]);

  useEffect(() => {
    const loop = createGameLoop({ onIntAgeChange, onFinished, onDisplayAgeChange });
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
    if (showSettings || showAdultModal) {
      loop.pause();
      return;
    }
    if (phase.kind === 'paused') loop.pause();
    else if (phase.kind === 'playing') loop.resume();
    else if (phase.kind === 'ending') loop.stop();
  }, [phase, showSettings, showAdultModal]);

  // Sync speed
  useEffect(() => {
    loopRef.current?.setSpeed(speedMultiplier);
  }, [speedMultiplier]);

  // Milestone + toast triggers
  useEffect(() => {
    const intAge = Math.floor(character.age);
    if (intAge > prevAgeRef.current) {
      if (isMilestoneAge(intAge) && phase.kind === 'playing') {
        loopRef.current?.pause();
        setShowMilestone(intAge);
      }
      if (intAge === 19) {
        showToast('부모님의 용돈이 끝났습니다. 이제 스스로 벌어야 합니다.', '🎒', 'info', 4000);
        loopRef.current?.pause();
        setShowAdultModal(true);
      }
      prevAgeRef.current = intAge;
    }
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

  // 액면분할 알림
  useEffect(() => {
    if (splitNotices.length === 0) return;
    for (const msg of splitNotices) {
      showToast(msg, undefined, 'achievement', 4000);
    }
    clearSplitNotices();
  }, [splitNotices, clearSplitNotices]);

  // Economy cycle change -> NewsTicker alert
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

  const handleAdultModalClose = () => {
    setShowAdultModal(false);
    loopRef.current?.resume();
  };

  const progress = progressFraction(character.age);

  // Previous total for Y-o-Y change
  const prevTotalRef = useRef(totalAssets);
  const assetDelta = totalAssets - prevTotalRef.current;

  useEffect(() => {
    const intA = Math.floor(character.age);
    if (intA !== prevAgeRef.current) {
      prevTotalRef.current = totalAssets;
    }
  }, [character.age, totalAssets]);

  // 재정 자유 트레이트 부여
  const prevFreeRef = useRef(false);
  useEffect(() => {
    if (!cashflow.financiallyFree) {
      prevFreeRef.current = false;
      return;
    }
    if (prevFreeRef.current) return;
    prevFreeRef.current = true;
    if (traits.includes('재정 자유')) return;
    useGameStore.setState((s) => ({ traits: [...s.traits, '재정 자유'] }));
    showToast(
      '재정 자유 상태에 도달했습니다. 자동수입이 월 지출을 넘었습니다.',
      '💎',
      'achievement',
      4000,
    );
  }, [cashflow.financiallyFree, traits]);

  // NPC ranking
  const sortedNpcs = [...npcs].sort((a, b) => b.currentAssets - a.currentAssets);
  const myRank = sortedNpcs.filter((n) => n.currentAssets > totalAssets).length + 1;

  return (
    <div className="app-container flex flex-col gap-sm" style={{
      paddingBottom: 96,
      background: ageGradient(Math.floor(character.age)),
      minHeight: '100dvh',
      transition: 'background 2s ease',
    }}>
      {/* News Ticker */}
      <NewsTicker age={character.age} forcedMessage={cycleTickerMsg} />

      {/* 부채 뱃지 */}
      <DebtBadge />

      {/* Sticky Age Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(250, 247, 242, 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: 'var(--sp-sm) var(--sp-md)',
        marginLeft: 'calc(-1 * var(--sp-md))',
        marginRight: 'calc(-1 * var(--sp-md))',
        borderBottom: '2.5px solid var(--border-duo)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
              {formatAge(displayAge)}
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

      {/* Hero KPI + Character — 홈 탭에서만 통합 */}
      {tab === 'home' && (
        <>
          {/* Hero KPIs */}
          <div className="hero-kpi">
            <div className="hero-kpi__item" style={{ background: 'var(--section-assets)' }}>
              <div className="hero-kpi__label">총 자산</div>
              <div className="hero-kpi__value hero-kpi__value--accent">{formatWon(totalAssets)}</div>
            </div>
            <div className="hero-kpi__item" style={{ background: cashflow.netCashflow >= 0 ? 'var(--section-assets)' : '#fff5f5' }}>
              <div className="hero-kpi__label">이달 순수입</div>
              <div className={`hero-kpi__value ${cashflow.netCashflow >= 0 ? 'hero-kpi__value--positive' : 'hero-kpi__value--negative'}`}>
                {cashflow.netCashflow >= 0 ? '+' : ''}{formatWon(Math.round(cashflow.netCashflow / 12))}
              </div>
            </div>
          </div>

          {/* Character HUD */}
          <div className="card card--character" style={{ marginBottom: 8 }}>
            <div className="char-hud">
              <div className="char-hud__avatar" role="img" aria-label={`${character.name} ${Math.floor(character.age)}세`}>
                <Icon slot="nav-friends" size={28} />
              </div>
              <div className="char-hud__info">
                <div className="char-hud__name">{character.name}</div>
                <div className="char-hud__sub">
                  {job ? `${job.title} · 월 ${formatWon(Math.round(job.salary * ageSalaryMultiplier(intAge, job.id)))}` : '무직'}
                </div>
              </div>
              <div className="char-hud__actions">
                <div style={{ position: 'relative' }}>
                  <button
                    className="char-hud__action-btn"
                    onClick={() => setShowSkillModal(true)}
                    title="스킬"
                    aria-label="스킬 모달"
                  >
                    <Icon slot="stat-wisdom" size={16} />
                    {unlockedSkills.length > 0 && (
                      <span style={{ position: 'absolute', top: -2, right: -2, background: 'var(--accent)', color: '#fff', borderRadius: '50%', width: 12, height: 12, fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{unlockedSkills.length}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="stat-chips" style={{ padding: '0 10px 8px' }}>
              <StatMini label="행복" value={character.happiness} emoji="💛" color="#f59e0b" showHints={showStatHints} />
              <StatMini label="건강" value={character.health} emoji="❤️" color="#ef4444" showHints={showStatHints} />
              <StatMini label="지혜" value={character.wisdom} emoji="📘" color="#3b82f6" showHints={showStatHints} />
              <StatMini label="매력" value={character.charisma} emoji="✨" color="#a855f7" showHints={showStatHints} />
            </div>

            {/* Penalty */}
            {(() => {
              const penalty = computeStatPenalty(character);
              if (penalty.reasons.length === 0) return null;
              return (
                <div role="status" style={{ margin: '0 10px 6px', padding: '4px 8px', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 6, color: 'var(--danger)', fontSize: '0.62rem', fontWeight: 600 }}>
                  <Icon slot="status-alert" size={12} style={{ marginRight: 3 }} />
                  {penalty.reasons.join(' · ')}
                </div>
              );
            })()}

            {/* Care actions */}
            <div className="action-strip" style={{ padding: '0 10px 10px' }}>
              <CareBtn emoji="🍕" label="간식" cost={5000} stat="happiness" delta={5} effectEmoji="😊" effectLabel="행복" timeCostMonths={0} loopRef={loopRef} />
              <CareBtn emoji="💊" label="건강" cost={10000} stat="health" delta={8} effectEmoji="❤️" effectLabel="건강" timeCostMonths={1} loopRef={loopRef} />
              <CareBtn emoji="📖" label="공부" cost={8000} stat="wisdom" delta={4} effectEmoji="📘" effectLabel="지혜" timeCostMonths={2} loopRef={loopRef} />
              <CareBtn emoji="🎤" label="노래" cost={3000} stat="charisma" delta={4} effectEmoji="✨" effectLabel="매력" timeCostMonths={1} loopRef={loopRef} />
            </div>

            {/* Traits */}
            {traits.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '0 10px 8px' }}>
                {traits.slice(0, 5).map((t) => (
                  <span key={t} style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 99, fontSize: '0.58rem', fontWeight: 600 }}>#{t}</span>
                ))}
                {traits.length > 5 && <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', padding: '1px 4px' }}>+{traits.length - 5}</span>}
              </div>
            )}
          </div>
        </>
      )}

      {/* 위기 뱃지 — 홈 탭에서만 */}
      {tab === 'home' && (() => {
        const crisisLevel = computeCrisisLevel({
          netCashflow: cashflow.netCashflow / 12,
          monthlyExpense: cashflow.totalExpense / 12,
          totalAssets,
          cash,
        });
        if (crisisLevel === 'safe' || crisisLevel === 'yellow') return null;
        const badgeConfig = crisisLevel === 'red'
          ? { emoji: '🔴', label: '긴급 상황', bg: '#ffebee', border: '#ef9a9a', color: '#c62828' }
          : { emoji: '🟠', label: '생활비 위기', bg: '#fff3e0', border: '#ffcc80', color: '#e65100' };
        return (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: badgeConfig.bg,
              border: `1px solid ${badgeConfig.border}`,
              borderRadius: 'var(--radius-sm)',
              color: badgeConfig.color,
              fontWeight: 700,
              fontSize: 'var(--font-size-sm)',
            }}
          >
            <span>{badgeConfig.emoji}</span>
            <span>{badgeConfig.label}</span>
          </div>
        );
      })()}

      {/* Dreams — 홈 탭에서만 */}
      {tab === 'home' && (
      <div
        className="card bg-gradient-dream"
        style={{
          border: '2px solid var(--accent)',
          padding: 'var(--sp-sm) var(--sp-md)',
          cursor: 'pointer',
        }}
        onClick={() => setDreamExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDreamExpanded((v) => !v); }}
        aria-expanded={dreamExpanded}
        aria-label="꿈 패널 접기/펼치기"
      >
        <div className="flex flex-between" style={{ alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)' }}>
            🌟 나의 꿈 {dreams.filter((d) => d.achieved).length}/{dreams.length}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 60, height: 6, borderRadius: 3, background: '#f0e8d0', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${dreams.length > 0 ? Math.round((dreams.filter((d) => d.achieved).length / dreams.length) * 100) : 0}%`,
                background: 'var(--accent)',
                borderRadius: 3,
                transition: 'width 0.5s',
              }} />
            </div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              {dreamExpanded ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {dreamExpanded && (
          <div style={{ marginTop: 'var(--sp-xs)' }} onClick={(e) => e.stopPropagation()}>
            {dreams.map((d) => {
              const progress = dreamProgress(d, totalAssets, character.happiness, character.age, job);
              const pct = Math.round(progress * 100);
              const cond = d.targetCondition;
              let relationText = '';
              if (!d.achieved) {
                if (cond.kind === 'totalAssetsGte') {
                  const need = Math.max(0, cond.value - totalAssets);
                  relationText = need > 0 ? `앞으로 ${formatWon(need)} 더` : '곧 달성!';
                } else if (cond.kind === 'cashGte') {
                  const need = Math.max(0, cond.value - cash);
                  relationText = need > 0 ? `현금 ${formatWon(need)} 더` : '곧 달성!';
                } else if (cond.kind === 'ageReached') {
                  const yearsLeft = Math.max(0, cond.value - Math.floor(character.age));
                  relationText = yearsLeft > 0 ? `${yearsLeft}년 후` : '곧 달성!';
                } else if (cond.kind === 'happinessGte') {
                  relationText = '😊 행복도';
                } else if (cond.kind === 'wisdomGte') {
                  relationText = '📘 지혜';
                } else if (cond.kind === 'charismaGte') {
                  relationText = '✨ 매력';
                } else if (cond.kind === 'stockOwnedShares') {
                  relationText = `📈 ${cond.ticker}`;
                } else if (cond.kind === 'jobHeld') {
                  relationText = '💼 직업';
                } else if (cond.kind === 'hasTrait' || cond.kind === 'hasTraitAny') {
                  relationText = '🏷️ 특성';
                } else if (cond.kind === 'realEstateCountGte') {
                  relationText = `🏠 부동산 ${cond.value}개`;
                }
              }
              return (
                <div key={d.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 0',
                  borderTop: '1px dashed #f0e8d0',
                  fontSize: 'var(--font-size-sm)',
                }}>
                  <span style={{ fontSize: '1rem', width: 20, flexShrink: 0 }}>{d.iconEmoji}</span>
                  <span style={{
                    flex: 1,
                    fontWeight: 600,
                    textDecoration: d.achieved ? 'line-through' : 'none',
                    opacity: d.achieved ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {d.title}
                  </span>
                  {!d.achieved && relationText && (
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {relationText}
                    </span>
                  )}
                  {d.achieved ? (
                    <span style={{ fontSize: '0.9rem', flexShrink: 0 }}><Icon slot="status-check" size="md" /></span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <div style={{ width: 40, height: 4, borderRadius: 2, background: '#f0e8d0', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: pct >= 80 ? 'var(--success)' : 'var(--accent)',
                          borderRadius: 2,
                        }} />
                      </div>
                      <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        color: pct >= 80 ? 'var(--success)' : pct >= 40 ? 'var(--accent)' : 'var(--text-muted)',
                        minWidth: 24,
                        textAlign: 'right',
                      }}>
                        {pct}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Cashflow Tab */}
      {tab === 'cashflow' && (
        <CashflowTab
          cashflow={cashflow}
          totalTaxPaid={totalTaxPaid}
        />
      )}

      {/* Bank Tab */}
      {tab === 'bank' && (
        <BankTab
          effectiveInterestRate={effectiveInterestRate}
          totalAssets={totalAssets}
        />
      )}

      {/* Home tab: 자산 요약 */}
      {tab === 'home' && (
      <div className="card">
        {(() => {
          const monthlyNet = Math.round(cashflow.netCashflow / 12);
          const netPositive = monthlyNet >= 0;
          const monthlyPassive = Math.round(cashflow.passiveIncome / 12);
          return (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 'var(--sp-sm)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 2 }}><Icon slot="asset-total" size="md" /> 월 순수입</div>
                  <div className="num-big" style={{ fontSize: 'var(--font-size-lg)', color: netPositive ? 'var(--success)' : 'var(--danger, #c62828)' }}>
                    {netPositive ? '+' : '-'}{formatWon(Math.abs(monthlyNet))}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 2 }}><Icon slot="nav-invest" size="md" /> 총 자산</div>
                  <div className="num-big" style={{ fontSize: 'var(--font-size-lg)', color: 'var(--accent)' }}>
                    {formatWon(totalAssets)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 'var(--sp-sm)' }}>
                <div style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--accent)' }}>
                  💎 자동수입 월 {formatWon(monthlyPassive)}
                </div>
                <div style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: bank.loanBalance > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {bank.loanBalance > 0 ? `💳 부채 ${formatWon(bank.loanBalance)}` : '💳 부채 없음'}
                </div>
              </div>
              {assetDelta !== 0 && (
                <div style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', color: assetDelta > 0 ? 'var(--success)' : 'var(--danger)', marginBottom: 'var(--sp-xs)' }}>
                  자산 {assetDelta > 0 ? '▲' : '▼'}{formatWon(Math.abs(assetDelta))}
                </div>
              )}
              <AssetCompositionBar
                segments={[
                  { label: '현금', value: cash, color: '#2196f3', emoji: '💵' },
                  { label: '예금', value: bank.balance, color: '#42a5f5', emoji: '🏦' },
                  { label: '주식', value: stocksValue, color: '#4caf50', emoji: '📈' },
                  { label: '부동산', value: realEstateValue, color: '#ff9800', emoji: '🏠' },
                  { label: '채권', value: bonds.reduce((s, b) => s + b.faceValue, 0), color: '#9c27b0', emoji: '📜' },
                ]}
                total={totalAssets}
              />
              {/* 자산 추이 차트 (접이식) */}
              <div style={{ marginTop: 'var(--sp-xs)' }}>
                <button
                  onClick={() => setChartExpanded((v) => !v)}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '4px 0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span><Icon slot="nav-invest" size="md" /> 자산 추이</span>
                  <span style={{ fontSize: 10 }}>{chartExpanded ? '▲' : '▼'}</span>
                </button>
                {chartExpanded && (
                  assetHistory.length < 2
                    ? (
                      <div style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', padding: '8px 0' }}>
                        데이터 수집 중...
                      </div>
                    )
                    : <AssetChart data={assetHistory} />
                )}
              </div>
            </>
          );
        })()}
        {/* 홈 탭: 다음 꿈 목표선 오버레이 */}
        {(() => {
          const nextMoneyDream = dreams.find((d) => !d.achieved && (d.targetCondition.kind === 'totalAssetsGte' || d.targetCondition.kind === 'cashGte'));
          if (!nextMoneyDream) return null;
          const cond = nextMoneyDream.targetCondition;
          const target = (cond.kind === 'totalAssetsGte' || cond.kind === 'cashGte') ? cond.value : 0;
          const haveNow = cond.kind === 'cashGte' ? cash : totalAssets;
          const pct = Math.min(100, Math.round((haveNow / Math.max(1, target)) * 100));
          return (
            <div style={{ marginTop: 'var(--sp-sm)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
                {nextMoneyDream.iconEmoji} {nextMoneyDream.title}까지 {pct}%
              </div>
              <div style={{ height: 8, borderRadius: 4, background: '#f0e8d0', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: pct >= 80 ? 'var(--success)' : 'var(--accent)',
                  borderRadius: 4,
                  transition: 'width 0.5s',
                }} />
              </div>
            </div>
          );
        })()}
      </div>
      )}

      {/* Assets Tab */}
      {tab === 'assets' && (
        <InvestTab
          dividendIncome={dividendIncome}
          selectedStock={selectedStock}
          setSelectedStock={setSelectedStock}
        />
      )}

      {/* NPCs + Ranking — 친구 탭 */}
      {tab === 'friends' && (
      <div className="card">
        <div className="flex flex-between" style={{ alignItems: 'center', marginBottom: 'var(--sp-sm)' }}>
          <span style={{ fontWeight: 700 }}><Icon slot="nav-friends" size="md" /> 라이벌</span>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: myRank <= 1 ? 'var(--grade-s)' : myRank <= 2 ? 'var(--accent)' : 'var(--text-muted)' }}>
            내 순위: {myRank}위/{npcs.length + 1}명
          </span>
        </div>
        <div className="npc-row" style={{ background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', padding: '4px 6px', marginBottom: 2 }}>
          <span style={{ fontSize: myRank === 1 ? '1.2rem' : 'var(--font-size-xs)', minWidth: 28, textAlign: 'center', fontWeight: 800 }}>
            {myRank === 1 ? '👑' : `${myRank}위`}
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
      )}

      {/* Life Diary — 친구 탭 */}
      {tab === 'friends' && keyMoments.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 'var(--sp-xs)' }}><Icon slot="stat-wisdom" size="md" /> 인생 일기</div>
          {[...keyMoments].reverse().slice(0, 5).map((m, i, arr) => (
            <div key={i} style={{ fontSize: 'var(--font-size-xs)', padding: '3px 0', color: 'var(--text-secondary)', borderBottom: i < arr.length - 1 ? '1px solid #f5f0e8' : 'none' }}>
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
      {phase.kind === 'paused' && <EventModal event={phase.event} loopRef={loopRef} />}

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

      {showConfetti && <ConfettiBurst />}

      {showSkillModal && <SkillModal onClose={() => setShowSkillModal(false)} />}

      {/* Stock Quiz modal */}
      {showQuizModal && (
        <StockQuizMiniGame
          seed={Math.floor(character.age) * 31 + (character.wisdom | 0)}
          onClose={(result) => {
            setShowQuizModal(false);
            if (result !== null) {
              setLastQuizAge(Math.floor(character.age));
              const wisdomGain = result.correct ? 5 : 2;
              const cashGain = result.correct ? 100000 : 0;
              useGameStore.setState((s) => ({
                character: {
                  ...s.character,
                  wisdom: Math.min(100, s.character.wisdom + wisdomGain),
                },
                cash: s.cash + cashGain,
              }));
              if (result.correct) {
                showToast('주식 퀴즈 정답! 지혜+5, +10만원', '🎯', 'achievement', 3000);
              } else {
                showToast('아쉽지만 실패! 지혜+2 (교훈)', '📘', 'info', 2500);
              }
            }
          }}
        />
      )}

      <TutorialOverlay />
      <TabBar tab={tab} onChange={setTab} onOpenSettings={() => setShowSettings(true)} />
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showAdultModal && <AdultTransitionModal onClose={handleAdultModalClose} />}
    </div>
  );
}

type MainTab = 'home' | 'cashflow' | 'bank' | 'assets' | 'friends';

function TabBar({ tab, onChange, onOpenSettings }: {
  tab: MainTab;
  onChange: (t: MainTab) => void;
  onOpenSettings: () => void;
}) {
  const items: { key: MainTab | 'settings'; emoji: string; label: string; isAction?: boolean }[] = [
    { key: 'home', emoji: '🏠', label: '홈' },
    { key: 'cashflow', emoji: '💰', label: '현금흐름' },
    { key: 'bank', emoji: '🏦', label: '은행' },
    { key: 'assets', emoji: '📊', label: '자산' },
    { key: 'friends', emoji: '👥', label: '친구' },
    { key: 'settings', emoji: '⚙️', label: '설정', isAction: true },
  ];
  return (
    <div
      role="tablist"
      aria-label="메인 메뉴"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        background: 'rgba(255,255,255,0.97)',
        borderTop: '2.5px solid var(--border-duo)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.10)',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        paddingTop: 4,
      }}
    >
      {items.map((it) => {
        const active = !it.isAction && tab === it.key;
        const handleClick = () => {
          if (it.isAction) onOpenSettings();
          else onChange(it.key as MainTab);
        };
        return (
          <button
            key={it.key}
            role={it.isAction ? 'button' : 'tab'}
            aria-selected={it.isAction ? undefined : active}
            aria-label={it.isAction ? '설정 열기' : undefined}
            onClick={handleClick}
            style={{
              flex: 1,
              minHeight: 56,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              border: 'none',
              cursor: 'pointer',
              padding: '4px 2px 6px',
              background: 'transparent',
              position: 'relative',
              ...(active ? {
                color: 'var(--accent)',
              } : {
                color: 'var(--text-secondary)',
                opacity: 0.7,
              }),
            }}
          >
            {active && (
              <span style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 24,
                height: 3,
                borderRadius: '0 0 3px 3px',
                background: 'var(--accent)',
              }} />
            )}
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 28,
              borderRadius: 14,
              background: active ? 'var(--accent-light)' : 'transparent',
              transition: 'all 0.15s ease',
              marginBottom: 1,
            }}>
              <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{it.emoji}</span>
            </span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: active ? 700 : 500,
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}>
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SpeedControl({ current, onChange }: { current: number; onChange: (s: 0.5 | 1 | 2) => void }) {
  const speeds: (0.5 | 1 | 2)[] = [0.5, 1, 2];
  return (
    <div className="flex gap-xs" role="group" aria-label="게임 속도">
      {speeds.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          aria-label={`속도 ${s}배`}
          aria-pressed={current === s}
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

function StatMini({ label, value, color, showHints: _showHints }: {
  label: string; value: number; emoji?: string; color: string; showHints?: boolean;
}) {
  const iconSlot = label === '행복' ? 'stat-happiness' as const
    : label === '건강' ? 'stat-health' as const
    : label === '지혜' ? 'stat-wisdom' as const
    : 'stat-charisma' as const;
  const isLow = value < 30;
  return (
    <div className="stat-chip">
      <Icon slot={iconSlot} size={18} className="stat-chip__icon" />
      <span className="stat-chip__value" style={{ color: isLow ? 'var(--danger)' : color }}>{value}</span>
      <div className="stat-chip__bar">
        <div
          className={`stat-chip__bar-fill${isLow ? ' stat-chip__bar-fill--low' : ''}`}
          style={{ width: `${value}%`, background: isLow ? 'var(--danger)' : color }}
        />
      </div>
    </div>
  );
}

function CareBtn({ emoji: _emoji, label, cost, stat, delta, loopRef, timeCostMonths }: {
  emoji: string; label: string; cost: number; stat: 'happiness' | 'health' | 'wisdom' | 'charisma';
  delta: number; effectEmoji?: string; effectLabel?: string; timeCostMonths: number; loopRef: React.RefObject<GameLoopHandle | null>;
}) {
  const character = useGameStore((s) => s.character);
  const cash = useGameStore((s) => s.cash);
  const canAfford = cash >= cost;
  const iconSlot = stat === 'happiness' ? 'stat-happiness' as const
    : stat === 'health' ? 'stat-health' as const
    : stat === 'wisdom' ? 'stat-wisdom' as const
    : 'stat-charisma' as const;

  const handleCare = () => {
    if (!canAfford) { showToast('현금이 부족해요', undefined, 'danger', 1200); return; }
    const st = useGameStore.getState();
    const penalty = computeStatPenalty(st.character);
    const colMult = costOfLivingMultiplier(st.costOfLivingRatio);
    const effectiveDelta = Math.max(1, Math.round(delta * penalty.careEffMult * colMult.careBoost));
    useGameStore.setState({
      cash: st.cash - cost,
      character: {
        ...st.character,
        [stat]: Math.min(100, st.character[stat] + effectiveDelta),
      },
    });
    if (timeCostMonths > 0 && loopRef.current) {
      loopRef.current.addElapsedMs(monthsToMs(timeCostMonths));
    }
    showToast(`${label} +${effectiveDelta}`, undefined, 'success', 1000);
  };

  return (
    <button
      className="action-strip__btn"
      onClick={handleCare}
      disabled={!canAfford || character[stat] >= 100}
      style={{ opacity: canAfford ? 1 : 0.45 }}
    >
      <Icon slot={iconSlot} size={22} className="action-strip__icon" />
      <span className="action-strip__label">{label}</span>
      <span className="action-strip__cost">{formatWon(cost)}</span>
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
      return 0;
    case 'jobHeld':
      return job?.id === cond.jobId ? 1 : 0;
    default:
      return 0;
  }
}

function ageGradient(age: number): string {
  if (age < 15) return 'linear-gradient(180deg, #fffde7 0%, #fff8e1 100%)';
  if (age < 25) return 'linear-gradient(180deg, #e8f5e9 0%, #f1f8e9 100%)';
  if (age < 40) return 'linear-gradient(180deg, #e3f2fd 0%, #e8eaf6 100%)';
  if (age < 55) return 'linear-gradient(180deg, #fff3e0 0%, #fbe9e7 100%)';
  if (age < 70) return 'linear-gradient(180deg, #fce4ec 0%, #f3e5f5 100%)';
  if (age < 85) return 'linear-gradient(180deg, #ede7f6 0%, #e8eaf6 100%)';
  return 'linear-gradient(180deg, #efebe9 0%, #d7ccc8 100%)';
}

function AdultTransitionModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '340px',
        padding: '32px 24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center',
        animation: 'modalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎊</div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '16px', color: 'var(--accent)' }}>
          어른이 되었어요
        </h2>
        <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#444', marginBottom: '24px', wordBreak: 'keep-all' }}>
          이제 부모님의 용돈이 끝났어요.<br />
          월급을 벌고, 생활비를 내고, 저축도 해야 해요.
        </p>

        <div style={{
          background: '#f8f9fa',
          borderRadius: '16px',
          padding: '16px',
          textAlign: 'left',
          marginBottom: '28px',
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '12px', color: '#666' }}>💡 생존 팁</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              '직업을 꼭 구해서 월급을 받으세요',
              '매달 나가는 생활비를 먼저 확인하세요',
              '대출은 꼭 필요할 때만 조금씩',
            ].map((tip, i) => (
              <li key={i} style={{ fontSize: '0.85rem', display: 'flex', gap: '8px', alignItems: 'flex-start', color: '#333', fontWeight: 600 }}>
                <span style={{ color: 'var(--accent)' }}>•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onClose}
          className="btn btn-primary btn-block"
          style={{
            height: '56px',
            fontSize: '1.1rem',
            fontWeight: 800,
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
          }}
        >
          알겠어요
        </button>

        <style>{`
          @keyframes modalPop {
            from { opacity: 0; transform: scale(0.8) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
