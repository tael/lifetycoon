// Web Audio API 기반 경량 beep 생성기 (외부 파일 없음)
const STORAGE_KEY = 'lifetycoon-kids:sound';

let ctx: AudioContext | null = null;
let enabled = (() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored !== 'off';
  } catch {
    return true;
  }
})();

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.1) {
  if (!enabled) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch {}
}

export const sfx = {
  coin: () => beep(800, 0.1, 'square', 0.1),
  levelUp: () => {
    beep(600, 0.08);
    setTimeout(() => beep(900, 0.1), 100);
    setTimeout(() => beep(1200, 0.15), 200);
  },
  event: () => beep(440, 0.15, 'triangle', 0.08),
  buy: () => beep(700, 0.08, 'square', 0.08),
  sell: () => beep(500, 0.08, 'square', 0.08),
  achievement: () => {
    beep(700, 0.1);
    setTimeout(() => beep(900, 0.1), 100);
    setTimeout(() => beep(1100, 0.1), 200);
    setTimeout(() => beep(1400, 0.2), 300);
  },
  ending: () => {
    beep(400, 0.3, 'sine', 0.08);
    setTimeout(() => beep(500, 0.3, 'sine', 0.08), 300);
    setTimeout(() => beep(600, 0.5, 'sine', 0.08), 600);
  },
  toggle: (on: boolean) => {
    enabled = on;
    try { localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off'); } catch {}
  },
  isEnabled: () => enabled,
};
