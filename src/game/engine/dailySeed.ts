import { mulberry32 } from './prng';
import dreamsData from '../data/dreams.json';
import type { Dream } from '../types';

const DREAMS_ALL: Dream[] = dreamsData as Dream[];

const DAILY_NAMES = [
  '다솔', '하늘', '별', '은우', '지호',
  '서아', '도윤', '수아', '건우', '예린',
  '민준', '지아', '서준', '하은', '이준',
  '지윤', '재원', '채원', '현우', '나은',
];

export function getDailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function getDailyDreams(): string[] {
  const seed = getDailySeed();
  const rng = mulberry32(seed);
  const ids = DREAMS_ALL.map((d) => d.id);
  const first = Math.floor(rng() * ids.length);
  let second = Math.floor(rng() * (ids.length - 1));
  if (second >= first) second++;
  return [ids[first], ids[second]];
}

export function getDailyName(): string {
  const seed = getDailySeed();
  const rng = mulberry32(seed + 1);
  return DAILY_NAMES[Math.floor(rng() * DAILY_NAMES.length)];
}
