import { useState, useEffect, useCallback } from 'react';

export type ToastItem = {
  id: number;
  message: string;
  emoji?: string;
  type: 'success' | 'info' | 'warning' | 'achievement';
  duration?: number;
};

let toastId = 0;
let addToastFn: ((t: Omit<ToastItem, 'id'>) => void) | null = null;

export function showToast(message: string, emoji?: string, type: ToastItem['type'] = 'info', duration = 2500) {
  addToastFn?.({ message, emoji, type, duration });
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-4), { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, t.duration ?? 2500);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  const bgColors: Record<ToastItem['type'], string> = {
    success: '#4caf50',
    info: '#42a5f5',
    warning: '#ffb300',
    achievement: 'linear-gradient(135deg, #ffd700, #ff7043)',
  };

  return (
    <div style={{
      position: 'fixed',
      top: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
      maxWidth: 360,
      width: '90%',
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: t.type === 'achievement' ? bgColors.achievement : bgColors[t.type],
            color: '#fff',
            padding: '10px 16px',
            borderRadius: 12,
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            animation: 'toastIn 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {t.emoji && <span style={{ fontSize: '1.3rem' }}>{t.emoji}</span>}
          <span>{t.message}</span>
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
