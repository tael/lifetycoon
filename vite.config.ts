/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 빌드 시점에 git 커밋 SHA와 날짜를 주입한다.
// CI(Pages 배포)와 로컬 빌드 모두에서 동작하고, git이 없는 환경이면 'dev'로 폴백.
function readGitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

// package.json의 semver 버전을 읽는다 (예: "0.1.0").
// "사용자용 릴리즈 번호" 역할. 큰 변화가 있을 때만 수동 bump.
function readPackageVersion(): string {
  try {
    const pkgPath = resolve(__dirname, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

// 빌드 식별자: YYYYMMDD.SHA (디버깅·캐시버스팅용, 매 커밋 변경).
const APP_VERSION = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.${readGitSha()}`;
// 사용자용 릴리즈 번호: package.json semver (릴리즈노트와 매칭되는 값).
const APP_SEMVER = readPackageVersion();

export default defineConfig({
  plugins: [
    react(),
    {
      // 빌드 시 dist/version.json 파일을 생성한다. 클라이언트는 이 파일을
      // 주기적으로 fetch해서 현재 로드된 __APP_VERSION__과 비교한 뒤
      // 새 버전이 배포되면 사용자에게 새로고침 안내를 표시한다.
      name: 'emit-version-json',
      apply: 'build',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ version: APP_VERSION }) + '\n',
        });
      },
    },
  ],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_SEMVER__: JSON.stringify(APP_SEMVER),
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
