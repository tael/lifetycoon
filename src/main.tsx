import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadScenarios } from './store/gameStore'

// Preload scenarios chunk in background (non-blocking)
loadScenarios().catch(() => {});

// Restore theme
try {
  const theme = localStorage.getItem('lifetycoon-kids:theme');
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
} catch { /* ignore */ }

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
