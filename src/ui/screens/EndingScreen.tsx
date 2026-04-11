import { useState, useEffect } from 'react';
import { useGameStore, DREAMS_MASTER } from '../../store/gameStore';
import { encodeShareCode, buildShareUrl } from '../../store/shareCode';
import { clearSave } from '../../store/persistence';
import { sfx } from '../../game/engine/soundFx';
import { formatWon } from '../../game/domain/asset';
import { checkAndSaveAchievements, type Achievement } from '../../game/domain/achievements';
import { updateHighScore } from '../../store/highScore';
import { saveEndingToGallery } from '../../store/endingGallery';
import { generateLifeSummary, generateLifeTitle } from '../../game/domain/lifeSummary';
import { ConfettiBurst } from '../components/MoneyAnimation';
import { AssetChart } from '../components/AssetChart';
import { showToast } from '../components/Toast';
import type { Grade } from '../../game/types';

const GRADE_EMOJI: Record<Grade, string> = { S: '👑', A: '🌟', B: '🙂', C: '🌱' };
const GRADE_LABEL: Record<Grade, string> = {
  S: '전설의 인생',
  A: '멋진 인생',
  B: '평범하지만 행복한 인생',
  C: '조용하고 소박한 인생',
};

export function EndingScreen() {
  const ending = useGameStore((s) => s.ending);
  const characterName = useGameStore((s) => s.character.name);
  const resetAll = useGameStore((s) => s.resetAll);
  const [visibleLines, setVisibleLines] = useState(0);
  const [copied, setCopied] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [showAchConfetti, setShowAchConfetti] = useState(false);

  useEffect(() => {
    if (!ending) return;
    sfx.ending();
    // Check achievements + high score
    const { newlyUnlocked } = checkAndSaveAchievements(ending);
    const { isNewRecord } = updateHighScore(ending);
    const title = generateLifeTitle(
      useGameStore.getState().traits, ending.finalAssets, ending.finalHappiness,
      ending.dreamsAchieved, ending.totalDreams,
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

  return (
    <div className="app-container flex flex-col flex-center" style={{ gap: 'var(--sp-lg)', paddingTop: 'var(--sp-2xl)' }}>
      {/* Tombstone */}
      <div style={{
        background: 'linear-gradient(180deg, #8d6e63 0%, #6d4c41 100%)',
        borderRadius: '60px 60px 0 0',
        padding: 'var(--sp-xl) var(--sp-lg)',
        color: '#fff',
        textAlign: 'center',
        maxWidth: 380,
        width: '100%',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
      }}>
        {/* Grade crown */}
        <div style={{ fontSize: '3rem', marginBottom: 'var(--sp-sm)' }}>
          {GRADE_EMOJI[ending.grade]}
        </div>
        <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9, marginBottom: 4 }}>
          {generateLifeTitle(
            useGameStore.getState().traits, ending.finalAssets, ending.finalHappiness,
            ending.dreamsAchieved, ending.totalDreams,
          )}
        </div>
        <div className={`grade-${ending.grade}`} style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 800,
          marginBottom: 'var(--sp-xs)',
        }}>
          {ending.grade}등급
        </div>
        <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8, marginBottom: 4 }}>
          {GRADE_LABEL[ending.grade]}
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.7, marginBottom: 'var(--sp-lg)', fontStyle: 'italic' }}>
          "{generateLifeSummary(
            characterName, ending.grade, ending.finalAssets, ending.finalHappiness,
            ending.dreamsAchieved, ending.totalDreams,
            useGameStore.getState().traits, ending.keyMomentsSelected,
          )}"
        </div>

        {/* Epitaph */}
        <div style={{ textAlign: 'left', lineHeight: 2, minHeight: 200 }}>
          {ending.epitaph.slice(0, visibleLines).map((line, i) => (
            <p key={i} style={{
              opacity: 1,
              animation: 'fadeIn 0.5s ease-in',
              fontSize: line === '' ? '0.5rem' : 'var(--font-size-sm)',
            }}>
              {line || '\u00A0'}
            </p>
          ))}
          {visibleLines < ending.epitaph.length && (
            <span style={{ animation: 'blink 1s infinite' }}>▌</span>
          )}
        </div>

        {/* Stats */}
        <div style={{
          marginTop: 'var(--sp-lg)',
          display: 'flex',
          justifyContent: 'space-around',
          borderTop: '1px solid rgba(255,255,255,0.3)',
          paddingTop: 'var(--sp-md)',
        }}>
          <div className="stat-badge">
            <span className="stat-badge__value" style={{ color: '#fff' }}>
              {ending.dreamsAchieved}/{ending.totalDreams}
            </span>
            <span className="stat-badge__label" style={{ color: 'rgba(255,255,255,0.7)' }}>꿈 달성</span>
          </div>
          <div className="stat-badge">
            <span className="stat-badge__value" style={{ color: '#fff' }}>
              {formatWon(ending.finalAssets)}
            </span>
            <span className="stat-badge__label" style={{ color: 'rgba(255,255,255,0.7)' }}>유산</span>
          </div>
          <div className="stat-badge">
            <span className="stat-badge__value" style={{ color: '#fff' }}>
              {ending.finalHappiness}
            </span>
            <span className="stat-badge__label" style={{ color: 'rgba(255,255,255,0.7)' }}>행복도</span>
          </div>
        </div>
      </div>

      {/* Asset Chart */}
      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        <AssetChart data={useGameStore.getState().assetHistory} />
      </div>

      {/* Life Statistics */}
      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ fontWeight: 700, marginBottom: 'var(--sp-sm)', textAlign: 'center' }}>
          📋 인생 통계
        </div>
        {(() => {
          const st = useGameStore.getState();
          const eventsTotal = st.usedScenarioIds.length;
          const traitsCount = st.traits.length;
          const stockHoldings = st.holdings.length;
          const bestMoment = ending.keyMomentsSelected.length > 0
            ? ending.keyMomentsSelected.reduce((a, b) => a.importance > b.importance ? a : b)
            : null;
          const stats = [
            { emoji: '📌', label: '경험한 이벤트', value: `${eventsTotal}개` },
            { emoji: '🏷️', label: '획득한 특성', value: `${traitsCount}개` },
            { emoji: '📈', label: '보유 종목', value: `${stockHoldings}개` },
            { emoji: '🏦', label: '예금 잔고', value: formatWon(st.bank.balance) },
            { emoji: '⭐', label: '최고의 순간', value: bestMoment ? `${Math.floor(bestMoment.age)}세` : '-' },
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
              {bestMoment && (
                <div style={{
                  gridColumn: '1 / -1',
                  background: 'var(--accent-light)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 8px',
                  fontSize: 'var(--font-size-xs)',
                }}>
                  ⭐ {bestMoment.text}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* NPC Comparison */}
      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ fontWeight: 700, marginBottom: 'var(--sp-sm)', textAlign: 'center' }}>
          👥 라이벌과 비교
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
              <span style={{ width: 24 }}>{i === 0 ? '👑' : `${i + 1}위`}</span>
              <span style={{ flex: 1 }}>{p.name}</span>
              <span>{formatWon(p.assets)}</span>
            </div>
          ));
        })()}
      </div>

      {/* New Achievements */}
      {newAchievements.length > 0 && (
        <div className="card" style={{ width: '100%', maxWidth: 380, textAlign: 'center', border: '2px solid var(--grade-s)' }}>
          <div style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)', marginBottom: 'var(--sp-sm)' }}>
            🏆 업적 달성!
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

      {/* Missed dreams — replay hook */}
      {ending.dreamsAchieved < ending.totalDreams && (
        <div className="card" style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
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

      {/* Strategy Tip */}
      <div className="card" style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontWeight: 700, marginBottom: 'var(--sp-xs)' }}>💡 다음 인생 팁</div>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {generateTip(ending, useGameStore.getState())}
        </p>
      </div>

      {/* Seed display */}
      <div className="text-muted text-center" style={{ fontSize: '0.6rem' }}>
        🎲 시드: {useGameStore.getState().seeds.master}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-sm" style={{ width: '100%', maxWidth: 380 }}>
        <button className="btn btn-primary btn-block" onClick={handleShare}>
          {copied ? '✅ 복사됨!' : '📤 친구에게 공유'}
        </button>
        <button className="btn btn-secondary btn-block" onClick={handleRestart}>
          🔄 다른 인생 살아보기
        </button>
      </div>

      {showAchConfetti && <ConfettiBurst />}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
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
