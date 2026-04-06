import type { Grade, KeyMoment } from '../types';

export function generateLifeSummary(
  name: string,
  grade: Grade,
  finalAssets: number,
  finalHappiness: number,
  dreamsAchieved: number,
  totalDreams: number,
  traits: string[],
  _keyMoments: KeyMoment[],
): string {
  const parts: string[] = [];

  // Opening based on grade
  const openers: Record<Grade, string[]> = {
    S: [`${name}은(는) 전설이 되었다.`, `${name}, 완벽한 인생의 주인공.`],
    A: [`${name}은(는) 멋진 인생을 살았다.`, `${name}의 삶은 빛났다.`],
    B: [`${name}은(는) 평범하지만 행복했다.`, `${name}의 소소한 인생.`],
    C: [`${name}은(는) 조용히 살다 갔다.`, `${name}의 고요한 여정.`],
  };
  parts.push(openers[grade][Math.floor(Math.random() * openers[grade].length)]);

  // Trait-based flavor
  if (traits.includes('기부왕') || traits.includes('봉사왕')) {
    parts.push('나눔을 실천한');
  } else if (traits.includes('발명가')) {
    parts.push('창의적인');
  } else if (traits.includes('인플루언서')) {
    parts.push('화제의 중심에 선');
  } else if (traits.includes('용감함')) {
    parts.push('용기 있는');
  } else if (finalAssets > 100000000) {
    parts.push('부를 일군');
  } else if (finalHappiness >= 90) {
    parts.push('행복을 찾은');
  } else {
    parts.push('자기만의 길을 걸은');
  }

  // Dream-based
  if (dreamsAchieved === totalDreams && totalDreams > 0) {
    parts.push('모든 꿈을 이룬 사람.');
  } else if (dreamsAchieved > 0) {
    parts.push(`${dreamsAchieved}개의 꿈을 이룬 사람.`);
  } else {
    parts.push('꿈은 이루지 못했지만 경험을 쌓은 사람.');
  }

  return parts.join(' ');
}
