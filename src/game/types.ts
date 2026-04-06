// Core domain types for LifeTycoon Kids
// All types are framework-independent. No React/Zustand imports here.

export type Seeds = {
  master: number;
  stock: number;
  event: number;
  npc: number;
};

export type Character = {
  name: string;
  age: number; // 10..100 (float, derived from elapsedMs)
  happiness: number; // 0..100
  health: number; // 0..100
  wisdom: number; // 0..100
  charisma: number; // 0..100
  traits: string[]; // 성격 태그 (획득)
  emoji: string; // 현재 기분 이모지
};

export type StockDef = {
  ticker: string;
  name: string;
  sector: string;
  basePrice: number;
  drift: number; // 연평균 변동률 (음수도 가능)
  volatility: number; // 0..1
  iconEmoji: string;
  flavorText: string;
};

export type Holding = {
  ticker: string;
  shares: number;
  avgBuyPrice: number;
};

export type BankAccount = {
  balance: number;
  interestRate: number; // 연 이자율 (0.02 = 2%)
};

export type Job = {
  id: string;
  title: string;
  salary: number; // 월 소득 (게임화폐)
  minAge: number;
  recommendedAssets: number;
  iconEmoji: string;
  flavorText: string;
};

export type DreamCondition =
  | { kind: 'cashGte'; value: number }
  | { kind: 'stockOwnedShares'; ticker: string; shares: number }
  | { kind: 'jobHeld'; jobId: string }
  | { kind: 'ageReached'; value: number }
  | { kind: 'totalAssetsGte'; value: number }
  | { kind: 'happinessGte'; value: number };

export type Dream = {
  id: string;
  title: string;
  description: string;
  targetCondition: DreamCondition;
  achieved: boolean;
  achievedAtAge?: number;
  rewardKeyMoment: string; // template for keyMoment text
  iconEmoji: string;
};

export type EventEffect =
  | { kind: 'cash'; delta: number }
  | { kind: 'stockShock'; ticker: string; multiplier: number }
  | { kind: 'happiness'; delta: number }
  | { kind: 'health'; delta: number }
  | { kind: 'wisdom'; delta: number }
  | { kind: 'charisma'; delta: number }
  | { kind: 'addTrait'; trait: string }
  | { kind: 'setJob'; jobId: string }
  | { kind: 'gotoScenario'; scenarioId: string }
  | { kind: 'keyMoment'; text: string; importance: number }
  | { kind: 'bankInterestChange'; delta: number };

export type EventChoice = {
  label: string;
  effects: EventEffect[];
  importance: number; // 0..1 → keyMoment 중요도 가중치
  flavorText?: string;
};

export type TriggerKind =
  | { kind: 'ageRange'; min: number; max: number }
  | { kind: 'specificAge'; age: number }
  | { kind: 'cashGte'; value: number }
  | { kind: 'cashLte'; value: number }
  | { kind: 'hasJob'; jobId: string }
  | { kind: 'hasTrait'; trait: string };

export type ScenarioEvent = {
  id: string;
  triggers: TriggerKind[];
  ageRange: [number, number];
  weight: number; // 가중 추첨 확률
  pausesGame: boolean;
  title: string;
  text: string;
  choices: EventChoice[];
  tags: string[];
  oneShot: boolean; // true면 한 번만 발생
};

export type FriendNPC = {
  id: string;
  name: string;
  personality: 'conservative' | 'aggressive' | 'lucky' | 'scholarly';
  iconEmoji: string;
  currentAge: number;
  currentAssets: number;
  currentJob: string | null;
  dreamsAchieved: number;
  status: string; // "떡볶이 사업 중" 같은 플레이버
};

export type KeyMoment = {
  age: number;
  importance: number; // 0..1
  text: string;
  tag: string; // "유년기" | "청년기" | "장년기" | "노년기" 또는 커스텀
};

export type LifeEvent = {
  age: number;
  text: string;
  timestamp: number;
};

export type EconomicEvent = {
  scenarioId: string;
  triggeredAtAge: number;
  title: string;
  text: string;
  choices: EventChoice[];
};

export type Phase =
  | { kind: 'title' }
  | { kind: 'onboarding'; step: number }
  | { kind: 'dream-pick' }
  | { kind: 'playing' }
  | { kind: 'paused'; event: EconomicEvent }
  | { kind: 'ending' };

export type Grade = 'S' | 'A' | 'B' | 'C';

export type Ending = {
  grade: Grade;
  dreamsAchieved: number;
  totalDreams: number;
  finalAssets: number;
  finalHappiness: number;
  epitaph: string[]; // 여러 줄 비문
  keyMomentsSelected: KeyMoment[];
};

export type LifeStageTag = '유년기' | '청년기' | '중년기' | '장년기' | '노년기';

export function stageForAge(age: number): LifeStageTag {
  if (age < 20) return '유년기';
  if (age < 35) return '청년기';
  if (age < 55) return '중년기';
  if (age < 75) return '장년기';
  return '노년기';
}
