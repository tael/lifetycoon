import { useGameStore } from './store/gameStore';
import { TitleScreen } from './ui/screens/TitleScreen';
import { DreamPickScreen } from './ui/screens/DreamPickScreen';
import { PlayScreen } from './ui/screens/PlayScreen';
import { EndingScreen } from './ui/screens/EndingScreen';
import { ToastContainer } from './ui/components/Toast';
import './ui/styles/tokens.css';
import './ui/styles/mobile-first.css';

export default function App() {
  const phase = useGameStore((s) => s.phase);

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
    </>
  );
}
