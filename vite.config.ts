/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
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
