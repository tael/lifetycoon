import { useState, useEffect, useRef } from 'react';
import { Icon } from '../icons/Icon';
import { useGameStore, DREAMS_MASTER } from '../../store/gameStore';
import { encodeShareCode, buildShareUrl } from '../../store/shareCode';
import { clearSave } from '../../store/persistence';
import { saveLegacy, calcInheritance } from '../../store/legacy';
import { sfx } from '../../game/engine/soundFx';
import { formatWon } from '../../game/domain/asset';
import { checkAndSaveAchievements, type Achievement } from '../../game/domain/achievements';
import { updateHighScore } from '../../store/highScore';
import { saveEndingToGallery } from '../../store/endingGallery';
import { updateGlobalStats } from '../../store/globalStats';
import { generateLifeSummary, generateLifeTitle } from '../../game/domain/lifeSummary';
import { highlightMoment } from '../../game/domain/ending';
import { ConfettiBurst } from '../components/MoneyAnimation';
import { AssetChart } from '../components/AssetChart';
import { showToast } from '../components/Toast';
import type { Grade, KeyMoment } from '../../game/types';

const GRADE_EMOJI: Record<Grade, string> = { S: '👑', A: '🌟', B: '🙂', C: '🌱', D: '🥀', F: '💀' };
const GRADE_LABEL: Record<Grade, string> = {
  S: '전설의 인생',
  A: '멋진 인생',
  B: '평범하지만 행복한 인생',
  C: '조용하고 소박한 인생',
  D: '힘겨웠지만 의미 있었던 인생',
  F: '아무것도 이루지 못한 인생',
};

const GRADE_GRADIENT: Record<Grade, string> = {
  S: 'linear-gradient(135deg, #ffd700 0%, #ffb300 30%, #ff8f00 100%)',
  A: 'linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 30%, #9e9e9e 100%)',
  B: 'linear-gradient(135deg, #64b5f6 0%, #42a5f5 30%, #1e88e5 100%)',
  C: 'linear-gradient(135deg, #81c784 0%, #66bb6a 30%, #43a047 100%)',
  D: 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 30%, #757575 100%)',
  F: 'linear-gradient(135deg, #b71c1c 0%, #c62828 30%, #d32f2f 100%)',
};

const GRADE_SHADOW: Record<Grade, string> = {
  S: '0 8px 32px rgba(255, 215, 0, 0.3)',
  A: '0 8px 32px rgba(158, 158, 158, 0.3)',
  B: '0 8px 32px rgba(66, 165, 245, 0.3)',
  C: '0 8px 32px rgba(102, 187, 106, 0.3)',
  D: '0 8px 32px rgba(117, 117, 117, 0.3)',
  F: '0 8px 32px rgba(211, 47, 47, 0.3)',
};

