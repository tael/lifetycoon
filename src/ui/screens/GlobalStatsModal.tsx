import { loadGlobalStats } from '../../store/globalStats';
import { formatWon } from '../../game/domain/asset';
import { Icon } from '../icons/Icon';

interface Props {
  onClose: () => void;
}

const GRADE_EMOJI: Record<string, string> = { S: '👑', A: '🌟', B: '🙂', C: '🌱' };

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid var(--accent-light, #ffe0b2)',
      }}
    >
      <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>{label}</span>
      <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>{value}</span>
    </div>
  );
}

export function GlobalStatsModal({ onClose }: Props) {
  const stats = loadGlobalStats();

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-stats-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content" style={{ animation: 'modalPop 0.25s ease-out', maxWidth: 480, width: '100%' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-md)' }}>
          <h2
            id="global-stats-modal-title"
            style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, margin: 0 }}
          >
            <Icon slot="nav-invest" size="md" /> 전체 통계
          </h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              fontSize: 'var(--font-size-lg)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              lineHeight: 1,
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {!stats ? (
          <div style={{ textAlign: 'center', padding: 'var(--sp-xl)', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--sp-md)' }}>📭</div>
            <div>아직 기록이 없어요. 게임을 완료하면 통계가 쌓여요!</div>
          </div>
        ) : (
          <div style={{ maxHeight: '70dvh', overflowY: 'auto', paddingRight: 4 }}>
            {/* 플레이 요약 */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--sp-md)',
                marginBottom: 'var(--sp-md)',
                display: 'flex',
                justifyContent: 'space-around',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                  {stats.totalGamesPlayed ?? stats.totalPlays ?? 0}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>총 플레이</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                  {stats.bestEverGrade
                    ? `${GRADE_EMOJI[stats.bestEverGrade] ?? ''} ${stats.bestEverGrade}`
                    : '-'}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>역대 최고 등급</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                  {(stats.totalScenariosSeen ?? []).length}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>본 시나리오</div>
              </div>
            </div>

            {/* 상세 통계 */}
            <div style={{ padding: '0 var(--sp-xs)' }}>
              <StatRow
                label="총 선택 횟수"
                value={`${(stats.totalChoicesMade ?? 0).toLocaleString()}회`}
              />
              <StatRow
                label="총 번 돈"
                value={formatWon(stats.totalMoneyEarned ?? stats.totalAssetsEarned ?? 0)}
              />
              <StatRow
                label="총 매수 횟수"
                value={`${(stats.totalBought ?? 0).toLocaleString()}회`}
              />
              <StatRow
                label="총 매도 횟수"
                value={`${(stats.totalSold ?? 0).toLocaleString()}회`}
              />
              <StatRow
                label="가장 많이 매수한 종목"
                value={stats.favoriteStock ?? '-'}
              />
              <StatRow
                label="총 꿈 달성"
                value={`${stats.totalDreamsAchieved ?? 0}개`}
              />
            </div>

            <div
              style={{
                marginTop: 'var(--sp-md)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-muted)',
                textAlign: 'right',
              }}
            >
              마지막 업데이트: {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString('ko-KR') : '-'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
