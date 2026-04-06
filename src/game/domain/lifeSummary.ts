import type { Grade, KeyMoment } from '../types';

export function generateLifeTitle(
  traits: string[],
  finalAssets: number,
  finalHappiness: number,
  dreamsAchieved: number,
  totalDreams: number,
): string {
  // Priority-based title assignment (RPG style)
  if (traits.includes('우주떡볶이')) return '🚀 우주 떡볶이 황제';
  if (traits.includes('시간여행경험') && traits.includes('외계인친구')) return '🌌 차원 여행자';
  if (traits.includes('글로벌리더')) return '🌍 글로벌 리더';
  if (traits.includes('IT사업가') || traits.includes('앱개발자')) return '💻 IT 거물';
  if (traits.includes('떡볶이사장')) return '🌶️ 떡볶이 제국의 왕';
  if (traits.includes('자선가') || traits.includes('장학재단')) return '🤝 위대한 기부자';
  if (traits.includes('시민영웅') || traits.includes('동네영웅')) return '🦸 동네의 영웅';
  if (finalAssets >= 1000000000) return '💎 10억 부자';
  if (finalAssets >= 100000000) return '🤑 억만장자';
  if (dreamsAchieved === totalDreams && totalDreams >= 3) return '🌈 꿈의 완성자';
  if (traits.includes('인플루언서')) return '📱 인플루언서';
  if (traits.includes('음악가')) return '🎵 음악의 달인';
  if (traits.includes('발명가')) return '🔧 발명왕';
  if (traits.includes('교육자')) return '🍎 존경받는 스승';
  if (traits.includes('은퇴농부')) return '🌾 행복한 농부';
  if (finalHappiness >= 95) return '😊 행복 만렙';
  if (traits.length >= 8) return '🏅 다재다능한 인재';
  if (finalAssets >= 50000000) return '💰 알뜰한 부자';
  if (finalHappiness >= 80) return '☀️ 밝은 인생';
  return '🌱 평범한 시민';
}

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