export function EndingScreen() {
  const ending = useGameStore((s) => s.ending);
  const characterName = useGameStore((s) => s.character.name);
  const dreams = useGameStore((s) => s.dreams);
  const resetAll = useGameStore((s) => s.resetAll);
  const [visibleLines, setVisibleLines] = useState(0);
  const [copied, setCopied] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [showAchConfetti, setShowAchConfetti] = useState(false);
  const sessionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!ending) return;
    sfx.ending();
    // Check achievements + high score
    const { newlyUnlocked } = checkAndSaveAchievements(ending);
    const { isNewRecord } = updateHighScore(ending);
    // Update global stats
    const st = useGameStore.getState();
    updateGlobalStats({
      finalAssets: ending.finalAssets,
      dreamsAchieved: ending.dreamsAchieved,
      jobId: st.job?.id ?? null,
      holdingTickers: st.holdings.map((h) => h.ticker),
      sessionDurationMs: Date.now() - sessionStartRef.current,
      grade: ending.grade,
      choicesMade: st.choiceHistory.length,
      moneyEarned: ending.finalAssets,
      scenariosSeen: st.usedScenarioIds,
    });
    const title = generateLifeTitle(
      useGameStore.getState().traits, ending.finalAssets, ending.finalHappiness,
      ending.dreamsAchieved, ending.totalDreams, ending,
    );
    saveEndingToGallery(useGameStore.getState().character.name, ending, title);
    if (newlyUnlocked.length > 0) {
      setNewAchievements(newlyUnlocked);
      setShowAchConfetti(true);
      setTimeout(() => setShowAchConfetti(false), 3000);
    }
    if (isNewRecord) {
      setTimeout(() => showToast('신기록 달성!', '🏆', 'achievement', 3000), 1500);
    }
    const total = ending.epitaph.length;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setVisibleLines(i);
      if (i >= total) clearInterval(timer);
    }, 600);
    return () => clearInterval(timer);
  }, [ending]);

  if (!ending) return null;

  const handleShare = () => {
    const code = encodeShareCode(characterName, ending);
    const url = buildShareUrl(code);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRestart = () => {
    clearSave();
    resetAll();
  };

  const handleLegacy = () => {
    const st = useGameStore.getState();
    const totalAssets =
      st.cash +
      st.bank.balance +
      st.holdings.reduce((sum, h) => sum + (st.prices[h.ticker] ?? 0) * h.shares, 0) +
      st.realEstate.reduce((sum, re) => sum + re.currentValue, 0);
    const inheritance = calcInheritance(totalAssets);
    saveLegacy({
      parentName: st.character.name,
      parentGrade: ending!.grade,
      inheritance,
      parentTraits: st.traits,
      parentAge: Math.floor(st.character.age),
    });
    clearSave();
    resetAll();
  };

  const highlight = highlightMoment(ending.keyMomentsSelected);
  const achievedDreams = dreams.filter((d) => d.achieved);
  const unachievedDreams = dreams.filter((d) => !d.achieved);
  const dreamProgress = ending.totalDreams > 0
    ? (ending.dreamsAchieved / ending.totalDreams) * 100
    : 0;

  return (
    <div className="app-container flex flex-col flex-center" style={{ gap: 'var(--sp-lg)', paddingTop: 'var(--sp-xl)', paddingBottom: 'var(--sp-2xl)' }}>

      {/* ═══ Hero Grade Card ═══ */}
      <div style={{
        background: GRADE_GRADIENT[ending.grade],
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--sp-2xl) var(--sp-lg) var(--sp-xl)',
        color: '#fff',
        textAlign: 'center',
        maxWidth: 400,
        width: '100%',
        boxShadow: GRADE_SHADOW[ending.grade],
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, left: -30,
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />

        {/* Grade emoji large */}
        <div style={{
          fontSize: '4rem',
          marginBottom: 'var(--sp-sm)',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
        }}>
          {ending.grade === 'S' ? <Icon slot="rank-crown" size="xl" /> : GRADE_EMOJI[ending.grade]}
        </div>

        {/* Grade text */}
        <div style={{
          fontSize: 'var(--font-size-3xl)',
          fontWeight: 800,
          letterSpacing: '0.05em',
          textShadow: '0 2px 8px rgba(0,0,0,0.2)',
          marginBottom: 'var(--sp-xs)',
        }}>
          {ending.grade}등급
        </div>
        <div style={{
          fontSize: 'var(--font-size-lg)',
          opacity: 0.95,
          fontWeight: 600,
          marginBottom: 'var(--sp-md)',
        }}>
          {GRADE_LABEL[ending.grade]}
        </div>

        {/* Life title */}
        <div style={{
          fontSize: 'var(--font-size-sm)',
          opacity: 0.85,
          fontStyle: 'italic',
          marginBottom: 'var(--sp-lg)',
        }}>
          {generateLifeTitle(
            useGameStore.getState().traits, ending.finalAssets, ending.finalHappiness,
            ending.dreamsAchieved, ending.totalDreams, ending,
          )}
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          borderTop: '1px solid rgba(255,255,255,0.25)',
          paddingTop: 'var(--sp-md)',
        }}>
          <StatBadge value={`${ending.dreamsAchieved}/${ending.totalDreams}`} label="꿈 달성" />
          <StatBadge value={formatWon(ending.finalAssets)} label="유산" />
          <StatBadge value={`${ending.finalHappiness}`} label="행복도" />
        </div>
      </div>

      {/* ═══ 등급 이유 (C/D/F) ═══ */}
      {(['C', 'D', 'F'] as Grade[]).includes(ending.grade) && (
        <div style={{
          maxWidth: 400, width: '100%',
          background: ending.grade === 'F' ? '#ffebee' : ending.grade === 'D' ? '#fff3e0' : '#f3f4f6',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--sp-md)',
          border: `1px solid ${ending.grade === 'F' ? '#ef9a9a' : ending.grade === 'D' ? '#ffcc80' : '#e0e0e0'}`,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 'var(--font-size-sm)' }}>
            💡 이번에 더 잘하려면?
          </div>
          {ending.dreamsAchieved === 0 && (
            <div style={{ fontSize: 'var(--font-size-xs)', marginBottom: 4 }}>• 꿈을 0개 달성했어요 — 꿈 조건을 미리 확인해보세요!</div>
          )}
          {ending.dreamsAchieved > 0 && ending.dreamsAchieved < ending.totalDreams && (
            <div style={{ fontSize: 'var(--font-size-xs)', marginBottom: 4 }}>• 꿈 {ending.dreamsAchieved}/{ending.totalDreams}개 달성했어요 — 조금만 더 도전해봐요!</div>
          )}
          {ending.crisisTurns > 10 && (
            <div style={{ fontSize: 'var(--font-size-xs)', marginBottom: 4 }}>• 위기 상황이 {Math.round(ending.crisisTurns)}년이나 됐어요 — 지출을 줄이거나 자산을 늘려보세요!</div>
          )}
          {ending.finalAssets < 100_000_000 && (
            <div style={{ fontSize: 'var(--font-size-xs)', marginBottom: 4 }}>• 최종 자산이 1억 미만이에요 — 저축과 투자를 일찍 시작해봐요!</div>
          )}
        </div>
      )}

      {/* ═══ Life Summary Quote ═══ */}
      <div style={{
        maxWidth: 400, width: '100%',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--sp-lg)',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '3rem',
          color: 'var(--accent)',
          opacity: 0.3,
          lineHeight: 1,
          marginBottom: '-8px',
        }}>
          "
        </div>
        <p style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-secondary)',
          lineHeight: 1.8,
          fontStyle: 'italic',
        }}>
          {generateLifeSummary(
            characterName, ending.grade, ending.finalAssets, ending.finalHappiness,
            ending.dreamsAchieved, ending.totalDreams,
            useGameStore.getState().traits, ending.keyMomentsSelected,
          )}
        </p>
        <div style={{
          fontSize: '3rem',
          color: 'var(--accent)',
          opacity: 0.3,
          lineHeight: 1,
          marginTop: '-8px',
          transform: 'rotate(180deg)',
        }}>
          "
        </div>
        <div style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-muted)',
          marginTop: 'var(--sp-xs)',
        }}>
          인생 한줄 요약
        </div>
      </div>

      {/* ═══ Epitaph — Typing Animation ═══ */}
      <div style={{
        maxWidth: 400, width: '100%',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--sp-lg)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          fontWeight: 700,
          fontSize: 'var(--font-size-base)',
          marginBottom: 'var(--sp-md)',
          textAlign: 'center',
        }}>
          <Icon slot="cat-savings" size="md" /> 비문
        </div>
        <div style={{ textAlign: 'left', lineHeight: 2, minHeight: 120 }}>
          {ending.epitaph.slice(0, visibleLines).map((line, i) => (
            <p key={i} style={{
              opacity: 1,
              animation: 'fadeIn 0.5s ease-in',
              fontSize: line === '' ? '0.5rem' : 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
            }}>
              {line || '\u00A0'}
            </p>
          ))}
          {visibleLines < ending.epitaph.length && (
            <span style={{ animation: 'blink 1s infinite', color: 'var(--accent)' }}>▌</span>
          )}
        </div>
      </div>

      {/* ═══ Timeline — Life Journey ═══ */}
      <div style={{
        maxWidth: 400, width: '100%',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--sp-lg)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          fontWeight: 700,
          fontSize: 'var(--font-size-base)',
          marginBottom: 'var(--sp-md)',
          textAlign: 'center',
        }}>
          🛤️ 인생의 여정
        </div>
        <div style={{ position: 'relative', paddingLeft: 28 }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute',
            left: 8,
            top: 4,
            bottom: 4,
            width: 2,
            background: 'linear-gradient(to bottom, var(--accent-light), var(--accent), var(--accent-light))',
            borderRadius: 1,
          }} />
          {ending.keyMomentsSelected.map((m, i) => {
            const isHighlight = highlight && highlight.age === m.age && highlight.text === m.text;
            return (
              <TimelineItem key={i} moment={m} isHighlight={!!isHighlight} />
            );
          })}
        </div>
      </div>

      {/* ═══ Dream Cards ═══ */}
      <div style={{
        maxWidth: 400, width: '100%',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--sp-lg)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          fontWeight: 700,
          fontSize: 'var(--font-size-base)',
          marginBottom: 'var(--sp-sm)',
          textAlign: 'center',
        }}>
          <Icon slot="stat-charisma" size="md" /> 꿈 달성 현황
        </div>

        {/* Progress bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-sm)',
          marginBottom: 'var(--sp-md)',
        }}>
          <div style={{
            flex: 1,
            height: 8,
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${dreamProgress}%`,
              height: '100%',
              background: dreamProgress === 100
                ? 'linear-gradient(90deg, #ffd700, #ff8f00)'
                : 'linear-gradient(90deg, var(--accent), var(--accent-hover))',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.6s ease-out',
            }} />
          </div>
          <span style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 700,
            color: dreamProgress === 100 ? 'var(--grade-s)' : 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}>
            {ending.dreamsAchieved}/{ending.totalDreams}
          </span>
        </div>

        {/* Dream cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)' }}>
          {achievedDreams.map((d) => (
            <div key={d.id} className="bg-gradient-warm" style={{
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--sp-sm)',
              textAlign: 'center',
              border: '1px solid rgba(255, 183, 77, 0.3)',
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 2 }}>{d.iconEmoji}</div>
              <div style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}>
                {d.title}
              </div>
            </div>
          ))}
          {unachievedDreams.map((d) => (
            <div key={d.id} style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--sp-sm)',
              textAlign: 'center',
              opacity: 0.4,
              filter: 'grayscale(1)',
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 2 }}>{d.iconEmoji}</div>
              <div style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 700,
                color: 'var(--text-muted)',
              }}>
                {d.title}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Asset Chart ═══ */}
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <AssetChart data={useGameStore.getState().assetHistory} />
      </div>

      {/* ═══ Life Statistics ═══ */}
      <div style={{
        maxWidth: 400, width: '100%',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--sp-lg)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          fontWeight: 700,
          fontSize: 'var(--font-size-base)',
          marginBottom: 'var(--sp-sm)',
          textAlign: 'center',
        }}>
          📋 인생 통계
        </div>
        {(() => {
          const st = useGameStore.getState();
          const eventsTotal = st.usedScenarioIds.length;
          const traitsCount = st.traits.length;
          const stockHoldings = st.holdings.length;
          const stats = [
            { emoji: '📌', label: '경험한 이벤트', value: `${eventsTotal}개` },
            { emoji: '🏷️', label: '획득한 특성', value: `${traitsCount}개` },
            { emoji: '📈', label: '보유 종목', value: `${stockHoldings}개` },
            { emoji: '🏦', label: '예금 잔고', value: formatWon(st.bank.balance) },
            { emoji: '🖱️', label: '총 선택 수', value: `${ending.totalChoicesMade}개` },
            { emoji: '🗺️', label: '경험한 시나리오', value: `${ending.uniqueScenariosEncountered} / 380` },
          ];
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {stats.map((s, i) => (
                <div key={i} style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 8px',
                  fontSize: 'var(--font-size-xs)',
                }}>
                  <span>{s.emoji} {s.label}</span>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginTop: 2 }}>{s.value}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ═══ NPC Comparison ═══ */}
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ fontWeight: 700, marginBottom: 'var(--sp-sm)', textAlign: 'center' }}>
          <Icon slot="nav-friends" size="md" /> 라이벌과 비교
        </div>
        {(() => {
          const npcs = useGameStore.getState().npcs;
          const allPlayers = [
            { name: `${characterName} (나)`, assets: ending.finalAssets, isMe: true },
            ...npcs.map((n) => ({ name: n.name, assets: n.currentAssets, isMe: false })),
          ].sort((a, b) => b.assets - a.assets);
          return allPlayers.map((p, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
              fontWeight: p.isMe ? 700 : 400,
              color: p.isMe ? 'var(--accent)' : 'inherit',
              fontSize: 'var(--font-size-sm)',
            }}>
              <span style={{ width: 24 }}>{i === 0 ? <Icon slot="rank-crown" size="md" /> : `${i + 1}위`}</span>
              <span style={{ flex: 1 }}>{p.name}</span>
              <span>{formatWon(p.assets)}</span>
            </div>
          ));
        })()}
      </div>

      {/* ═══ New Achievements ═══ */}
      {newAchievements.length > 0 && (
        <div className="card" style={{ width: '100%', maxWidth: 400, textAlign: 'center', border: '2px solid var(--grade-s)' }}>
          <div style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)', marginBottom: 'var(--sp-sm)' }}>
            <Icon slot="rank-trophy" size="md" /> 업적 달성!
          </div>
          {newAchievements.map((a) => (
            <div key={a.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-sm)',
              padding: '6px 0',
              borderBottom: '1px solid #f0ebe3',
            }}>
              <span style={{ fontSize: '1.8rem' }}>{a.emoji}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{a.title}</div>
                <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{a.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Missed Dreams — replay hook ═══ */}
      {ending.dreamsAchieved < ending.totalDreams && (
        <div className="card" style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, marginBottom: 'var(--sp-xs)' }}>
            💭 이루지 못한 꿈
          </div>
          <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--sp-sm)' }}>
            다음 인생에선 도전해볼까?
          </div>
          {DREAMS_MASTER.filter(
            (d) => !ending.keyMomentsSelected.some((k) => k.text.includes(d.title))
                   && ending.dreamsAchieved < ending.totalDreams,
          )
            .slice(0, 3)
            .map((d) => (
              <div key={d.id} style={{ padding: '4px 0', fontSize: 'var(--font-size-sm)', opacity: 0.7 }}>
                {d.iconEmoji} {d.title} — {d.description}
              </div>
            ))}
        </div>
      )}

      {/* ═══ Strategy Tip ═══ */}
      <div className="card" style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontWeight: 700, marginBottom: 'var(--sp-xs)' }}>💡 다음 인생 팁</div>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {generateTip(ending, useGameStore.getState())}
        </p>
      </div>

      {/* ═══ Seed display ═══ */}
      <div className="text-muted text-center" style={{ fontSize: '0.6rem' }}>
        🎲 시드: {useGameStore.getState().seeds.master}
      </div>

      {/* ═══ Actions ═══ */}
      <div className="flex flex-col gap-sm" style={{ width: '100%', maxWidth: 400 }}>
        <button className="btn btn-primary btn-block" onClick={handleShare}>
          {copied ? <><Icon slot="status-check" size="md" /> 복사됨!</> : '📤 친구에게 공유'}
        </button>
        {(() => {
          const st = useGameStore.getState();
          const totalAssets =
            st.cash +
            st.bank.balance +
            st.holdings.reduce((sum, h) => sum + (st.prices[h.ticker] ?? 0) * h.shares, 0) +
            st.realEstate.reduce((sum, re) => sum + re.currentValue, 0);
          const inheritance = calcInheritance(totalAssets);
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
                자녀가 {formatWon(inheritance)}을 상속받습니다
              </div>
              <button className="btn btn-secondary btn-block" onClick={handleLegacy}>
                <Icon slot="nav-friends" size="md" /> 자녀가 이어받기
              </button>
            </div>
          );
        })()}
        <button className="btn btn-secondary btn-block" onClick={handleRestart}>
          🔄 다른 인생 살아보기
        </button>
      </div>

      {showAchConfetti && <ConfettiBurst />}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes highlightPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,112,67,0.3); } 50% { box-shadow: 0 0 0 6px rgba(255,112,67,0); } }
      `}</style>
    </div>
  );
}

/* ── Sub-components ── */

function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: '#fff' }}>{value}</div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'rgba(255,255,255,0.7)' }}>{label}</div>
    </div>
  );
}

function TimelineItem({ moment, isHighlight }: { moment: KeyMoment; isHighlight: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      marginBottom: 'var(--sp-md)',
      position: 'relative',
    }}>
      {/* Dot on timeline */}
      <div style={{
        position: 'absolute',
        left: -24,
        top: 4,
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: isHighlight ? 'var(--accent)' : 'var(--accent-light)',
        border: isHighlight ? '2px solid var(--accent-hover)' : '2px solid var(--accent)',
        zIndex: 1,
      }} />

      {/* Age label */}
      <div style={{
        minWidth: 42,
        fontWeight: 700,
        fontSize: 'var(--font-size-xs)',
        color: isHighlight ? 'var(--accent)' : 'var(--text-muted)',
        paddingTop: 1,
      }}>
        {Math.floor(moment.age)}세
      </div>

      {/* Event text */}
      <div style={{
        flex: 1,
        fontSize: 'var(--font-size-sm)',
        color: isHighlight ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: isHighlight ? 700 : 400,
        background: isHighlight ? 'var(--accent-light)' : 'transparent',
        borderRadius: isHighlight ? 'var(--radius-sm)' : 0,
        padding: isHighlight ? '4px 8px' : '0',
        animation: isHighlight ? 'highlightPulse 2s ease-in-out infinite' : 'none',
        lineHeight: 1.5,
      }}>
        {isHighlight && <span style={{ marginRight: 4 }}>⭐</span>}
        {moment.text}
        {isHighlight && (
          <div style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--accent)',
            marginTop: 2,
          }}>
            최고의 순간
          </div>
        )}
      </div>
    </div>
  );
}

function generateTip(ending: { finalAssets: number; dreamsAchieved: number; finalHappiness: number; grade: string }, state: { holdings: { shares: number }[]; bank: { balance: number }; traits: string[] }): string {
  if (ending.finalAssets < 1000000) {
    return '다음엔 주식 배당주에 일찍 투자해보세요! 고양이 은행(5%)과 두부공주(4%)가 안정적이에요.';
  }
  if (state.holdings.length === 0) {
    return '주식을 한 번도 안 사봤네요! 다음엔 떡볶이 제국부터 시작해보세요. 소량씩!';
  }
  if (state.bank.balance < 100000) {
    return '예금을 더 활용해보세요! 복리의 힘은 시간이 만들어요. 젊을 때 넣을수록 좋아요!';
  }
  if (ending.dreamsAchieved === 0) {
    return '꿈을 더 쉬운 것부터 골라보세요! "행복한 인생"이나 "30대 부자"가 첫 도전에 좋아요.';
  }
  if (ending.finalHappiness < 50) {
    return '행복도가 낮았어요. 🍕간식과 🎤노래 버튼을 자주 눌러주세요!';
  }
  if (state.traits.length < 3) {
    return '특성을 더 모아보세요! 이벤트에서 적극적으로 선택하면 히든 체인 이벤트가 열려요!';
  }
  if (ending.grade === 'S') {
    return '완벽해요! 다음엔 다른 꿈 조합으로 도전해보세요. 아직 못 본 히든 이벤트가 있을 거예요!';
  }
  return '다양한 선택을 해보세요! 매번 다른 인생이 펼쳐져요. 특성 조합에 따라 히든 이벤트가 달라져요!';
}
