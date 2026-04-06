import { useState } from 'react';
import { useGameStore, DREAMS_MASTER } from '../../store/gameStore';

export function DreamPickScreen() {
  const startNewGame = useGameStore((s) => s.startNewGame);
  const characterName = useGameStore((s) => s.character.name);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const handleStart = () => {
    if (selected.size === 0) return;
    startNewGame(characterName, [...selected]);
  };

  return (
    <div className="app-container flex flex-col" style={{ gap: 'var(--sp-lg)' }}>
      <div className="text-center">
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
          {characterName}의 꿈을 골라줘!
        </h2>
        <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--sp-xs)' }}>
          최대 3개까지 고를 수 있어 (최소 1개)
        </p>
      </div>

      <div className="flex flex-col gap-sm">
        {DREAMS_MASTER.map((dream) => {
          const isSelected = selected.has(dream.id);
          return (
            <button
              key={dream.id}
              className="card"
              style={{
                border: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                background: isSelected ? 'var(--accent-light)' : 'var(--bg-card)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onClick={() => toggle(dream.id)}
            >
              <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                <span style={{ fontSize: '2rem' }}>{dream.iconEmoji}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{dream.title}</div>
                  <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                    {dream.description}
                  </div>
                </div>
                {isSelected && <span style={{ marginLeft: 'auto', fontSize: '1.5rem' }}>✅</span>}
              </div>
            </button>
          );
        })}
      </div>

      <button
        className="btn btn-primary btn-lg btn-block"
        onClick={handleStart}
        disabled={selected.size === 0}
        style={{ marginTop: 'var(--sp-md)', position: 'sticky', bottom: 'var(--sp-md)' }}
      >
        🎮 인생 시작! ({selected.size}개 선택)
      </button>
    </div>
  );
}
