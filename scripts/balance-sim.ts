// balance-sim.ts — dev-only headless balance simulation CLI
// Usage: pnpm tsx scripts/balance-sim.ts --runs 1000 --workers 4 --seed 42
//
// Architecture: main process spawns W child tsx processes as workers.
// Each worker receives a batch of runIds via stdin JSON and emits RunResult[]
// to stdout as newline-delimited JSON. Workers are full tsx processes so all
// TypeScript source imports work correctly.
//
// NOTE: worker_threads was attempted but tsx's ESM resolve hook does not
// propagate to workers in Node 24 when extensionless relative imports are used
// inside the game source (src/store/gameStore.ts → domain/* without .ts ext).
// child_process with tsx binary is the reliable alternative.

import { isMainThread } from 'node:worker_threads';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

// ─── RunResult type (inline to avoid cross-import issues) ─────────────────
type RunResult = {
  runIndex: number;
  seed: number;
  finalAge: number;
  finalCash: number;
  finalBankBalance: number;
  finalStocksValue: number;
  finalRealEstateValue: number;
  finalBondsValue: number;
  finalTotalAssets: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'unknown';
  dreamsAchieved: number;
  dreamsTotal: number;
  dreamIdsAchieved: string[];
  dreamIdsAll: string[];
  uniqueScenariosFired: number;
  scenarioFireCounts: Record<string, number>;
  finalStats: { happiness: number; health: number; wisdom: number; charisma: number };
  finalEconomyPhase: string;
  traits: string[];
  keyMomentCount: number;
  hadLoan: boolean;
  loanFullyRepaid: boolean;
  insuranceEnrolled: { health: boolean; life: boolean };
  holdings: { ticker: string; shares: number; holdYears: number }[];
  realEstateHoldings: { purchasedAtAge: number; currentValue: number; purchasePrice: number }[];
  bondHoldings: { purchasedAtAge: number; faceValue: number; matured: boolean }[];
  assetHistory: { age: number; value: number }[];
  errored?: string;
};

// ─── WORKER MODE ──────────────────────────────────────────────────────────
// When this script is called with --worker-mode, it reads run IDs from stdin
// and writes RunResult JSON lines to stdout.
const isWorkerMode = process.argv.includes('--worker-mode');

if (isWorkerMode) {
  runWorkerMode().catch((err) => {
    process.stderr.write('[worker] fatal: ' + String(err) + '\n');
    process.exit(1);
  });
} else {
  // ─── MAIN MODE ────────────────────────────────────────────────────────
  runMainMode().catch((err) => {
    console.error('[sim] 치명적 오류:', err);
    process.exit(1);
  });
}

// ─── WORKER IMPLEMENTATION ────────────────────────────────────────────────

async function runWorkerMode() {
  // Read JSON from stdin: { runIds: number[], baseSeed: number }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
    runIds: number[];
    baseSeed: number;
  };

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const headlessPath = path.join(scriptDir, '..', 'src', 'game', 'sim', 'headlessRun.ts');
  const { runSingleGame } = await import(headlessPath) as {
    runSingleGame: (seed: number, runIndex: number) => Promise<RunResult>;
  };

  for (const runId of input.runIds) {
    const seed = input.baseSeed + runId;
    const result = await runSingleGame(seed, runId);
    // Write one JSON line per result
    process.stdout.write(JSON.stringify(result) + '\n');
  }
}

// ─── MAIN IMPLEMENTATION ──────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string, def: string): string => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
  };
  return {
    runs: parseInt(get('--runs', '1000'), 10),
    workers: parseInt(get('--workers', String(os.cpus().length)), 10),
    seed: parseInt(get('--seed', String(Date.now())), 10),
  };
}

async function runMainMode() {
  const startTime = Date.now();
  const { runs, workers, seed: baseSeed } = parseArgs();

  process.stderr.write(
    `[sim] 시작: ${runs}회 실행, ${workers}개 워커, 시드 ${baseSeed}\n`,
  );

  // Split run IDs across workers
  const runIds = Array.from({ length: runs }, (_, i) => i);
  const chunks: number[][] = Array.from({ length: workers }, () => []);
  for (let i = 0; i < runIds.length; i++) {
    chunks[i % workers].push(runIds[i]);
  }

  const results: RunResult[] = new Array(runs);
  let completedCount = 0;
  const reportInterval = Math.max(1, Math.floor(runs * 0.1));

  // Find tsx binary
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const tsxBin = path.join(scriptDir, '..', 'node_modules', '.bin', 'tsx');
  const selfScript = fileURLToPath(import.meta.url);

  // Spawn worker processes
  const workerPromises = chunks
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => spawnWorker(tsxBin, selfScript, chunk, baseSeed, results, () => {
      completedCount++;
      if (completedCount % reportInterval === 0 || completedCount === runs) {
        const pct = ((completedCount / runs) * 100).toFixed(0);
        process.stderr.write(`[sim] ${completedCount}/${runs} 완료 (${pct}%)\n`);
      }
    }));

  await Promise.all(workerPromises);

  const elapsedMs = Date.now() - startTime;
  process.stderr.write(`[sim] 전체 완료: ${elapsedMs}ms\n`);

  const validResults = results.filter(Boolean);

  // Import aggregation modules
  const { aggregate } = await import('../src/game/sim/aggregate.ts') as {
    aggregate: (results: RunResult[]) => Record<string, unknown>;
  };
  const { deriveInsights } = await import('../src/game/sim/insights.ts') as {
    deriveInsights: (metrics: Record<string, unknown>) => string[];
  };
  const { renderReport } = await import('../src/game/sim/report.ts') as {
    renderReport: (
      metrics: Record<string, unknown>,
      insights: string[],
      meta: { totalRuns: number; baseSeed: number; elapsedMs: number; timestamp: string },
    ) => { terminal: string; markdown: string; rawJson: string };
  };

  const metrics = aggregate(validResults);
  const insights = deriveInsights(metrics);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const meta = {
    totalRuns: runs,
    baseSeed,
    elapsedMs,
    timestamp: new Date().toISOString(),
  };
  const { terminal } = renderReport(metrics, insights, meta);

  // Print terminal summary only — no file reports (prevents hallucination from stale data)
  process.stdout.write(terminal + '\n');
}

function spawnWorker(
  tsxBin: string,
  selfScript: string,
  runIds: number[],
  baseSeed: number,
  results: RunResult[],
  onResult: () => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(tsxBin, [selfScript, '--worker-mode'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Send input via stdin
    const input = JSON.stringify({ runIds, baseSeed });
    child.stdin.write(input, 'utf8');
    child.stdin.end();

    // Read results line by line from stdout
    const rl = createInterface({ input: child.stdout });
    rl.on('line', (line) => {
      if (!line.trim()) return;
      try {
        const result = JSON.parse(line) as RunResult;
        results[result.runIndex] = result;
        onResult();
      } catch {
        process.stderr.write(`[worker] invalid JSON line: ${line.slice(0, 100)}\n`);
      }
    });

    // Forward worker stderr to parent stderr
    child.stderr.on('data', (data: Buffer) => {
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', reject);
  });
}

// Suppress unused import warning — isMainThread is used for type guard purposes
void isMainThread;
