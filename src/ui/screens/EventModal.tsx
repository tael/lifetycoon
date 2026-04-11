import { useEffect, useRef } from 'react';
import type { EconomicEvent, EventEffect } from '../../game/types';
import { useGameStore } from '../../store/gameStore';
import { showToast } from '../components/Toast';
import { sfx } from '../../game/engine/soundFx';
import { KEY_SHOW_STAT_HINTS, readAutoChoice } from '../components/SettingsModal';

function readShowStatHints(): boolean {
  try {
    return localStorage.getItem(KEY_SHOW_STAT_HINTS) === 'true';
  } catch {
    return false;
  }
}

function cashDelta(effects: EventEffect[]): number {
  return effects.reduce((sum, eff) => {
    if (eff.kind === 'cash' || eff.kind === 'money') return sum + eff.delta;
    return sum;
  }, 0);
}

function vibrate() {
  try { navigator?.vibrate?.(50); } catch { /* ignore */ }
}

export function EventModal({ event }: { event: EconomicEvent }) {
  const chooseOption = useGameStore((s) => s.chooseOption);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstBtnRef = useRef<HTMLButtonElement>(null);
  const showHints = readShowStatHints();

  useEffect(() => {
    sfx.event();
    vibrate();
    // 첫 번째 선택지 버튼으로 포커스 이동, 없으면 모달 컨테이너로
    (firstBtnRef.current ?? modalRef.current)?.focus();
    const handler = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= event.choices.length) {
        handleChoice(num - 1);
      }
    };
    window.addEventListener('keydown', handler);

    // 자동선택
    const autoMode = readAutoChoice();
    let autoTimer: ReturnType<typeof setTimeout> | null = null;
    if (autoMode !== 'off' && event.choices.length > 0) {
      autoTimer = setTimeout(() => {
        if (autoMode === 'random') {
          const idx = Math.floor(Math.random() * event.choices.length);
          handleChoice(idx);
        } else {
          // optimal: cash delta 최대 선택지
          let bestIdx = 0;
          let bestDelta = cashDelta(event.choices[0].effects);
          for (let i = 1; i < event.choices.length; i++) {
            const delta = cashDelta(event.choices[i].effects);
            if (delta > bestDelta) { bestDelta = delta; bestIdx = i; }
          }
          handleChoice(bestIdx);
        }
      }, 100);
    }

    return () => {
      window.removeEventListener('keydown', handler);
      if (autoTimer !== null) clearTimeout(autoTimer);
    };
  }, [event]);

  const handleChoice = (index: number) => {
    const choice = event.choices[index];
    chooseOption(index);
    vibrate();
    const hints = effectHints(choice.effects);
    if (hints) showToast(hints, '📋', 'info', 2500);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="event-modal-title" ref={modalRef} tabIndex={-1}>
      <div className="modal-content" style={{ animation: 'modalPop 0.25s ease-out' }}>
        <div className="text-center" style={{ marginBottom: 'var(--sp-lg)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--sp-sm)' }}>📢</div>
          <h2 id="event-modal-title" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
            {event.title}
          </h2>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
            {Math.floor(event.triggeredAtAge)}세
          </div>
        </div>
        <p style={{
          fontSize: 'var(--font-size-base)',
          lineHeight: 1.8,
          marginBottom: 'var(--sp-lg)',
          textAlign: 'center',
        }}>
          {event.text}
        </p>
        <div className="flex flex-col gap-sm">
          {event.choices.map((choice, i) => (
            <button
              key={i}
              ref={i === 0 ? firstBtnRef : undefined}
              className="btn btn-secondary btn-block"
              aria-label={`선택 ${i + 1}: ${choice.label}`}
              style={{
                textAlign: 'left',
                padding: 'var(--sp-md)',
                minHeight: 56,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 4,
              }}
              onClick={() => handleChoice(i)}
            >
              <span style={{ fontWeight: 600 }}>
                <span style={{ opacity: 0.4, fontSize: '0.7rem', marginRight: 4 }}>{i + 1}.</span>
                {choice.label}
              </span>
              <span style={{ fontSize: '0.7rem', opacity: 0.6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {effectIcons(choice.effects, showHints)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function effectIcons(effects: EventEffect[], showHints: boolean): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  for (const eff of effects) {
    switch (eff.kind) {
      case 'cash':
      case 'money':
        nodes.push(<span key={nodes.length} style={{ color: eff.delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          💰{eff.delta >= 0 ? '+' : ''}{compact(eff.delta)}
        </span>);
        break;
      case 'addTrait':
        nodes.push(<span key={nodes.length}>🏷️{eff.trait}</span>);
        break;
      case 'setJob':
        nodes.push(<span key={nodes.length}>💼전직</span>);
        break;
      // stockShock: 주식 변동은 중요 정보라 노출 (어느 종목인지까지)
      case 'stockShock':
        nodes.push(<span key={nodes.length} style={{ color: eff.multiplier >= 1 ? 'var(--success)' : 'var(--danger)' }}>
          📈{eff.ticker}
        </span>);
        break;
      // bankInterestChange: 이자율 변경은 중요 정보
      case 'bankInterestChange':
        nodes.push(<span key={nodes.length}>🏦이자{eff.delta >= 0 ? '+' : ''}{(eff.delta * 100).toFixed(1)}%</span>);
        break;
      // 스탯 힌트: showHints=true 일 때만 표시
      case 'happiness':
        if (showHints) nodes.push(<span key={nodes.length} style={{ color: eff.delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>😊{eff.delta >= 0 ? '+' : ''}{eff.delta}</span>);
        break;
      case 'health':
        if (showHints) nodes.push(<span key={nodes.length} style={{ color: eff.delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>❤️{eff.delta >= 0 ? '+' : ''}{eff.delta}</span>);
        break;
      case 'wisdom':
        if (showHints) nodes.push(<span key={nodes.length} style={{ color: eff.delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>📚{eff.delta >= 0 ? '+' : ''}{eff.delta}</span>);
        break;
      case 'charisma':
        if (showHints) nodes.push(<span key={nodes.length} style={{ color: eff.delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>✨{eff.delta >= 0 ? '+' : ''}{eff.delta}</span>);
        break;
    }
  }
  return nodes;
}

function effectHints(effects: EventEffect[]): string {
  const parts: string[] = [];
  for (const eff of effects) {
    if (eff.kind === 'cash' && Math.abs(eff.delta) > 100000) {
      parts.push(eff.delta > 0 ? `+${compact(eff.delta)} 획득!` : `${compact(eff.delta)} 지출`);
    }
    if (eff.kind === 'addTrait') parts.push(`#${eff.trait} 획득`);
    if (eff.kind === 'setJob') parts.push('직업 변경!');
  }
  return parts.join(' · ');
}

function compact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 100000000) return `${sign}${(abs / 100000000).toFixed(1)}억`;
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(0)}만`;
  return `${sign}${abs.toLocaleString()}`;
}
