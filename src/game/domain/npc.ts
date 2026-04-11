import type { FriendNPC } from '../types';
import { randFloat } from '../engine/prng';

export type NpcPersonalityParams = {
  riskAppetite: number; // 0..1
  luckFactor: number; // 0..1
  growthRate: number; // base annual asset growth rate
};

export const PERSONALITY_PARAMS: Record<
  FriendNPC['personality'],
  NpcPersonalityParams
> = {
  conservative: { riskAppetite: 0.2, luckFactor: 0.4, growthRate: 0.04 },
  aggressive: { riskAppetite: 0.9, luckFactor: 0.5, growthRate: 0.09 },
  lucky: { riskAppetite: 0.5, luckFactor: 0.9, growthRate: 0.07 },
  scholarly: { riskAppetite: 0.4, luckFactor: 0.5, growthRate: 0.06 },
};

export function createNpcFromSeed(
  id: string,
  name: string,
  personality: FriendNPC['personality'],
  iconEmoji: string,
): FriendNPC {
  return {
    id,
    name,
    personality,
    iconEmoji,
    currentAge: 10,
    currentAssets: 50000,
    currentJob: '학생',
    dreamsAchieved: 0,
    status: '학교 다니는 중',
  };
}

// 성격별 플레이어 자산 대비 목표 비율
export const TARGET_MULTIPLIER: Record<FriendNPC['personality'], number> = {
  conservative: 0.6,  // 보수적: 플레이어의 60%
  aggressive: 1.15,   // 공격적: 플레이어보다 약간 앞서기도
  lucky: 0.9,         // 럭키: 플레이어의 90%
  scholarly: 0.85,    // 학구적: 플레이어의 85%
};

// 연간 catch-up 강도 (0.1 = 목표와의 차이를 연간 10% 좁힘)
const CATCH_UP_FACTOR = 0.1;

export function stepNpc(
  npc: FriendNPC,
  newAge: number,
  rng: () => number,
  playerAssets: number,
): FriendNPC {
  const p = PERSONALITY_PARAMS[npc.personality];
  const yearsPassed = newAge - npc.currentAge;
  if (yearsPassed <= 0) return npc;
  // Volatile growth
  const base = p.growthRate * yearsPassed;
  const noise = randFloat(rng, -0.25, 0.35) * p.riskAppetite * yearsPassed;
  const lucky =
    rng() < 0.1 * p.luckFactor ? randFloat(rng, 0.2, 0.8) * yearsPassed : 0;
  const growth = 1 + base + noise + lucky;
  let newAssets = Math.max(1000, Math.round(npc.currentAssets * growth));

  // 플레이어 자산 기반 catch-up 보정
  if (playerAssets > 0) {
    const targetAssets = playerAssets * TARGET_MULTIPLIER[npc.personality];
    const deltaToTarget = (targetAssets - newAssets) * CATCH_UP_FACTOR * yearsPassed;
    newAssets = Math.max(10000, Math.round(newAssets + deltaToTarget));
  }
  const newJob = pickJob(newAge, npc.personality);
  const newDreams =
    npc.dreamsAchieved +
    (rng() < 0.05 * yearsPassed ? 1 : 0) +
    (rng() < 0.03 * yearsPassed ? 1 : 0);
  const newStatus = pickStatus(npc.personality, newAge, rng);
  return {
    ...npc,
    currentAge: newAge,
    currentAssets: newAssets,
    currentJob: newJob,
    dreamsAchieved: newDreams,
    status: newStatus,
  };
}

function pickJob(age: number, p: FriendNPC['personality']): string {
  if (age < 15) return '학생';
  if (age < 20) return p === 'scholarly' ? '예비고수' : '동네 알바';
  if (age < 30) return p === 'aggressive' ? '스타트업' : '회사원';
  if (age < 50)
    return p === 'aggressive'
      ? '사장님'
      : p === 'lucky'
        ? '유튜버'
        : p === 'scholarly'
          ? '과학자'
          : '회사원';
  if (age < 70) return '은퇴 준비';
  return '은퇴';
}

const STATUSES: Record<FriendNPC['personality'], string[]> = {
  conservative: [
    '예금 이자 확인 중',
    '가계부 작성',
    '장기 적금 들었다',
    '분산 투자 공부',
  ],
  aggressive: [
    '떡볶이 제국 풀매수',
    '로켓김밥 올인',
    '주식 차트 보는 중',
    '대박 노리는 중',
  ],
  lucky: [
    '복권 사러 감',
    '이벤트 당첨',
    '우연히 대박',
    '행운의 하루',
  ],
  scholarly: [
    '책 읽는 중',
    '경제학 공부',
    'ETF 연구',
    '복리 계산 중',
  ],
};

function pickStatus(
  p: FriendNPC['personality'],
  age: number,
  rng: () => number,
): string {
  if (age >= 75) return ['추억 회상', '손주 자랑', '산책 중'][Math.floor(rng() * 3)];
  const pool = STATUSES[p];
  return pool[Math.floor(rng() * pool.length)];
}
