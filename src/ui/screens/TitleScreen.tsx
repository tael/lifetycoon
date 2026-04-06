import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { hasSave, loadGame, clearSave } from '../../store/persistence';
import { extractShareCodeFromUrl, decodeShareCode } from '../../store/shareCode';

export function TitleScreen() {
  const goTo = useGameStore((s) => s.goTo);
  const loadSnapshot = useGameStore((s) => s.loadSnapshot);
  const [name, setName] = useState('');
  const savedExists = hasSave();

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

      {savedExists && (
        <button
          className="text-muted"
          style={{ fontSize: 'var(--font-size-xs)', textDecoration: 'underline' }}
          onClick={() => { clearSave(); window.location.reload(); }}
        >
          저장 데이터 삭제
        </button>
      )}
    </div>
  );
}
