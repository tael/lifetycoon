import { useState } from 'react';
import { useGameStore, DREAMS_MASTER } from '../../store/gameStore';
import { sfx } from '../../game/engine/soundFx';
import { hasSave, loadGame, clearSave } from '../../store/persistence';
import { loadLegacy, clearLegacy } from '../../store/legacy';
import { getDailySeed, getDailyDreams, getDailyName } from '../../game/engine/dailySeed';
import { extractShareCodeFromUrl, decodeShareCode } from '../../store/shareCode';
import { getUnlockedCount, getTotalCount, getAllAchievements, loadUnlocked } from '../../game/domain/achievements';
import { AchievementsModal } from './AchievementsModal';
import { loadHighScore } from '../../store/highScore';
import { loadGallery } from '../../store/endingGallery';
import { formatWon } from '../../game/domain/asset';
import { CHALLENGE_MODES } from '../../game/engine/challengeMode';

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

const RANDOM_NAMES = ['다솔','하늘','별','은우','지호','서아','도윤','수아','건우','예린','시우','주아','민준','채원','현우','지아','준호','리아','태준','유나'];

export function TitleScreen() {
  const goTo = useGameStore((s) => s.goTo);
  const loadSnapshot = useGameStore((s) => s.loadSnapshot);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'random'>('random');
  const [sound, setSound] = useState(() => sfx.isEnabled());
  const [showAchievements, setShowAchievements] = useState(false);
  const savedExists = hasSave();
  const legacy = loadLegacy();

  const handlePickRandomName = () => {
    const rname = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    setName(rname);
  };

  const handleNew = () => {
    if (!name.trim()) return;
    const resolvedGender: 'male' | 'female' = gender === 'random'
      ? (Math.random() < 0.5 ? 'male' : 'female')
      : gender;
    useGameStore.setState({ pendingGender: resolvedGender });
    useGameStore.getState().character.name = name.trim();
    goTo({ kind: 'dream-pick' });
  };

  const handleLegacyStart = () => {
    if (!legacy) return;
    const childName = `${legacy.parentName} 2세`;
    const allIds = DREAMS_MASTER.map((d) => d.id);
    const shuffled = allIds.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 2);
    clearLegacy();
    useGameStore.getState().startNewGame(childName, picked, undefined, undefined, legacy.inheritance, legacy.parentName);
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

  const genderOptions: { value: 'male' | 'female' | 'random'; label: string }[] = [
    { value: 'male', label: '남' },
    { value: 'female', label: '여' },
    { value: 'random', label: '랜덤' },
  ];

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
            <div style={{ display: 'flex', gap: 6, marginTop: 'var(--sp-xs)' }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 다솔이"
                maxLength={10}
                style={{
                  flex: 1,
                  padding: 'var(--sp-sm) var(--sp-md)',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--accent-light)',
                  fontSize: 'var(--font-size-lg)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--accent-light, #ffe0b2)')}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNew(); }}
              />
              <button
                type="button"
                onClick={handlePickRandomName}
                aria-label="랜덤 이름 선택"
                style={{
                  padding: '0 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--accent-light)',
                  background: 'var(--bg-secondary)',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                🎲
              </button>
            </div>
            {/* 성별 선택 토글 */}
            <div style={{ display: 'flex', gap: 6, marginTop: 'var(--sp-xs)' }}>
              {genderOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(opt.value)}
                  style={{
                    flex: 1,
                    padding: '4px 0',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${gender === opt.value ? 'var(--accent)' : 'var(--accent-light)'}`,
                    background: gender === opt.value ? 'var(--accent-light)' : 'var(--bg-secondary)',
                    fontWeight: gender === opt.value ? 700 : 400,
                    fontSize: 'var(--font-size-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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

          <div style={{ marginTop: 'var(--sp-sm)' }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--sp-xs)', color: 'var(--text-muted)' }}>
              🎯 도전 모드
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {CHALLENGE_MODES.map((cm) => (
                <button
                  key={cm.id}
                  onClick={() => {
                    const names = ['다솔','하늘','별','은우','지호','서아','도윤','수아','건우','예린'];
                    const rname = names[Math.floor(Math.random() * names.length)];
                    const allIds = DREAMS_MASTER.map(d => d.id);
                    const shuffled = allIds.sort(() => Math.random() - 0.5);
                    const picked = shuffled.slice(0, 2);
                    useGameStore.getState().startNewGame(rname, picked, undefined, { ...cm.modifier, challengeId: cm.id });
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 2,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--accent-light)',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{cm.emoji}</span>
                  <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{cm.name}</span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', lineHeight: 1.3 }}>{cm.description}</span>
                </button>
              ))}
            </div>
          </div>
          {legacy && (
            <div style={{
              background: 'linear-gradient(135deg, #fff8e1 0%, #ffe0b2 100%)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--sp-md)',
              border: '2px solid #ffb300',
            }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 4 }}>
                👶 부모 유산
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-sm)' }}>
                {legacy.parentName} / {legacy.parentGrade}등급 / {formatWon(legacy.inheritance)}
              </div>
              <button className="btn btn-primary btn-block" onClick={handleLegacyStart}>
                🎭 유산 이어받기 시작
              </button>
            </div>
          )}
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
                <div
                  key={i}
                  role="article"
                  aria-label={`${r.characterName} ${r.grade}등급 엔딩: ${r.title}, 최종자산 ${formatWon(r.finalAssets)}`}
                  style={{
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
        <button
          className="card"
          onClick={() => setShowAchievements(true)}
          aria-label="업적 상세 보기"
          style={{ width: '100%', maxWidth: 360, textAlign: 'center', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
        >
          <div className="card" style={{ width: '100%', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, marginBottom: 'var(--sp-xs)' }}>
              🏆 업적 {getUnlockedCount()}/{getTotalCount()}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {getAllAchievements().map((a) => {
                const unlocked = loadUnlocked().some((u) => u.id === a.id);
                return (
                  <span
                    key={a.id}
                    role="img"
                    aria-label={unlocked ? `업적 달성: ${a.title} — ${a.description}` : `잠긴 업적`}
                    style={{
                      fontSize: '1.5rem',
                      opacity: unlocked ? 1 : 0.2,
                      filter: unlocked ? 'none' : 'grayscale(1)',
                    }}
                  >
                    {a.emoji}
                  </span>
                );
              })}
            </div>
            <div style={{ marginTop: 'var(--sp-xs)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              클릭해서 상세 보기
            </div>
          </div>
        </button>
      )}

      {showAchievements && <AchievementsModal onClose={() => setShowAchievements(false)} />}

      <div className="flex gap-md" style={{ alignItems: 'center' }}>
        <button
          onClick={() => {
            const next = !sound;
            setSound(next);
            sfx.toggle(next);
          }}
          aria-label={sound ? '소리 끄기' : '소리 켜기'}
          aria-pressed={sound}
          style={{ fontSize: 'var(--font-size-sm)', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--bg-secondary)', border: '1px solid #ddd' }}
        >
          {sound ? '🔊' : '🔇'}
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
