// Deterministic PRNG with sub-streams
// mulberry32: small, fast, adequate quality for game sim

import type { Seeds } from '../types';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type RngStreams = {
  stock: () => number;
  event: () => number;
  npc: () => number;
  misc: () => number;
};

export function createStreams(seeds: Seeds): RngStreams {
  return {
    stock: mulberry32(seeds.stock),
    event: mulberry32(seeds.event),
    npc: mulberry32(seeds.npc),
    misc: mulberry32(seeds.master),
  };
}

export function randomSeeds(masterSeed?: number): Seeds {
  const master = masterSeed ?? Math.floor(Math.random() * 2 ** 31);
  const rng = mulberry32(master);
  return {
    master,
    stock: Math.floor(rng() * 2 ** 31),
    event: Math.floor(rng() * 2 ** 31),
    npc: Math.floor(rng() * 2 ** 31),
  };
}

export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randFloat(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function weightedPick<T>(
  rng: () => number,
  arr: readonly T[],
  weightFn: (item: T) => number,
): T | null {
  if (arr.length === 0) return null;
  let total = 0;
  for (const item of arr) total += Math.max(0, weightFn(item));
  if (total <= 0) return arr[Math.floor(rng() * arr.length)];
  let r = rng() * total;
  for (const item of arr) {
    r -= Math.max(0, weightFn(item));
    if (r <= 0) return item;
  }
  return arr[arr.length - 1];
}

// Gaussian-ish from two uniforms (Box–Muller simplified)
export function gaussian(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
