import type { GameStoreState } from './gameStore';

const STORAGE_KEY = 'lifetycoon-kids:save';
const CURRENT_VERSION = 1 as const;

export type PersistedSave = {
  v: typeof CURRENT_VERSION;
  savedAt: string;
  state: Pick<
    GameStoreState,
    | 'phase'
    | 'character'
    | 'cash'
    | 'bank'
    | 'holdings'
    | 'prices'
    | 'job'
    | 'dreams'
    | 'traits'
    | 'npcs'
    | 'keyMoments'
    | 'recentLog'
    | 'assetHistory'
    | 'seeds'
    | 'usedScenarioIds'
    | 'autoInvest'
    | 'speedMultiplier'
    | 'ending'
  >;
};

export function saveGame(state: GameStoreState): void {
  try {
    const save: PersistedSave = {
      v: CURRENT_VERSION,
      savedAt: new Date().toISOString(),
      state: {
        phase: state.phase,
        character: state.character,
        cash: state.cash,
        bank: state.bank,
        holdings: state.holdings,
        prices: state.prices,
        job: state.job,
        dreams: state.dreams,
        traits: state.traits,
        npcs: state.npcs,
        keyMoments: state.keyMoments,
        recentLog: state.recentLog,
        assetHistory: state.assetHistory,
        seeds: state.seeds,
        usedScenarioIds: state.usedScenarioIds,
        autoInvest: state.autoInvest,
        speedMultiplier: state.speedMultiplier,
        ending: state.ending,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Ignore storage errors (quota, disabled, etc.)
  }
}

export function loadGame(): PersistedSave | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSave;
    if (parsed.v !== CURRENT_VERSION) {
      console.warn('Save file has older version, skipping:', parsed.v);
      return null;
    }
    // v0.3.0 마이그레이션: 구버전 세이브에는 character.householdClass가 없으니 'average'로 폴백
    if (parsed.state?.character && parsed.state.character.householdClass == null) {
      parsed.state.character = { ...parsed.state.character, householdClass: 'average' };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
