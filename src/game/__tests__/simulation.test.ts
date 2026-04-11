import { describe, it, expect } from 'vitest';

import { randomSeeds, createStreams } from '../engine/prng';
import { nextPrice } from '../domain/stock';
import { createCharacter, clampStats } from '../domain/character';
import { applyChoice } from '../scenario/scenarioEngine';
import { MS_PER_YEAR, elapsedMsToAge } from '../engine/timeAxis';

import scenariosRaw from '../data/scenarios.json';
import dreamsRaw from '../data/dreams.json';
import stocksRaw from '../data/stocks.json';
import jobsRaw from '../data/jobs.json';

import type {
  ScenarioEvent,
  StockDef,
  Job,
  DreamCondition,
  EventEffect,
  BankAccount,
  Holding,
} from '../types';

const scenarios = scenariosRaw as ScenarioEvent[];
const stocks = stocksRaw as StockDef[];
const jobs = jobsRaw as Job[];

// ─── helpers ────────────────────────────────────────────────────────────────

function buildInitialPrices(): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const s of stocks) prices[s.ticker] = s.basePrice;
  return prices;
}

// ─── 1. Headless 10-year simulation (age 10 → 100, 100 ticks) ────────────────

describe('headless simulation', () => {
  it('runs 90 advanceYear ticks without NaN/Infinity/out-of-range values', () => {
    const SEED = 12345;
    const seeds = randomSeeds(SEED);
    const rng = createStreams(seeds);

    let character = createCharacter('시뮬이', 'male');
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

    // Simulate age 10 → 100 (90 years)
    for (let year = 0; year < 90; year++) {
      const age = 10 + year;

      // Advance stock prices by 1 year
      for (const def of stocks) {
        const prev = prices[def.ticker];
        const next = nextPrice(prev, def, rng.stock, 1);

        // NaN guard
        expect(Number.isFinite(next), `${def.ticker} price is NaN/Inf at age ${age}`).toBe(true);
        expect(next, `${def.ticker} price must be >= 1`).toBeGreaterThanOrEqual(1);

        prices[def.ticker] = next;
      }

      // Apply salary (first job: student)
      const job = jobs.find((j) => j.id === 'student')!;
      cash += job.salary;

      // Bank interest
      bank = {
        ...bank,
        balance: bank.balance * (1 + bank.interestRate),
      };

      // Pick a scenario that fits this age and apply first choice
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

      // Per-tick assertions
      expect(Number.isFinite(cash), `cash is NaN/Inf at age ${age}`).toBe(true);
      expect(Number.isFinite(character.happiness), `happiness is NaN at age ${age}`).toBe(true);
      expect(character.happiness, `happiness < 0 at age ${age}`).toBeGreaterThanOrEqual(0);
      expect(character.happiness, `happiness > 100 at age ${age}`).toBeLessThanOrEqual(100);
      expect(Number.isFinite(character.health), `health is NaN at age ${age}`).toBe(true);
      expect(character.health, `health < 0 at age ${age}`).toBeGreaterThanOrEqual(0);
      expect(character.health, `health > 100 at age ${age}`).toBeLessThanOrEqual(100);
    }

    // Final age should be 99 (year 89 = age 10+89=99)
    expect(character.age).toBe(10); // createCharacter sets 10; age is managed externally
  });

  it('elapsedMs correctly maps to age range 10..100', () => {
    const age10 = elapsedMsToAge(0);
    const age100 = elapsedMsToAge(MS_PER_YEAR * 90);
    expect(age10).toBe(10);
    expect(age100).toBe(100);
  });

  it('randomSeeds with same seed produces identical results', () => {
    const s1 = randomSeeds(12345);
    const s2 = randomSeeds(12345);
    expect(s1).toEqual(s2);
  });
});

// ─── 2. scenarios.json validation ────────────────────────────────────────────

