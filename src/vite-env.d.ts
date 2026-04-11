/// <reference types="vite/client" />

/** 빌드 식별자 (YYYYMMDD.SHA). 매 커밋 변경, 디버깅·캐시버스팅용. */
declare const __APP_VERSION__: string;

/** 사용자용 릴리즈 번호 (semver, 예: "0.1.0"). package.json에서 읽어옴. */
declare const __APP_SEMVER__: string;
