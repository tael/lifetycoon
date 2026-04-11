import { describe, it, expect } from 'vitest';

import { randomSeeds, createStreams } from '../engine/prng';
import { nextPrice } from '../domain/stock';
import { createCharacter, clampStats } from '../domain/character';
import { applyChoice } from '../scenario/scenarioEngine';
import { holdingsValue } from '../domain/stock';

import scenariosRaw from '../data/scenarios.json';
import stocksRaw from '../data/stocks.json';
import jobsRaw from '../data/jobs.json';

import type { ScenarioEvent, StockDef, Job, BankAccount, Holding } from '../types';

const scenarios = scenariosRaw as ScenarioEvent[];
const stocks = stocksRaw as StockDef[];
const jobs = jobsRaw as Job[];

function buildInitialPrices(): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const s of stocks) prices[s.ticker] = s.basePrice;
  return prices;
}

// 10가지 seed로 10→100세 헤드리스 시뮬레이션
const TEST_SEEDS = [0, 1, 42, 99, 12345, 777777, 999999, 2024, 314159, 2147483647];

describe('edgeCases: 10 seeds × 90-year headless simulation', () => {
  for (const masterSeed of TEST_SEEDS) {
    it(`seed=${masterSeed}: 90년 시뮬 – 상태 불변식`, () => {
      const seeds = randomSeeds(masterSeed);
      const rng = createStreams(seeds);

      let character = createCharacter('테스터', 'male');
      let cash = 500_000;
      let bank: BankAccount = {
        balance: 0,
        interestRate: 0.02,
        loanBalance: 0,
        loanInterestRate: 0.05,
      };
      let holdings: Holding[] = [];
      let prices = buildInitialPrices();
      const keyMoments: never[] = [];

      const job = jobs.find((j) => j.id === 'student')!;

      for (let year = 0; year < 90; year++) {
        const age = 10 + year;

        // 주가 갱신
        for (const def of stocks) {
          const prev = prices[def.ticker];
          const next = nextPrice(prev, def, rng.stock, 1);
          // 주가: 양수 + 유한
          expect(Number.isFinite(next), `[seed=${masterSeed}] ${def.ticker} price non-finite at age ${age}`).toBe(true);
          expect(next, `[seed=${masterSeed}] ${def.ticker} price <= 0 at age ${age}`).toBeGreaterThan(0);
          prices[def.ticker] = next;
        }

        // 급여 + 이자
        cash += job.salary;
        bank = { ...bank, balance: Math.round(bank.balance * (1 + bank.interestRate)) };

        // 시나리오 적용
        const eligible = scenarios.filter(
          (s) => s.ageRange[0] <= age && age <= s.ageRange[1],
        );
        if (eligible.length > 0) {
          const idx = Math.floor(rng.event() * eligible.length);
          const scenario = eligible[idx];
          const choice = scenario.choices[0];

          const ctx = applyChoice(
            {
              character,
              cash,
              bank,
              holdings,
              prices,
              job,
              jobs,
              traits: character.traits,
              keyMoments,
            },
            choice,
            age,
          );

          character = clampStats(ctx.character);
          cash = ctx.cash;
          bank = ctx.bank;
          holdings = ctx.holdings;
          prices = ctx.prices;
        }

        // ── 불변식 검증 ──

        // cash: 음의 무한대로 가지 않음 (시나리오 엔진이 -5000만 플로어 적용)
        expect(Number.isFinite(cash), `[seed=${masterSeed}] cash non-finite at age ${age}`).toBe(true);
        expect(cash, `[seed=${masterSeed}] cash below -50M at age ${age}`).toBeGreaterThanOrEqual(-50_000_000);

        // happiness/health: 0~100
        expect(character.happiness, `[seed=${masterSeed}] happiness < 0 at age ${age}`).toBeGreaterThanOrEqual(0);
        expect(character.happiness, `[seed=${masterSeed}] happiness > 100 at age ${age}`).toBeLessThanOrEqual(100);
        expect(character.health, `[seed=${masterSeed}] health < 0 at age ${age}`).toBeGreaterThanOrEqual(0);
        expect(character.health, `[seed=${masterSeed}] health > 100 at age ${age}`).toBeLessThanOrEqual(100);

        // bank.balance >= 0
        expect(bank.balance, `[seed=${masterSeed}] bank.balance < 0 at age ${age}`).toBeGreaterThanOrEqual(0);

        // bank.loanBalance >= 0
        expect(bank.loanBalance, `[seed=${masterSeed}] bank.loanBalance < 0 at age ${age}`).toBeGreaterThanOrEqual(0);

        // 총자산 finite
        const stocksVal = holdingsValue(holdings, prices);
        const totalAssets = cash + bank.balance + stocksVal - bank.loanBalance;
        expect(Number.isFinite(totalAssets), `[seed=${masterSeed}] totalAssets non-finite at age ${age}`).toBe(true);
      }
    });
  }
});
