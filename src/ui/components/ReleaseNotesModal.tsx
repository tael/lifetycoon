import { useEffect, useState } from 'react';

/**
 * 릴리즈노트 모달.
 *
 * public/releases.json 을 fetch해서 최근 릴리즈를 유저 친화적 톤으로 보여준다.
 * localStorage에 "마지막으로 본 릴리즈 버전"을 저장해서, 사용자가 닫으면
 * 같은 버전은 다시 자동으로 뜨지 않는다.
 */

export const LAST_SEEN_RELEASE_KEY = 'lifetycoon:lastSeenRelease';

export type ReleaseEntry = {
  version: string;
  date: string;
  title: string;
  emoji?: string;
  items: string[];
};

export async function fetchReleases(): Promise<ReleaseEntry[]> {
  try {
    const res = await fetch(`./releases.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as ReleaseEntry[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function getLastSeenRelease(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_RELEASE_KEY);
  } catch {
    return null;
  }
}

export function setLastSeenRelease(version: string): void {
  try {
    localStorage.setItem(LAST_SEEN_RELEASE_KEY, version);
  } catch {
    /* ignore */
  }
}

/** releases 배열에서 lastSeen 이후의 미확인 릴리즈만 리턴. 최신 순 정렬 가정. */
export function getUnseenReleases(
  releases: ReleaseEntry[],
  lastSeen: string | null,
): ReleaseEntry[] {
  if (!lastSeen) return releases;
  const idx = releases.findIndex((r) => r.version === lastSeen);
  if (idx < 0) return releases; // lastSeen이 목록에 없으면 전부 신규 취급
  return releases.slice(0, idx);
}

interface Props {
  onClose: () => void;
}

export function ReleaseNotesModal({ onClose }: Props) {
  const [releases, setReleases] = useState<ReleaseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchReleases().then((data) => {
      if (cancelled) return;
      setReleases(data);
      setLoading(false);
      // 모달이 열린 순간, 가장 최신 릴리즈를 "본 것"으로 마킹한다.
      if (data.length > 0) {
        setLastSeenRelease(data[0].version);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    zIndex: 9100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    background: 'var(--bg-card, #fff)',
    borderRadius: 'var(--radius-lg, 16px)',
    width: '100%',
    maxWidth: 400,
    maxHeight: '85dvh',
    overflowY: 'auto',
    boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
    padding: '22px 20px',
  };

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={modalStyle}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg, 18px)', fontWeight: 800 }}>
            📢 새 소식
          </h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.4rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted, #aaa)' }}>
            불러오는 중...
          </div>
        )}

        {!loading && releases.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted, #aaa)' }}>
            아직 소식이 없어요.
          </div>
        )}

        {!loading &&
          releases.map((r, idx) => (
            <div
              key={r.version}
              style={{
                marginBottom: idx < releases.length - 1 ? 20 : 0,
                paddingBottom: idx < releases.length - 1 ? 16 : 0,
                borderBottom:
                  idx < releases.length - 1
                    ? '1px dashed var(--border, #eee)'
                    : 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  marginBottom: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>{r.emoji ?? '🎮'}</span>
                <span
                  style={{
                    fontSize: 'var(--font-size-base, 16px)',
                    fontWeight: 800,
                    color: 'var(--text-primary, #333)',
                  }}
                >
                  {r.title}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 'var(--font-size-xs, 12px)',
                    color: 'var(--text-muted, #999)',
                    fontWeight: 600,
                  }}
                >
                  v{r.version} · {r.date}
                </span>
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  fontSize: 'var(--font-size-sm, 14px)',
                  color: 'var(--text-primary, #444)',
                  lineHeight: 1.7,
                }}
              >
                {r.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </div>
  );
}
