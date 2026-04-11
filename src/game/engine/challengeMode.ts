export type ChallengeMode = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  modifier: {
    startCash?: number;
    speedLock?: 0.5 | 1 | 2;
    noStocks?: boolean;
    noBank?: boolean;
    statDecayMultiplier?: number;
  };
};

export const CHALLENGE_MODES: ChallengeMode[] = [
  {
    id: 'poverty',
    name: '빈곤 챌린지',
    emoji: '🪙',
    description: '시작 현금 1만원, 맨손에서 부자로!',
    modifier: {
      startCash: 10000,
    },
  },
  {
    id: 'speedrun',
    name: '속도전',
    emoji: '⚡',
    description: '2배속 고정, 빠르게 달려라!',
    modifier: {
      speedLock: 2,
    },
  },
  {
    id: 'no-invest',
    name: '노투자',
    emoji: '🚫',
    description: '주식 거래 금지, 실물만으로 승부!',
    modifier: {
      noStocks: true,
    },
  },
  {
    id: 'hardcore',
    name: '하드코어',
    emoji: '💀',
    description: '스탯 감소 2배, 혹독한 인생!',
    modifier: {
      statDecayMultiplier: 2,
    },
  },
];
