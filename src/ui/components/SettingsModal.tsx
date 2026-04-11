import { useState } from 'react';
import { sfx } from '../../game/engine/soundFx';
import { clearSave, saveGame } from '../../store/persistence';
import { useGameStore } from '../../store/gameStore';

// localStorage keys
const KEY_VIBRATION = 'lifetycoon-kids:vibration';
const KEY_FONT_SIZE = 'lifetycoon-kids:font-size';
const KEY_STAT_DISPLAY = 'lifetycoon-kids:stat-display';
const KEY_THEME = 'lifetycoon-kids:theme';

export type StatDisplay = 'number' | 'progress' | 'both';
export type FontSize = 'small' | 'base' | 'large';

function readVibration(): boolean {
  try {
    const v = localStorage.getItem(KEY_VIBRATION);
    return v === null ? true : v === 'true';
  } catch {
    return true;
  }
}

function readFontSize(): FontSize {
  try {
    const v = localStorage.getItem(KEY_FONT_SIZE);
    if (v === 'small' || v === 'large') return v;
    return 'base';
  } catch {
    return 'base';
  }
}

function readStatDisplay(): StatDisplay {
  try {
    const v = localStorage.getItem(KEY_STAT_DISPLAY);
    if (v === 'number' || v === 'progress') return v;
    return 'both';
  } catch {
    return 'both';
  }
}

