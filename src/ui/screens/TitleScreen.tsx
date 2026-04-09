import { useState } from 'react';
import { useGameStore, DREAMS_MASTER } from '../../store/gameStore';
import { hasSave, loadGame, clearSave } from '../../store/persistence';
import { getDailySeed, getDailyDreams, getDailyName } from '../../game/engine/dailySeed';
import { extractShareCodeFromUrl, decodeShareCode } from '../../store/shareCode';
import { getUnlockedCount, getTotalCount, getAllAchievements, loadUnlocked } from '../../game/domain/achievements';
import { loadHighScore } from '../../store/highScore';
import { loadGallery } from '../../store/endingGallery';
import { formatWon } from '../../game/domain/asset';

const QUOTES = [
  '복리는 세계 8번째 불가사의다 — 아인슈타인',
  '부자가 되는 비결: 적게 쓰고, 일찍 시작하기',
  '돈은 좋은 하인이지만 나쁜 주인이다',
  '투자의 첫 번째 규칙: 돈을 잃지 마라',
  '시간은 돈보다 귀하다',
  '오늘의 절약이 내일의 자유다',
  '행복은 돈으로 살 수 없지만, 돈은 도움이 된다',
  '실패는 성공의 어머니',
  '꿈을 크게 가져라, 그리고 행동하라',
  '인생은 짧다, 떡볶이는 맛있다 🌶️',
];

