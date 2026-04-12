import type { Ending, Grade, KeyMoment } from '../types';
import { josa } from './josa';

export function generateLifeTitle(
  traits: string[],
  finalAssets: number,
  finalHappiness: number,
  dreamsAchieved: number,
  totalDreams: number,
  ending?: Ending,
): string {
  const hasTrait = (t: string) => traits.includes(t);
  const realEstateCount = ending?.realEstateCount ?? 0;
  const finalWisdom = ending?.finalWisdom ?? 0;
  const finalCharisma = ending?.finalCharisma ?? 0;
  const traitsCount = ending?.traitsCount ?? traits.length;
  const keyMomentsCount = ending?.keyMomentsSelected.length ?? 0;
  const isRetired = hasTrait('은퇴');

  // Priority-based title assignment (RPG style)
  if (hasTrait('우주떡볶이')) return '🚀 우주 떡볶이 황제';
  if (hasTrait('시간여행경험') && hasTrait('외계인친구')) return '🌌 차원 여행자';
  if (hasTrait('글로벌리더')) return '🌍 글로벌 리더';
  if (hasTrait('IT사업가') || hasTrait('앱개발자')) return '💻 IT 거물';
  if (hasTrait('떡볶이사장')) return '🌶️ 떡볶이 제국의 왕';
  if (hasTrait('자선가') || hasTrait('장학재단')) return '🤝 위대한 기부자';
  if (hasTrait('시민영웅') || hasTrait('동네영웅')) return '🦸 동네의 영웅';

  // 부동산 왕 - 부동산 3개 이상 보유
  if (realEstateCount >= 3) return '🏰 부동산 왕';

  if (finalAssets >= 1000000000) return '💎 10억 부자';
  if (finalAssets >= 100000000) return '🤑 억만장자';

  // 백수의 왕 - 은퇴 상태 + 자산 5억 이상
  if (isRetired && finalAssets >= 500000000) return '🦁 백수의 왕';

  if (dreamsAchieved === totalDreams && totalDreams >= 3) return '🌈 꿈의 완성자';

  // 극적인 삶 - 중요 순간 8개 + 행복도가 극단적이지 않은(변동 많은) 중간 범위
  if (keyMomentsCount >= 8 && finalHappiness >= 30 && finalHappiness <= 75) return '🎭 극적인 삶';

  // 파란만장 - 특성 10개 이상
  if (traitsCount >= 10) return '🌊 파란만장';

  if (hasTrait('인플루언서')) return '📱 인플루언서';

  // 영원한 학습자 - wisdom 95 이상
  if (finalWisdom >= 95) return '🎓 영원한 학습자';

  // 사교계의 별 - charisma 95 이상
  if (finalCharisma >= 95) return '💃 사교계의 별';

  // 명상의 현자 - 명상러 특성 + wisdom 80 이상
  if (hasTrait('명상러') && finalWisdom >= 80) return '🧘 명상의 현자';

  // 창작의 달인 - 작가/화가/음악가 중 2개 이상 보유
  {
    const creativeTraits = ['작가', '화가', '음악가'];
    const creativeCount = creativeTraits.filter((t) => hasTrait(t)).length;
    if (creativeCount >= 2) return '🎨 창작의 달인';
  }

  if (hasTrait('음악가')) return '🎵 음악의 달인';
  if (hasTrait('발명가')) return '🔧 발명왕';
  if (hasTrait('교육자')) return '🍎 존경받는 스승';
  if (hasTrait('은퇴농부')) return '🌾 행복한 농부';
  if (finalHappiness >= 95) return '😊 행복 만렙';
  if (traitsCount >= 8) return '🏅 다재다능한 인재';
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
  crisisTurns?: number,
): string {
  const parts: string[] = [];

  // Opening based on grade
  const openers: Record<Grade, string[]> = {
    S: [`${name}${josa(name, '은/는')} 전설이 되었다.`, `${name}, 완벽한 인생의 주인공.`],
    A: [`${name}${josa(name, '은/는')} 멋진 인생을 살았다.`, `${name}의 삶은 빛났다.`],
    B: [`${name}${josa(name, '은/는')} 평범하지만 행복했다.`, `${name}의 소소한 인생.`],
    C: [`${name}${josa(name, '은/는')} 조용히 살다 갔다.`, `${name}의 고요한 여정.`],
    D: [`${name}${josa(name, '은/는')} 힘겨운 인생을 버텼다.`, `${name}의 고단했던 날들.`],
    F: [`${name}${josa(name, '은/는')} 아무것도 이루지 못했다.`, `${name}의 텅 빈 여정.`],
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

  // Crisis turns-based flavor
  if (crisisTurns && crisisTurns > 0) {
    parts.push(`어려운 시기를 ${crisisTurns}번이나 버텼다.`);
  }

  return parts.join(' ');
}
