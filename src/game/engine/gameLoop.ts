// rAF-based game loop with tick ref (store is written on intAge change only)

import { MS_PER_YEAR, elapsedMsToAge, isFinished } from './timeAxis';

export type GameLoopState = {
  elapsedMs: number;
  speedMultiplier: 0.5 | 1 | 2;
  running: boolean;
};

export type GameLoopCallbacks = {
  onIntAgeChange: (newIntAge: number, deltaYears: number, elapsedMs: number) => void;
  onFinished: () => void;
};

export type GameLoopHandle = {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setSpeed: (s: 0.5 | 1 | 2) => void;
  getState: () => GameLoopState;
  getElapsedMs: () => number;
  setElapsedMs: (ms: number) => void;
  // "시간 비용" 전용 — 이벤트/선택으로 강제로 시간이 흘러갈 때 사용.
  // setElapsedMs와 달리 정수 나이 경계를 넘으면 callbacks.onIntAgeChange를
  // 호출해서 store의 연도 기반 갱신(월급·이자·주가·NPC 등)이 정상적으로 돈다.
  addElapsedMs: (ms: number) => void;
  isRunning: () => boolean;
};

// Test/headless injection point
export type FrameScheduler = {
  request: (cb: (t: number) => void) => number;
  cancel: (id: number) => void;
  now: () => number;
};

export const rafScheduler: FrameScheduler = {
  request: (cb) =>
    typeof requestAnimationFrame !== 'undefined'
      ? requestAnimationFrame(cb)
      : (setTimeout(() => cb(Date.now()), 16) as unknown as number),
  cancel: (id) => {
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(id);
    else clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
  },
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
};

export function createGameLoop(
  callbacks: GameLoopCallbacks,
  scheduler: FrameScheduler = rafScheduler,
): GameLoopHandle {
  const state: GameLoopState = {
    elapsedMs: 0,
    speedMultiplier: 1,
    running: false,
  };
  let lastTick = 0;
  let rafId: number | null = null;
  let lastIntAge = 10;

  function tick(now: number) {
    if (!state.running) return;
    const rawDelta = now - lastTick;
    lastTick = now;
    // Clamp delta to avoid huge jumps after hidden tab
    const delta = Math.min(rawDelta, 100);
    const scaled = delta * state.speedMultiplier;
    state.elapsedMs += scaled;

    const age = elapsedMsToAge(state.elapsedMs);
    const intAge = Math.floor(age);
    if (intAge !== lastIntAge) {
      const deltaYears = intAge - lastIntAge;
      lastIntAge = intAge;
      callbacks.onIntAgeChange(intAge, deltaYears, state.elapsedMs);
    }

    if (isFinished(age)) {
      state.running = false;
      callbacks.onFinished();
      return;
    }

    rafId = scheduler.request(tick);
  }

  return {
    start() {
      state.running = true;
      lastTick = scheduler.now();
      lastIntAge = Math.floor(elapsedMsToAge(state.elapsedMs));
      if (rafId !== null) scheduler.cancel(rafId);
      rafId = scheduler.request(tick);
    },
    stop() {
      state.running = false;
      if (rafId !== null) scheduler.cancel(rafId);
      rafId = null;
    },
    pause() {
      state.running = false;
      if (rafId !== null) scheduler.cancel(rafId);
      rafId = null;
    },
    resume() {
      if (state.running) return;
      state.running = true;
      lastTick = scheduler.now();
      if (rafId !== null) scheduler.cancel(rafId);
      rafId = scheduler.request(tick);
    },
    setSpeed(s) {
      state.speedMultiplier = s;
    },
    getState: () => ({ ...state }),
    getElapsedMs: () => state.elapsedMs,
    setElapsedMs: (ms) => {
      state.elapsedMs = ms;
      lastIntAge = Math.floor(elapsedMsToAge(ms));
    },
    addElapsedMs: (ms) => {
      if (ms <= 0) return;
      state.elapsedMs += ms;
      const newAge = elapsedMsToAge(state.elapsedMs);
      const newIntAge = Math.floor(newAge);
      if (newIntAge !== lastIntAge) {
        const deltaYears = newIntAge - lastIntAge;
        lastIntAge = newIntAge;
        callbacks.onIntAgeChange(newIntAge, deltaYears, state.elapsedMs);
      }
      if (isFinished(newAge)) {
        state.running = false;
        callbacks.onFinished();
      }
    },
    isRunning: () => state.running,
  };
}

export { MS_PER_YEAR };