export function TitleScreen() {
  const goTo = useGameStore((s) => s.goTo);
  const loadSnapshot = useGameStore((s) => s.loadSnapshot);
  const [name, setName] = useState('');
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  const savedExists = hasSave();

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : '';
    try { localStorage.setItem('lifetycoon-kids:theme', next ? 'dark' : 'light'); } catch {}
  };

  const handleNew = () => {
    if (!name.trim()) return;
    useGameStore.getState().character.name = name.trim();
    goTo({ kind: 'dream-pick' });
  };

  const handleContinue = () => {
    const save = loadGame();
    if (!save) return;
    loadSnapshot(save.state as any);
  };

  const handleShare = () => {
    const code = extractShareCodeFromUrl(window.location.href);
    if (!code) return;
    const data = decodeShareCode(code);
    if (!data) {
      alert('공유코드를 읽을 수 없어요.');
      return;
    }
    loadSnapshot({
      phase: { kind: 'ending' },
      ending: data.payload.ending,
      character: { ...useGameStore.getState().character, name: data.payload.characterName },
    } as any);
  };

  const shareCodePresent = typeof window !== 'undefined' && window.location.search.includes('s=');

  return (
    <div className="app-container flex flex-col flex-center" style={{ minHeight: '100dvh', gap: 'var(--sp-lg)' }}>
      <div className="text-center">
        <div className="emoji-xl">🎮</div>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', marginTop: 'var(--sp-md)', fontWeight: 800 }}>
          인생타이쿤
        </h1>
        <p className="text-muted" style={{ marginTop: 'var(--sp-xs)' }}>
          10세부터 100세까지, 나의 인생 경영!
        </p>
        <p style={{ marginTop: 'var(--sp-sm)', fontSize: 'var(--font-size-xs)', fontStyle: 'italic', color: 'var(--text-muted)' }}>
          "{QUOTES[Math.floor(Date.now() / 60000) % QUOTES.length]}"
        </p>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 360 }}>
        <div className="flex flex-col gap-md">
          <div>
            <label style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>이름을 정해줘!</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 다솔이"
              maxLength={10}
              style={{
                width: '100%',
                padding: 'var(--sp-sm) var(--sp-md)',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--accent-light)',
                fontSize: 'var(--font-size-lg)',
                marginTop: 'var(--sp-xs)',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--accent-light, #ffe0b2)')}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNew(); }}
            />
          </div>
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={handleNew}
            disabled={!name.trim()}
          >
            🚀 새 인생 시작!
          </button>
          <button
            className="btn btn-secondary btn-block"
            onClick={() => {
              const names = ['다솔','하늘','별','은우','지호','서아','도윤','수아','건우','예린'];
              const rname = names[Math.floor(Math.random() * names.length)];
              const allIds = DREAMS_MASTER.map(d => d.id);
              const shuffled = allIds.sort(() => Math.random() - 0.5);
              const picked = shuffled.slice(0, 2);
              useGameStore.getState().startNewGame(rname, picked);
            }}
          >
            ⚡ 빠른 시작 (랜덤)
          </button>
          <button
            className="btn btn-secondary btn-block"
            style={{ borderColor: 'var(--gold, #ffd700)', background: '#fffde7' }}
            onClick={() => {
              const seed = getDailySeed();
              const dreams = getDailyDreams();
              const dname = getDailyName();
              useGameStore.getState().startNewGame(dname, dreams, seed);
            }}
          >
            🏅 오늘의 챌린지 ({new Date().getMonth() + 1}/{new Date().getDate()})
          </button>
          {savedExists && (
            <button className="btn btn-secondary btn-block" onClick={handleContinue}>
              📂 이어하기
            </button>
          )}
          {shareCodePresent && (
            <button className="btn btn-secondary btn-block" onClick={handleShare}>
              📩 친구의 인생 보기
            </button>
          )}
        </div>
      </div>

      {/* High Score */}
      {loadHighScore() && (() => {
        const hs = loadHighScore()!;
        return (
          <div className="card" style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, marginBottom: 'var(--sp-xs)' }}>📊 역대 최고 기록</div>
            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 'var(--font-size-sm)' }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>{hs.bestGrade}</div>
                <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>최고 등급</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>{formatWon(hs.highestAssets)}</div>
                <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>최고 자산</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>{hs.totalGames}회</div>
                <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>총 플레이</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Ending Gallery */}
      {(() => {
        const gallery = loadGallery();
        if (gallery.length === 0) return null;
        const GRADE_EMOJI: Record<string, string> = { S: '👑', A: '🌟', B: '🙂', C: '🌱' };
        const recent = gallery.slice(0, 5);
        return (
          <div className="card" style={{ width: '100%', maxWidth: 360 }}>
            <div style={{ fontWeight: 700, marginBottom: 'var(--sp-sm)', textAlign: 'center' }}>
              📜 엔딩 갤러리 ({gallery.length}개)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recent.map((r, i) => (
                <div key={i} style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 'var(--font-size-xs)',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{GRADE_EMOJI[r.grade] ?? r.grade}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.characterName} · {r.title}
                    </div>
                    <div className="text-muted">
                      {formatWon(r.finalAssets)} · 꿈 {r.dreamsAchieved}/{r.totalDreams}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Achievement badge */}
      {getUnlockedCount() > 0 && (
        <div className="card" style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, marginBottom: 'var(--sp-xs)' }}>
            🏆 업적 {getUnlockedCount()}/{getTotalCount()}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {getAllAchievements().map((a) => {
              const unlocked = loadUnlocked().some((u) => u.id === a.id);
              return (
                <span
                  key={a.id}
                  title={unlocked ? `${a.title}: ${a.description}` : '???'}
                  style={{
                    fontSize: '1.5rem',
                    opacity: unlocked ? 1 : 0.2,
                    filter: unlocked ? 'none' : 'grayscale(1)',
                    cursor: 'default',
                  }}
                >
                  {a.emoji}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-md" style={{ alignItems: 'center' }}>
        <button
          onClick={toggleDark}
          style={{ fontSize: 'var(--font-size-sm)', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--bg-secondary)', border: '1px solid #ddd' }}
        >
          {dark ? '☀️ 라이트' : '🌙 다크'}
        </button>
        {savedExists && (
          <button
            className="text-muted"
            style={{ fontSize: 'var(--font-size-xs)', textDecoration: 'underline' }}
            onClick={() => { clearSave(); window.location.reload(); }}
          >
            저장 삭제
          </button>
        )}
      </div>
    </div>
  );
}
