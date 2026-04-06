import type { EconomicEvent } from '../../game/types';
import { useGameStore } from '../../store/gameStore';

export function EventModal({ event }: { event: EconomicEvent }) {
  const chooseOption = useGameStore((s) => s.chooseOption);

  const handleChoice = (index: number) => {
    chooseOption(index);
  };

  // Prevent ESC or back closing modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') e.preventDefault();
  };

  return (
    <div className="modal-overlay" onKeyDown={handleKeyDown} role="dialog" aria-modal="true" aria-label={event.title}>
      <div className="modal-content">
        <div className="text-center" style={{ marginBottom: 'var(--sp-lg)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--sp-sm)' }}>📢</div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
            {event.title}
          </h2>
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
              }}
              onClick={() => handleChoice(i)}
            >
              <span style={{ fontWeight: 600 }}>{choice.label}</span>
              {choice.flavorText && (
                <span className="text-muted" style={{ display: 'block', fontSize: 'var(--font-size-sm)' }}>
                  {choice.flavorText}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
