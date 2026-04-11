import { useEffect, useState } from 'react';
import { useGameStore, DREAMS_MASTER } from '../../store/gameStore';
import {
  ReleaseNotesModal,
  fetchReleases,
  getLastSeenRelease,
  getUnseenReleases,
} from '../components/ReleaseNotesModal';
import { sfx } from '../../game/engine/soundFx';
import { hasSave, loadGame, clearSave } from '../../store/persistence';
import { SettingsModal } from '../components/SettingsModal';
import { loadLegacy, clearLegacy } from '../../store/legacy';
import { getDailySeed, getDailyDreams, getDailyName } from '../../game/engine/dailySeed';
import { extractShareCodeFromUrl, decodeShareCode } from '../../store/shareCode';
import { getUnlockedCount, getTotalCount, getAllAchievements, loadUnlocked } from '../../game/domain/achievements';
import { AchievementsModal } from './AchievementsModal';
import { GlobalStatsModal } from './GlobalStatsModal';
import { loadHighScore } from '../../store/highScore';
import { loadGlobalStats } from '../../store/globalStats';
import { loadGallery } from '../../store/endingGallery';
import { formatWon } from '../../game/domain/asset';
import { CHALLENGE_MODES } from '../../game/engine/challengeMode';

const RANDOM_NAMES = ['다솔','하늘','별','은우','지호','서아','도윤','수아','건우','예린','시우','주아','민준','채원','현우','지아','준호','리아','태준','유나'];

