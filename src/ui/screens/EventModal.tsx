import type { EconomicEvent, EventEffect } from '../../game/types';
import { useGameStore } from '../../store/gameStore';
import { showToast } from '../components/Toast';

export function EventModal({ event }: { event: EconomicEvent }) {
  const chooseOption = useGameStore((s) => s.chooseOption);

  const handleChoice = (index: number) => {
    const choice = event.choices[index];
    chooseOption(index);
    // Show outcome toast
    const hints = effectHints(choice.effects);
    if (hints) showToast(hints, '📋', 'info', 2500);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={event.title}>
      <div className="modal-content">
        <div className="text-center" style={{ marginBottom: 'var(--sp-lg)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--sp-sm)' }}>📢</div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
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
              className="btn btn-secondary btn-block"
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
              <span style={{ fontWeight: 600 }}>{choice.label}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {effectIcons(choice.effects)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function effectIcons(effects: EventEffect[]): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  for (const eff of effects) {
    switch (eff.kind) {
      case 'cash':
        nodes.push(<span key={nodes.length} style={{ color: eff.delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          💰{eff.delta >= 0 ? '+' : ''}{compact(eff.delta)}
        </span>);
        break;
      case 'happiness':
        nodes.push(<span key={nodes.length}>{eff.delta >= 0 ? '💛+' : '💛'}{eff.delta}</span>);
        break;
      case 'health':
        nodes.push(<span key={nodes.length}>{eff.delta >= 0 ? '❤️+' : '❤️'}{eff.delta}</span>);
        break;
      case 'wisdom':
        nodes.push(<span key={nodes.length}>{eff.delta >= 0 ? '📘+' : '📘'}{eff.delta}</span>);
        break;
      case 'charisma':
        nodes.push(<span key={nodes.length}>{eff.delta >= 0 ? '✨+' : '✨'}{eff.delta}</span>);
        break;
      case 'addTrait':
        nodes.push(<span key={nodes.length}>🏷️{eff.trait}</span>);
        break;
      case 'setJob':
        nodes.push(<span key={nodes.length}>💼전직</span>);
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
