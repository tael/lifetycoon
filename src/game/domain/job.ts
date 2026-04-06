import type { Job } from '../types';

export function monthsToYearIncome(monthlySalary: number): number {
  return monthlySalary * 12;
}

export function isJobSuitable(
  job: Job,
  age: number,
  assets: number,
): { suitable: boolean; reason?: string } {
  if (age < job.minAge) {
    return { suitable: false, reason: `${job.minAge}세 이상이 좋아요` };
  }
  if (assets < job.recommendedAssets) {
    return {
      suitable: true,
      reason: `자산이 조금 부족하지만 도전은 가능해요`,
    };
  }
  return { suitable: true };
}
