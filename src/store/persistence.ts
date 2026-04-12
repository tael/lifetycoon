import type { GameStoreState } from './gameStore';

const STORAGE_KEY = 'lifetycoon-kids:save';
const CURRENT_VERSION = 1 as const;

/**
 * 경제 시스템 버전. v0.4.0에서 전체 경제 스케일이 약 10배로 재조정되면서 도입.
 * 이전 세이브와 호환되지 않으므로, 로드 시 이 값이 불일치하면 세이브를 리셋한다.
 */
export const CURRENT_ECONOMY_VERSION = 2;

export type PersistedSave = {
  v: typeof CURRENT_VERSION;
  economyVersion?: number;
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
    | 'parentalInvestment'
    | 'parentalRepaymentBase'
    | 'totalTaxPaid'
  >;
};

export function saveGame(state: GameStoreState): void {
  try {
    const save: PersistedSave = {
      v: CURRENT_VERSION,
      economyVersion: CURRENT_ECONOMY_VERSION,
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
        parentalInvestment: state.parentalInvestment,
        parentalRepaymentBase: state.parentalRepaymentBase,
        totalTaxPaid: state.totalTaxPaid,
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
    // v0.4.0: 경제 시스템 버전 체크. economyVersion이 없거나 현재보다 낮으면 리셋.
    if ((parsed.economyVersion ?? 0) < CURRENT_ECONOMY_VERSION) {
      console.warn(
        '경제 시스템이 개편되어 이전 세이브는 리셋됩니다 (economy v%d → v%d)',
        parsed.economyVersion ?? 0,
        CURRENT_ECONOMY_VERSION,
      );
      return null;
    }
    // v0.3.0 마이그레이션: 구버전 세이브에는 character.householdClass가 없으니 'average'로 폴백
    if (parsed.state?.character && parsed.state.character.householdClass == null) {
      parsed.state.character = { ...parsed.state.character, householdClass: 'average' };
    }
    // v0.3.0 신규 누계 필드 — 미존재 시 0/null 폴백
    if (parsed.state?.parentalInvestment == null) parsed.state.parentalInvestment = 0;
    if (parsed.state?.parentalRepaymentBase === undefined) parsed.state.parentalRepaymentBase = null;
    if (parsed.state?.totalTaxPaid == null) parsed.state.totalTaxPaid = 0;
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