function applyFontSize(size: FontSize) {
  const root = document.documentElement;
  root.dataset.fontSize = size;
  const scale = size === 'small' ? '14px' : size === 'large' ? '18px' : '16px';
  root.style.setProperty('--font-size-base-override', scale);
}

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const [sound, setSound] = useState(() => sfx.isEnabled());
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  const [vibration, setVibration] = useState(readVibration);
  const [fontSize, setFontSize] = useState<FontSize>(readFontSize);
  const [statDisplay, setStatDisplay] = useState<StatDisplay>(readStatDisplay);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const loadSnapshot = useGameStore((s) => s.loadSnapshot);

  const handleSound = () => {
    const next = !sound;
    setSound(next);
    sfx.toggle(next);
  };

  const handleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : '';
    try { localStorage.setItem(KEY_THEME, next ? 'dark' : 'light'); } catch {}
  };

  const handleVibration = () => {
    const next = !vibration;
    setVibration(next);
    try { localStorage.setItem(KEY_VIBRATION, String(next)); } catch {}
  };

  const handleFontSize = (size: FontSize) => {
    setFontSize(size);
    try { localStorage.setItem(KEY_FONT_SIZE, size); } catch {}
    applyFontSize(size);
  };

  const handleStatDisplay = (mode: StatDisplay) => {
    setStatDisplay(mode);
    try { localStorage.setItem(KEY_STAT_DISPLAY, mode); } catch {}
  };

  // Export save data as JSON file
  const handleExport = () => {
    try {
      const state = useGameStore.getState();
      const data = JSON.stringify(state, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifetycoon-save-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('내보내기에 실패했어요.');
    }
  };

  // Import save data from JSON file
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text);
          loadSnapshot(parsed);
          saveGame(useGameStore.getState());
          setImportError(null);
          onClose();
        } catch {
          setImportError('저장 파일을 읽을 수 없어요. 올바른 파일인지 확인해주세요.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleDeleteAll = () => {
    clearSave();
    window.location.reload();
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 9000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    background: 'var(--bg-card, #fff)',
    borderRadius: 'var(--radius-lg, 16px)',
    width: '100%',
    maxWidth: 380,
    maxHeight: '85dvh',
    overflowY: 'auto',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    padding: '24px 20px',
  };

  const sectionStyle: React.CSSProperties = {
    borderBottom: '1px solid var(--border, #f0f0f0)',
    paddingBottom: 16,
    marginBottom: 16,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '8px 0',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-sm, 14px)',
    fontWeight: 600,
  };

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    width: 44,
    height: 24,
    borderRadius: 12,
    background: on ? 'var(--accent, #ff9800)' : '#ccc',
    position: 'relative',
    cursor: 'pointer',
    border: 'none',
    transition: 'background 0.2s',
    flexShrink: 0,
  });

  const knobStyle = (on: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: 2,
    left: on ? 22 : 2,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.2s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
  });

  const segStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '5px 0',
    fontSize: 'var(--font-size-xs, 12px)',
    fontWeight: active ? 700 : 400,
    background: active ? 'var(--accent, #ff9800)' : 'var(--bg-secondary, #f5f5f5)',
    color: active ? '#fff' : 'var(--text-secondary, #666)',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  });

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg, 18px)', fontWeight: 800 }}>⚙️ 설정</h2>
          <button
            onClick={onClose}
            aria-label="설정 닫기"
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Sound */}
        <div style={sectionStyle}>
          <div style={rowStyle}>
            <span style={labelStyle}>🔊 사운드</span>
            <button
              style={toggleStyle(sound)}
              onClick={handleSound}
              aria-label={sound ? '사운드 끄기' : '사운드 켜기'}
              aria-pressed={sound}
            >
              <span style={knobStyle(sound)} />
            </button>
          </div>
        </div>

        {/* Dark mode */}
        <div style={sectionStyle}>
          <div style={rowStyle}>
            <span style={labelStyle}>🌙 다크 모드</span>
            <button
              style={toggleStyle(dark)}
              onClick={handleDark}
              aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
              aria-pressed={dark}
            >
              <span style={knobStyle(dark)} />
            </button>
          </div>
        </div>

        {/* Vibration */}
        <div style={sectionStyle}>
          <div style={rowStyle}>
            <span style={labelStyle}>📳 진동</span>
            <button
              style={toggleStyle(vibration)}
              onClick={handleVibration}
              aria-label={vibration ? '진동 끄기' : '진동 켜기'}
              aria-pressed={vibration}
            >
              <span style={knobStyle(vibration)} />
            </button>
          </div>
        </div>

        {/* Stat display */}
        <div style={sectionStyle}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>📊 스탯 표시 방식</div>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-md, 8px)', overflow: 'hidden', border: '1px solid var(--border, #e0e0e0)' }}>
            <button style={{ ...segStyle(statDisplay === 'number'), borderRadius: '8px 0 0 8px' }} onClick={() => handleStatDisplay('number')}>숫자</button>
            <button style={{ ...segStyle(statDisplay === 'progress'), borderRadius: 0, borderLeft: '1px solid var(--border, #e0e0e0)', borderRight: '1px solid var(--border, #e0e0e0)' }} onClick={() => handleStatDisplay('progress')}>바</button>
            <button style={{ ...segStyle(statDisplay === 'both'), borderRadius: '0 8px 8px 0' }} onClick={() => handleStatDisplay('both')}>둘 다</button>
          </div>
        </div>

        {/* Font size */}
        <div style={sectionStyle}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>🎨 글꼴 크기</div>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-md, 8px)', overflow: 'hidden', border: '1px solid var(--border, #e0e0e0)' }}>
            <button style={{ ...segStyle(fontSize === 'small'), borderRadius: '8px 0 0 8px' }} onClick={() => handleFontSize('small')}>작게</button>
            <button style={{ ...segStyle(fontSize === 'base'), borderRadius: 0, borderLeft: '1px solid var(--border, #e0e0e0)', borderRight: '1px solid var(--border, #e0e0e0)' }} onClick={() => handleFontSize('base')}>기본</button>
            <button style={{ ...segStyle(fontSize === 'large'), borderRadius: '0 8px 8px 0' }} onClick={() => handleFontSize('large')}>크게</button>
          </div>
        </div>

        {/* Data management */}
        <div style={sectionStyle}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>💾 데이터 관리</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="btn btn-secondary btn-block"
              onClick={handleExport}
            >
              📤 저장 데이터 내보내기
            </button>
            <button
              className="btn btn-secondary btn-block"
              onClick={handleImport}
            >
              📥 저장 데이터 가져오기
            </button>
            {importError && (
              <div style={{ fontSize: 'var(--font-size-xs, 12px)', color: 'var(--danger, #e53935)', padding: '4px 0' }}>
                {importError}
              </div>
            )}
          </div>
        </div>

        {/* Delete all */}
        <div>
          <div style={{ ...labelStyle, marginBottom: 8 }}>🔄 데이터 초기화</div>
          {!showDeleteConfirm ? (
            <button
              className="btn btn-block"
              style={{ background: '#fff0f0', color: 'var(--danger, #e53935)', border: '1px solid var(--danger, #e53935)', fontWeight: 700 }}
              onClick={() => setShowDeleteConfirm(true)}
            >
              모든 데이터 삭제
            </button>
          ) : (
            <div style={{ background: '#fff0f0', borderRadius: 'var(--radius-md, 8px)', padding: 12 }}>
              <div style={{ fontSize: 'var(--font-size-sm, 14px)', fontWeight: 600, marginBottom: 10, color: 'var(--danger, #e53935)' }}>
                정말 삭제할까요? 되돌릴 수 없어요!
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-block"
                  style={{ background: 'var(--danger, #e53935)', color: '#fff', fontWeight: 700 }}
                  onClick={handleDeleteAll}
                >
                  삭제
                </button>
                <button
                  className="btn btn-secondary btn-block"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