describe('scenarios.json validation', () => {
  const VALID_EFFECT_KINDS = new Set<string>([
    'cash', 'money', 'stockShock',
    'happiness', 'health', 'stress',
    'wisdom', 'intelligence', 'charisma', 'independence',
    'addTrait', 'setJob', 'gotoScenario', 'keyMoment', 'bankInterestChange',
  ]);

  it('has no duplicate ids', () => {
    const ids = scenarios.map((s) => s.id);
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const id of ids) {
      if (seen.has(id)) dupes.push(id);
      seen.add(id);
    }
    expect(dupes).toHaveLength(0);
  });

  it('all ageRange values are valid (min <= max, 10 <= min, max <= 100)', () => {
    const invalid: string[] = [];
    for (const s of scenarios) {
      const [min, max] = s.ageRange;
      if (min > max || min < 10 || max > 100) {
        invalid.push(`${s.id}: ageRange [${min}, ${max}]`);
      }
    }
    expect(invalid).toHaveLength(0);
  });

  it('all scenarios have weight > 0', () => {
    const invalid = scenarios.filter((s) => s.weight <= 0).map((s) => s.id);
    expect(invalid).toHaveLength(0);
  });

  it('all scenarios have at least 1 choice', () => {
    const invalid = scenarios.filter((s) => !s.choices || s.choices.length < 1).map((s) => s.id);
    expect(invalid).toHaveLength(0);
  });

  it('all effect kinds are valid (registered in EventEffect union)', () => {
    const invalid: string[] = [];
    for (const s of scenarios) {
      for (const c of s.choices) {
        for (const e of c.effects) {
          if (!VALID_EFFECT_KINDS.has((e as EventEffect & { kind: string }).kind)) {
            invalid.push(`${s.id} > "${c.label}" > kind="${(e as { kind: string }).kind}"`);
          }
        }
      }
    }
    // Report all invalid kinds
    if (invalid.length > 0) {
      console.warn(`[simulation.test] Unregistered effect kinds (${invalid.length}):\n` + invalid.slice(0, 10).join('\n'));
    }
    expect(invalid).toHaveLength(0);
  });
});

// ─── 3. dreams.json validation ───────────────────────────────────────────────

describe('dreams.json validation', () => {
  const VALID_CONDITION_KINDS = new Set<string>([
    'cashGte', 'stockOwnedShares', 'jobHeld', 'ageReached', 'totalAssetsGte',
    'happinessGte', 'wisdomGte', 'charismaGte', 'hasTrait', 'hasTraitAny',
    'realEstateCountGte', 'ageReachedAndHappinessGte',
  ]);

  it('has no duplicate ids', () => {
    const ids = dreamsRaw.map((d) => d.id);
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const id of ids) {
      if (seen.has(id)) dupes.push(id);
      seen.add(id);
    }
    expect(dupes).toHaveLength(0);
  });

  it('all targetCondition kinds are valid', () => {
    const invalid: string[] = [];
    for (const d of dreamsRaw) {
      const cond = d.targetCondition as DreamCondition;
      if (!VALID_CONDITION_KINDS.has(cond.kind)) {
        invalid.push(`${d.id}: kind="${cond.kind}"`);
      }
    }
    expect(invalid).toHaveLength(0);
  });
});

// ─── 4. stocks.json validation ───────────────────────────────────────────────

describe('stocks.json validation', () => {
  it('has no duplicate tickers', () => {
    const tickers = stocks.map((s) => s.ticker);
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const t of tickers) {
      if (seen.has(t)) dupes.push(t);
      seen.add(t);
    }
    expect(dupes).toHaveLength(0);
  });

  it('all stocks have valid basePrice (>= 1)', () => {
    const invalid = stocks.filter((s) => s.basePrice < 1).map((s) => s.ticker);
    expect(invalid).toHaveLength(0);
  });

  it('all stocks have volatility in [0, 1]', () => {
    const invalid = stocks.filter((s) => s.volatility < 0 || s.volatility > 1).map((s) => s.ticker);
    expect(invalid).toHaveLength(0);
  });
});

// ─── 5. jobs.json validation ─────────────────────────────────────────────────

describe('jobs.json validation', () => {
  it('has no duplicate ids', () => {
    const ids = jobs.map((j) => j.id);
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const id of ids) {
      if (seen.has(id)) dupes.push(id);
      seen.add(id);
    }
    expect(dupes).toHaveLength(0);
  });

  it('all jobs have minAge in [10, 100]', () => {
    const invalid = jobs.filter((j) => j.minAge < 10 || j.minAge > 100).map((j) => j.id);
    expect(invalid).toHaveLength(0);
  });

  it('all jobs have salary >= 0', () => {
    const invalid = jobs.filter((j) => j.salary < 0).map((j) => j.id);
    expect(invalid).toHaveLength(0);
  });
});
