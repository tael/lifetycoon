import { useEffect, useRef } from 'react';
import { useGameStore } from './store/gameStore';
import { TitleScreen } from './ui/screens/TitleScreen';
import { DreamPickScreen } from './ui/screens/DreamPickScreen';
import { PlayScreen } from './ui/screens/PlayScreen';
import { EndingScreen } from './ui/screens/EndingScreen';
import { ToastContainer } from './ui/components/Toast';
import { UpdateBanner } from './ui/components/UpdateBanner';
import { extractShareCodeFromUrl, decodeShareCode } from './store/shareCode';
import './ui/styles/tokens.css';
import './ui/styles/mobile-first.css';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const loadSnapshot = useGameStore((s) => s.loadSnapshot);
  const applied = useRef(false);

  // 공유 링크(`?s=...`) 로 접속했을 때 타이틀 화면을 거치지 않고 친구의 엔딩으로 바로 진입.
  // 기존에는 유저가 타이틀 화면 스크롤 하단의 "친구의 인생 보기" 버튼을 직접 찾아야 해서
  // 대부분 "첫 화면만 보고 끝나는" 경험이었음.
  useEffect(() => {
    if (applied.current) return;
    if (typeof window === 'undefined') return;
    const code = extractShareCodeFromUrl(window.location.href);
    if (!code) return;
    const data = decodeShareCode(code);
    if (!data) return;
    applied.current = true;
    const current = useGameStore.getState().character;
    loadSnapshot({
      phase: { kind: 'ending' },
      ending: data.payload.ending,
      character: { ...current, name: data.payload.characterName },
      // 공유 뷰임을 표시하는 플래그는 없지만, EndingScreen에서 공유 버튼 등을 숨기고 싶으면
      // 여기서 별도 필드를 세팅하는 방식으로 확장 가능.
    } as Parameters<typeof loadSnapshot>[0]);
  }, [loadSnapshot]);

  let screen;
  switch (phase.kind) {
    case 'title':
      screen = <TitleScreen />;
      break;
    case 'dream-pick':
    case 'onboarding':
      screen = <DreamPickScreen />;
      break;
    case 'playing':
    case 'paused':
      screen = <PlayScreen />;
      break;
    case 'ending':
      screen = <EndingScreen />;
      break;
    default:
      screen = <TitleScreen />;
  }

  return (
    <>
      {screen}
      <ToastContainer />
      <UpdateBanner />
    </>
  );
}
