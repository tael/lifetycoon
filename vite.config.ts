/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

// 빌드 시점에 git 커밋 SHA와 날짜를 주입한다.
// CI(Pages 배포)와 로컬 빌드 모두에서 동작하고, git이 없는 환경이면 'dev'로 폴백.
function readGitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

const APP_VERSION = `${readGitSha()} · ${new Date().toISOString().slice(0, 10)}`;

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/zustand') || id.includes('node_modules/pako')) {
            return 'vendor';
          }
          if (id.includes('/game/data/') && id.endsWith('.json')) {
            return 'data';
          }
          if (id.includes('/game/')) {
            return 'game';
          }
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
