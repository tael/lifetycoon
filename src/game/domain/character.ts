import type { Character } from '../types';

export function createCharacter(name: string): Character {
  return {
    name,
    age: 10,
    happiness: 70,
    health: 90,
    wisdom: 30,
    charisma: 40,
    traits: [],
    emoji: '😊',
  };
}

export function clampStats(c: Character): Character {
  return {
    ...c,
    happiness: clamp(c.happiness, 0, 100),
    health: clamp(c.health, 0, 100),
    wisdom: clamp(c.wisdom, 0, 100),
    charisma: clamp(c.charisma, 0, 100),
  };
}

export function emojiFor(c: Character): string {
  // 나이와 기분의 결합
  const age = Math.floor(c.age);
  const h = c.happiness;
  if (age < 14) return h > 60 ? '🧒' : h > 30 ? '😐' : '😢';
  if (age < 20) return h > 60 ? '😁' : h > 30 ? '😕' : '😭';
  if (age < 35) return h > 60 ? '😎' : h > 30 ? '😶' : '😩';
  if (age < 55) return h > 60 ? '🤩' : h > 30 ? '😐' : '😞';
  if (age < 75) return h > 60 ? '😊' : h > 30 ? '🤔' : '😪';
  return h > 60 ? '🥰' : h > 30 ? '😌' : '😴';
}

export function applyAge(c: Character, newAge: number): Character {
  return { ...c, age: newAge };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
