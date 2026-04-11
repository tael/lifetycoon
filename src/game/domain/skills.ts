export type Skill = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  wisdomCost: number;
  effect: 'bankInterest' | 'salaryBonus' | 'stockDiscount' | 'eventLuck';
  value: number;
};

export const SKILLS: Skill[] = [
  { id: 'finance_101', name: '금융 기초', emoji: '📗', description: '은행 이자율 +1%', wisdomCost: 30, effect: 'bankInterest', value: 0.01 },
  { id: 'negotiation', name: '협상력', emoji: '🗣️', description: '월급 +10%', wisdomCost: 50, effect: 'salaryBonus', value: 0.1 },
  { id: 'value_invest', name: '가치 투자', emoji: '💎', description: '주식 매수 비용 -5%', wisdomCost: 70, effect: 'stockDiscount', value: 0.05 },
  { id: 'intuition', name: '직관', emoji: '✨', description: '행운 이벤트 확률 +20%', wisdomCost: 90, effect: 'eventLuck', value: 0.2 },
];
