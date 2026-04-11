import { useEffect, useState } from 'react';

/**
 * 새 버전 감지 배너.
 *
 * 주기적으로 /version.json을 캐시 우회해서 가져와 현재 로드된 __APP_VERSION__과 비교한다.
 * 버전이 다르면 화면 상단에 작은 배너를 띄운다. 사용자는 지금 바로 새로고침하거나
 * 나중에 할 수 있다. 배너 닫기는 localStorage로 기억해서 같은 버전은 재표시 안 함.
 *
 * 에셋 파일명에는 이미 해시가 붙어있어서 index.html만 다시 가져오면 신 JS/CSS가
 * 자동으로 로드된다. 강제 새로고침은 쿼리 파라미터로 캐시 우회.
 */

const DISMISS_KEY = 'lifetycoon:dismissedVersion';
const CHECK_INTERVAL_MS = 60_000; // 1분마다 체크
const VERSION_JSON_URL = './version.json';

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${VERSION_JSON_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    return null;
  }
}

export function UpdateBanner() {
  const [newVersion, setNewVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const latest = await fetchLatestVersion();
      if (cancelled || !latest) return;
      if (latest === __APP_VERSION__) return;
      // 사용자가 이미 닫은 버전이면 재표시 안 함
      try {
        if (localStorage.getItem(DISMISS_KEY) === latest) return;
      } catch {
        /* ignore */
      }
      setNewVersion(latest);
    };

    check();
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  if (!newVersion) return null;

  const handleReload = () => {
    // Safari는 meta cache-control을 강하게 무시하는 경우가 있어서,
    // 쿼리 파라미터를 변경해 URL을 바꿔버리는 게 가장 확실하다.
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('v', newVersion.split(' ')[0]);
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, newVersion);
    } catch {
      /* ignore */
    }
    setNewVersion(null);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0px)',
        left: 0,
        right: 0,
        zIndex: 9500,
        background: 'linear-gradient(90deg, #ff9800, #ff7043)',
        color: '#fff',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        fontSize: '0.8rem',
        fontWeight: 700,
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        flexWrap: 'wrap',
      }}
    >
      <span>🎮 새 버전이 준비됐어요</span>
      <button
        onClick={handleReload}
        style={{
          background: '#fff',
          color: '#ff7043',
          border: 'none',
          borderRadius: 999,
          padding: '5px 14px',
          fontSize: '0.75rem',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
        }}
      >
        지금 새로고침
      </button>
      <button
        onClick={handleDismiss}
        aria-label="나중에"
        style={{
          background: 'rgba(255,255,255,0.2)',
          color: '#fff',
          border: 'none',
          borderRadius: 999,
          padding: '5px 10px',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        나중에
      </button>
    </div>
  );
}
