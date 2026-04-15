import { useState } from 'react';
import { useGameStore, DREAMS_MASTER } from '../../store/gameStore';
import { Icon } from '../icons/Icon';

type DifficultyLevel = 'easy' | 'normal' | 'hard' | 'legend';

interface DifficultyInfo {
  level: DifficultyLevel;
  label: string;
  stars: string;
  color: string;
  bg: string;
}

const DIFFICULTY_MAP: Record<DifficultyLevel, DifficultyInfo> = {
  easy:   { level: 'easy',   label: '쉬움',  stars: '⭐',       color: '#2d7a2d', bg: '#e8f5e9' },
  normal: { level: 'normal', label: '보통',  stars: '⭐⭐',     color: '#b35c00', bg: '#fff3e0' },
  hard:   { level: 'hard',   label: '어려움', stars: '⭐⭐⭐',   color: '#8b1a1a', bg: '#fce4ec' },
  legend: { level: 'legend', label: '전설',  stars: '⭐⭐⭐⭐', color: '#6a0dad', bg: '#f3e5f5' },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDifficulty(condition: any): DifficultyLevel {
  const { kind, value, shares, age, happiness } = condition;

  switch (kind) {
    case 'happinessGte':
    case 'hasTrait':
    case 'ageReached':
      return 'easy';

    case 'stockOwnedShares':
      return shares <= 100 ? 'normal' : 'hard';

    case 'jobHeld':
      return 'normal';

    case 'cashGte':
      return value <= 50000000 ? 'normal' : 'hard';

    case 'hasTraitAny':
      return 'hard';

    case 'ageReachedAndHappinessGte':
      return age >= 100 && happiness >= 80 ? 'hard' : 'normal';

    case 'wisdomGte':
    case 'charismaGte':
      return value >= 95 ? 'legend' : 'hard';

    case 'realEstateCountGte':
      return value >= 3 ? 'legend' : 'hard';

    case 'totalAssetsGte':
      if (value >= 1000000000) return 'legend';
      if (value >= 100000000)  return 'hard';
      return 'normal';

    default:
      return 'normal';
  }
}

// 추천 세트 정의
const BEGINNER_SET = ['happy_life', 'long_life', 'ddukbokki_shop'];
const CHALLENGE_SET = ['billionaire', 'd_knowledge_master', 'd_real_estate_mogul'];

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

  const applyPreset = (ids: string[]) => {
    setSelected(new Set(ids));
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

      {/* 추천 세트 버튼 */}
      <div className="flex gap-sm" style={{ justifyContent: 'center' }}>
        <button
          onClick={() => applyPreset(BEGINNER_SET)}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: '2px solid #2d7a2d',
            background: '#e8f5e9',
            color: '#2d7a2d',
            fontWeight: 600,
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
          }}
        >
          🌱 초보 세트
        </button>
        <button
          onClick={() => applyPreset(CHALLENGE_SET)}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: '2px solid #6a0dad',
            background: '#f3e5f5',
            color: '#6a0dad',
            fontWeight: 600,
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
          }}
        >
          <Icon slot="eco-boom" size="md" /> 도전 세트
        </button>
      </div>

      <div className="flex flex-col gap-sm">
        {DREAMS_MASTER.map((dream) => {
          const isSelected = selected.has(dream.id);
          const diffLevel = getDifficulty(dream.targetCondition);
          const diff = DIFFICULTY_MAP[diffLevel];
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
                position: 'relative',
              }}
              onClick={() => toggle(dream.id)}
            >
              {/* 난이도 뱃지 — 우측 상단 */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: diff.bg,
                  color: diff.color,
                  border: `1px solid ${diff.color}`,
                  borderRadius: '10px',
                  padding: '2px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  lineHeight: 1.4,
                  whiteSpace: 'nowrap',
                }}
              >
                {diff.stars} {diff.label}
              </div>

              <div className="flex gap-sm" style={{ alignItems: 'center', paddingRight: '80px' }}>
                <span style={{ fontSize: '2rem' }}>{dream.iconEmoji}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{dream.title}</div>
                  <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                    {dream.description}
                  </div>
                </div>
                {isSelected && <span style={{ marginLeft: 'auto', fontSize: '1.5rem' }}><Icon slot="status-check" size="md" /></span>}
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
