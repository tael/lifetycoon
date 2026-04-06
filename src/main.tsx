import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Restore theme
try {
  const theme = localStorage.getItem('lifetycoon-kids:theme');
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
