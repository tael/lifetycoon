import { describe, it, expect, vi } from 'vitest';
import { createGameLoop, type FrameScheduler } from '../engine/gameLoop';
import { MS_PER_YEAR, START_AGE, elapsedMsToAge } from '../engine/timeAxis';
import type { EventChoice } from '../types';

// 시간 자원 승격(timeCostMonths) 회귀 테스트.
// 1) choice.timeCostMonths 필드가 타입에 정상적으로 존재한다.
// 2) gameLoop.addElapsedMs가 나이를 실제로 진행시키고, 정수 나이 경계를
//    넘으면 onIntAgeChange 콜백이 호출된다.

function noopScheduler(): FrameScheduler {
  return {
    request: () => 0,
    cancel: () => {},
    now: () => 0,
  };
}

describe('EventChoice.timeCostMonths 타입', () => {
  it('선택지에 timeCostMonths 필드를 지정할 수 있다', () => {
    const choice: EventChoice = {
      label: '대학원 진학',
      effects: [{ kind: 'wisdom', delta: 10 }],
      importance: 0.8,
      timeCostMonths: 24,
    };
    expect(choice.timeCostMonths).toBe(24);
  });

  it('timeCostMonths 생략 시 undefined로 역호환 유지된다', () => {
    const choice: EventChoice = {
      label: '즉석 선택',
      effects: [{ kind: 'cash', delta: 1000 }],
      importance: 0.3,
    };
    expect(choice.timeCostMonths).toBeUndefined();
  });
});

describe('gameLoop.addElapsedMs', () => {
  it('1개월 가산 시 나이가 1/12년 앞당겨진다', () => {
    const onIntAgeChange = vi.fn();
    const onFinished = vi.fn();
    const loop = createGameLoop({ onIntAgeChange, onFinished }, noopScheduler());
    loop.start();
    expect(loop.getElapsedMs()).toBe(0);

    loop.addElapsedMs(MS_PER_YEAR / 12);
    const ageAfter = elapsedMsToAge(loop.getElapsedMs());
    expect(ageAfter).toBeCloseTo(START_AGE + 1 / 12, 5);
    // 정수 나이는 여전히 10세 → onIntAgeChange는 호출되지 않았어야 함
    expect(onIntAgeChange).not.toHaveBeenCalled();
  });

  it('정수 나이 경계를 넘으면 onIntAgeChange가 호출된다', () => {
    const onIntAgeChange = vi.fn();
    const onFinished = vi.fn();
    const loop = createGameLoop({ onIntAgeChange, onFinished }, noopScheduler());
    loop.start();

    // 13개월 = 1년 1개월 가산 → 10세 → 11세 경계 넘김
    loop.addElapsedMs((MS_PER_YEAR / 12) * 13);
    expect(onIntAgeChange).toHaveBeenCalledTimes(1);
    expect(onIntAgeChange).toHaveBeenCalledWith(11, 1, expect.any(Number));
  });
});
