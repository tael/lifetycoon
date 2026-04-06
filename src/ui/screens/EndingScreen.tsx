import { useState, useEffect } from 'react';
import { useGameStore, DREAMS_MASTER } from '../../store/gameStore';
import { encodeShareCode, buildShareUrl } from '../../store/shareCode';
import { clearSave } from '../../store/persistence';
import { formatWon } from '../../game/domain/asset';
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

  useEffect(() => {
    if (!ending) return;
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
        <div className={`grade-${ending.grade}`} style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 800,
          marginBottom: 'var(--sp-xs)',
        }}>
          {ending.grade}등급
        </div>
        <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8, marginBottom: 'var(--sp-lg)' }}>
          {GRADE_LABEL[ending.grade]}
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

      {/* Actions */}
      <div className="flex flex-col gap-sm" style={{ width: '100%', maxWidth: 380 }}>
        <button className="btn btn-primary btn-block" onClick={handleShare}>
          {copied ? '✅ 복사됨!' : '📤 친구에게 공유'}
        </button>
        <button className="btn btn-secondary btn-block" onClick={handleRestart}>
          🔄 다른 인생 살아보기
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
