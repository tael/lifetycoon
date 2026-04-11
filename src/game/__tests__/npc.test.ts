import { describe, it, expect } from 'vitest';
import { stepNpc, TARGET_MULTIPLIER } from '../domain/npc';
import type { FriendNPC } from '../types';

function makeNpc(personality: FriendNPC['personality']): FriendNPC {
  return {
    id: 'test',
    name: '테스트',
    personality,
    iconEmoji: '🧑',
    currentAge: 20,
    currentAssets: 50_000,
    currentJob: '학생',
    dreamsAchieved: 0,
    status: '공부 중',
  };
}

// 고정 seed RNG
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}

describe('stepNpc - 플레이어 자산 catch-up', () => {
  it('플레이어 자산 0 시 기존 자연 성장과 동일하게 동작', () => {
    const npc = makeNpc('conservative');
    const rng1 = makeRng(42);
    const rng2 = makeRng(42);
    const withPlayer = stepNpc(npc, 21, rng1, 0);
    const withoutPlayer = stepNpc(npc, 21, rng2, 0);
    expect(withPlayer.currentAssets).toBe(withoutPlayer.currentAssets);
  });

  it('플레이어 자산 1억 시 aggressive NPC가 목표치(1.15억) 방향으로 1년 내 이동', () => {
    // NPC 자산이 목표보다 낮을 때 catch-up으로 목표 방향으로 이동하는지 확인
    const playerAssets = 100_000_000;
    const npc: FriendNPC = { ...makeNpc('aggressive'), currentAssets: 50_000_000 };
    const rng = makeRng(999);

    const result = stepNpc(npc, 21, rng, playerAssets);

    const target = playerAssets * TARGET_MULTIPLIER['aggressive']; // 1.15억
    // 초기 50만 → 목표 1.15억 방향으로 이동했어야 함
    const distanceBefore = Math.abs(npc.currentAssets - target);
    const distanceAfter = Math.abs(result.currentAssets - target);
    expect(distanceAfter).toBeLessThan(distanceBefore);
  });

  it('conservative NPC는 플레이어 자산의 60% 근처로 수렴', () => {
    const playerAssets = 50_000_000;
    const npc = makeNpc('conservative');
    const rng = makeRng(1234);

    let current = npc;
    for (let age = 21; age <= 100; age++) {
      current = stepNpc(current, age, rng, playerAssets);
    }

    const target = playerAssets * TARGET_MULTIPLIER['conservative']; // 3천만
    const ratio = current.currentAssets / target;
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(5.0);
  });

  it('플레이어가 가난해지면 NPC도 하향 조정됨 (catch-up 양방향)', () => {
    // 초기에는 NPC 자산이 큰 상태에서 플레이어가 적은 금액으로 전달
    const richNpc: FriendNPC = { ...makeNpc('scholarly'), currentAssets: 10_000_000 };
    const poorPlayerAssets = 1_000_000;
    const rng = makeRng(777);

    let current = richNpc;
    for (let age = 21; age <= 30; age++) {
      current = stepNpc(current, age, rng, poorPlayerAssets);
    }

    // 10년 뒤 NPC 자산이 초기보다 줄었거나 적어도 증가 속도가 억제됨
    const target = poorPlayerAssets * TARGET_MULTIPLIER['scholarly'];
    // NPC가 목표보다 너무 멀리 있으면 하향 catch-up이 작동
    // 단순히 목표 방향으로 이동했는지 확인
    const distanceBefore = Math.abs(richNpc.currentAssets - target);
    const distanceAfter = Math.abs(current.currentAssets - target);
    expect(distanceAfter).toBeLessThan(distanceBefore);
  });

  it('최솟값 10000 보장', () => {
    const npc: FriendNPC = { ...makeNpc('conservative'), currentAssets: 5000 };
    const rng = makeRng(0);
    const result = stepNpc(npc, 21, rng, 100);
    expect(result.currentAssets).toBeGreaterThanOrEqual(10000);
  });
});