export function TitleScreen() {
  const goTo = useGameStore((s) => s.goTo);
  const loadSnapshot = useGameStore((s) => s.loadSnapshot);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'random'>('random');
  const [sound, setSound] = useState(() => sfx.isEnabled());
  const [showAchievements, setShowAchievements] = useState(false);
  const [showGlobalStats, setShowGlobalStats] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [moreModesOpen, setMoreModesOpen] = useState(false);
  const [myRecordsOpen, setMyRecordsOpen] = useState(false);
  const [unseenReleaseCount, setUnseenReleaseCount] = useState(0);
  const savedExists = hasSave();
  const legacy = loadLegacy();

  // 타이틀 진입 시 새 소식 미확인 개수 계산
  useEffect(() => {
    let cancelled = false;
    fetchReleases().then((releases) => {
      if (cancelled) return;
      const unseen = getUnseenReleases(releases, getLastSeenRelease());
      setUnseenReleaseCount(unseen.length);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenReleaseNotes = () => {
    setShowReleaseNotes(true);
    setUnseenReleaseCount(0);
  };

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

  const handleQuickStart = () => {
    const rname = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const allIds = DREAMS_MASTER.map((d) => d.id);
    const shuffled = allIds.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 2);
    useGameStore.getState().startNewGame(rname, picked);
  };

  const handleDailyChallenge = () => {
    const seed = getDailySeed();
    const dreams = getDailyDreams();
    const dname = getDailyName();
    useGameStore.getState().startNewGame(dname, dreams, seed);
  };

  const handleChallengeMode = (cm: (typeof CHALLENGE_MODES)[number]) => {
    const rname = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const allIds = DREAMS_MASTER.map((d) => d.id);
    const shuffled = allIds.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 2);
    useGameStore.getState().startNewGame(rname, picked, undefined, { ...cm.modifier, challengeId: cm.id });
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

  const highScore = loadHighScore();
  const globalStats = loadGlobalStats();
  const gallery = loadGallery();
  const unlockedCount = getUnlockedCount();
  const hasAnyRecord = !!highScore || !!globalStats || gallery.length > 0 || unlockedCount > 0;

  return (
    <div
      className="app-container flex flex-col flex-center"
      style={{
        minHeight: '100dvh',
        gap: 'var(--sp-md)',
        padding: 'var(--sp-lg) var(--sp-md)',
        background: 'linear-gradient(180deg, #fff8e1 0%, #fff3e0 35%, #fffde7 100%)',
      }}
    >
      {/* Hero */}
      <div className="text-center" style={{ marginTop: 'var(--sp-md)' }}>
        <div className="emoji-xl" style={{ fontSize: '4rem' }}>🎮</div>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', marginTop: 'var(--sp-sm)', fontWeight: 800, letterSpacing: '-0.02em' }}>
          인생타이쿤
        </h1>
        <p className="text-muted" style={{ marginTop: 'var(--sp-xs)', fontSize: 'var(--font-size-sm)' }}>
          10세부터 100세까지, 나의 인생 경영
        </p>
      </div>

      {/* Primary start card */}
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: 'var(--sp-lg)' }}>
        <div className="flex flex-col gap-md">
          <div>
            <label style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>이름을 정해줘</label>
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
                aria-label="랜덤 이름 뽑기"
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
            <div style={{ display: 'flex', gap: 6, marginTop: 'var(--sp-sm)' }}>
              {genderOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(opt.value)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${gender === opt.value ? 'var(--accent)' : 'var(--accent-light)'}`,
                    background: gender === opt.value ? 'var(--accent-light)' : 'var(--bg-secondary)',
                    fontWeight: gender === opt.value ? 700 : 500,
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
            🚀 새 인생 시작
          </button>

          {savedExists && (
            <button className="btn btn-secondary btn-block" onClick={handleContinue}>
              📂 이어하기
            </button>
          )}
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
                {legacy.parentName} · {legacy.parentGrade}등급 · {formatWon(legacy.inheritance)}
              </div>
              <button className="btn btn-primary btn-block" onClick={handleLegacyStart}>
                🎭 유산 이어받기
              </button>
            </div>
          )}
          {shareCodePresent && (
            <button className="btn btn-secondary btn-block" onClick={handleShare}>
              📩 친구의 인생 보기
            </button>
          )}
        </div>
      </div>

      {/* More modes — collapsed by default */}
      <Accordion
        label={moreModesOpen ? '다른 방식으로 시작하기 접기' : '다른 방식으로 시작하기'}
        open={moreModesOpen}
        onToggle={() => setMoreModesOpen(!moreModesOpen)}
      >
        <div className="flex flex-col gap-sm" style={{ marginTop: 'var(--sp-sm)' }}>
          <button className="btn btn-secondary btn-block" onClick={handleQuickStart}>
            ⚡ 빠른 시작 (랜덤 이름)
          </button>
          <button
            className="btn btn-secondary btn-block"
            style={{ borderColor: 'var(--gold, #ffd700)', background: '#fffde7' }}
            onClick={handleDailyChallenge}
          >
            🏅 오늘의 챌린지 ({new Date().getMonth() + 1}/{new Date().getDate()})
          </button>

          <div style={{ marginTop: 'var(--sp-xs)' }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--sp-xs)', color: 'var(--text-muted)' }}>
              🎯 도전 모드
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {CHALLENGE_MODES.map((cm) => (
                <button
                  key={cm.id}
                  onClick={() => handleChallengeMode(cm)}
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
        </div>
      </Accordion>

      {/* My records — only if any record exists */}
      {hasAnyRecord && (
        <Accordion
          label={myRecordsOpen ? '나의 기록 접기' : '나의 기록 펼쳐보기'}
          open={myRecordsOpen}
          onToggle={() => setMyRecordsOpen(!myRecordsOpen)}
        >
          <div className="flex flex-col gap-sm" style={{ marginTop: 'var(--sp-sm)' }}>
            {highScore && (
              <div className="card" style={{ width: '100%', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, marginBottom: 'var(--sp-xs)' }}>📊 역대 최고 기록</div>
                <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 'var(--font-size-sm)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>{highScore.bestGrade}</div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>최고 등급</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>{formatWon(highScore.highestAssets)}</div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>최고 자산</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>{highScore.totalGames}회</div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>총 플레이</div>
                  </div>
                </div>
              </div>
            )}

            {globalStats && (
              <button
                className="card"
                onClick={() => setShowGlobalStats(true)}
                aria-label="전체 통계 보기"
                style={{ width: '100%', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-card)' }}
              >
                <div style={{ fontWeight: 700, marginBottom: 'var(--sp-xs)' }}>📊 전체 통계</div>
                <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 'var(--font-size-sm)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>
                      {globalStats.totalGamesPlayed ?? globalStats.totalPlays ?? 0}회
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>총 플레이</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>
                      {globalStats.totalBought ?? 0}회
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>총 매수</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>
                      {(globalStats.totalScenariosSeen ?? []).length}개
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>본 시나리오</div>
                  </div>
                </div>
              </button>
            )}

            {unlockedCount > 0 && (
              <button
                className="card"
                onClick={() => setShowAchievements(true)}
                aria-label="업적 상세 보기"
                style={{ width: '100%', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-card)' }}
              >
                <div style={{ fontWeight: 700, marginBottom: 'var(--sp-xs)' }}>
                  🏆 업적 {unlockedCount}/{getTotalCount()}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {getAllAchievements().map((a) => {
                    const unlocked = loadUnlocked().some((u) => u.id === a.id);
                    return (
                      <span
                        key={a.id}
                        role="img"
                        aria-label={unlocked ? `업적 달성: ${a.title}` : '잠긴 업적'}
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
              </button>
            )}

            {gallery.length > 0 && (() => {
              const GRADE_EMOJI: Record<string, string> = { S: '👑', A: '🌟', B: '🙂', C: '🌱' };
              const recent = gallery.slice(0, 5);
              return (
                <div className="card" style={{ width: '100%' }}>
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
                        }}
                      >
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
          </div>
        </Accordion>
      )}

      {showAchievements && <AchievementsModal onClose={() => setShowAchievements(false)} />}
      {showGlobalStats && <GlobalStatsModal onClose={() => setShowGlobalStats(false)} />}
      {showReleaseNotes && <ReleaseNotesModal onClose={() => setShowReleaseNotes(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* 릴리즈 뱃지 — 미확인 있을 때만 */}
      {unseenReleaseCount > 0 && (
        <button
          onClick={handleOpenReleaseNotes}
          style={{
            background: 'linear-gradient(90deg, #ff9800, #ff7043)',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(255,112,67,0.35)',
          }}
        >
          📢 새 소식 {unseenReleaseCount}건
        </button>
      )}

      {/* Footer */}
      <div className="flex gap-md" style={{ alignItems: 'center', marginTop: 'var(--sp-sm)' }}>
        <button
          onClick={() => {
            const next = !sound;
            setSound(next);
            sfx.toggle(next);
          }}
          aria-label={sound ? '소리 끄기' : '소리 켜기'}
          aria-pressed={sound}
          style={{
            fontSize: 'var(--font-size-sm)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-secondary)',
            border: '1px solid #ddd',
          }}
        >
          {sound ? '🔊' : '🔇'}
        </button>
        <button
          onClick={() => setShowSettings(true)}
          aria-label="설정 열기"
          style={{
            fontSize: 'var(--font-size-sm)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-secondary)',
            border: '1px solid #ddd',
          }}
        >
          ⚙️ 설정
        </button>
        {savedExists && (
          <button
            className="text-muted"
            style={{ fontSize: 'var(--font-size-xs)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => { clearSave(); window.location.reload(); }}
          >
            저장 삭제
          </button>
        )}
      </div>

      {/* Version */}
      <button
        onClick={handleOpenReleaseNotes}
        style={{
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          opacity: 0.6,
          letterSpacing: '0.02em',
          textAlign: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
        }}
        aria-label={`버전 ${__APP_SEMVER__}, 빌드 ${__APP_VERSION__}, 새 소식 보기`}
        title="새 소식 보기"
      >
        v{__APP_SEMVER__} · {__APP_VERSION__}
      </button>
    </div>
  );
}

// 단순 아코디언 — 투박한 디테일 태그 대신 가볍게 직접 구현
function Accordion({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ width: '100%', maxWidth: 360 }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid var(--accent-light)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          color: 'var(--text-secondary, #555)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{label}</span>
        <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>{open ? '▴' : '▾'}</span>
      </button>
      {open && children}
    </div>
  );
}
