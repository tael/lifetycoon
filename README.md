# 인생타이쿤 🎮

10세부터 100세까지 약 10분에 플레이하는 어린이 경제 육성 게임.

## 특징

- **다마고치 × 인생게임 × 캐시플로** — 캐릭터 육성 + 배속 타임라인 + 경제 시뮬레이션
- **73개 시나리오** — 병맛 이벤트, 히든 이벤트, 감성 이벤트
- **10개 가상 종목 주식** — 떡볶이 제국, 로켓김밥, 메타우주여행 등
- **12개 직업, 8개 꿈** — 매 플레이마다 다른 인생 경로
- **NPC 라이벌 4명** — 실시간 자산 랭킹 경쟁
- **영구 업적 시스템(10개)** — 리플레이마다 새로운 업적 해금
- **묘지 비문 엔딩** — 인생 서사가 담긴 비석
- **URL 공유코드** — 친구에게 엔딩 결과 공유

## 기술 스택

React 19 + TypeScript + Vite + Zustand (정적 사이트, 서버 없음)

## 실행

```bash
pnpm install
pnpm dev
```

## 빌드

```bash
pnpm build   # dist/ 에 정적 파일 생성
pnpm preview # 로컬 프리뷰
```

## 시나리오 추가

`src/game/data/scenarios.json`에 JSON 형식으로 추가. 필드:

- `id`, `triggers`, `ageRange`, `weight`, `pausesGame`
- `title`, `text`, `choices[{label, effects, importance}]`
- `tags`, `oneShot`

## 라이선스

MIT
