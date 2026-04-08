# TRD: 인생타이쿤 (LifeTycoon Kids) — 기술 참조 문서

> v1.0 | 2026-04-08 | 기준 커밋: 63+

---

## 1. 시스템 아키텍처

### 1.1 기술 스택

| 레이어 | 기술 | 버전 | 역할 |
|--------|------|------|------|
| 프레임워크 | React | 19.2.4 | UI 렌더링 |
| 언어 | TypeScript | 5.9.3 | 타입 안정성 |
| 번들러 | Vite | 8.0.1 | 빌드/HMR |
| 상태관리 | Zustand | 5.0.12 | 게임 상태 |
| 압축 | pako | 2.1.0 | 공유코드 gzip |
| 유틸 | clsx | 2.1.1 | className 조합 |
| 테스트 | Vitest | 4.1.2 | 단위/통합 테스트 |

### 1.2 모듈 의존성 그래프

```
┌─────────────────────────────────────────────────┐
│                     UI Layer                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ screens/ │ │components│ │   styles/        │ │
│  │ (5 files)│ │ (6 files)│ │ (tokens, mobile) │ │
│  └────┬─────┘ └────┬─────┘ └──────────────────┘ │
│       │             │                             │
│       └──────┬──────┘                             │
│              ▼                                    │
│  ┌───────────────────┐                            │
│  │    store/         │  ← Zustand                 │
│  │  gameStore.ts     │  ← 루트 스토어             │
│  │  persistence.ts   │  ← localStorage            │
│  │  shareCode.ts     │  ← URL 공유                │
│  │  highScore.ts     │  ← 최고 기록               │
│  └────────┬──────────┘                            │
│           ▼                                       │
│  ┌───────────────────────────────────────┐        │
│  │          game/ (순수 로직)             │        │
│  │  ┌────────────┐  ┌──────────────────┐ │        │
│  │  │  engine/   │  │    domain/       │ │        │
│  │  │ gameLoop   │  │ character, stock │ │        │
│  │  │ timeAxis   │  │ bank, job, dream │ │        │
│  │  │ prng       │  │ npc, ending      │ │        │
│  │  │ eventDisp  │  │ achievements     │ │        │
│  │  │ visibility │  │ lifeSummary      │ │        │
│  │  └────────────┘  └──────────────────┘ │        │
│  │  ┌────────────┐  ┌──────────────────┐ │        │
│  │  │ scenario/  │  │    data/         │ │        │
│  │  │ engine.ts  │  │ *.json (6 files) │ │        │
│  │  └────────────┘  └──────────────────┘ │        │
│  └───────────────────────────────────────┘        │
└─────────────────────────────────────────────────┘

불변 규칙: game/ → ui/ 또는 store/ import 금지
```

### 1.3 빌드 산출물

| 파일 | 크기(gzip) | 내용 |
|------|-----------|------|
| `index.html` | ~0.5KB | SPA 엔트리 |
| `index-*.css` | ~1.6KB | 토큰+레이아웃 |
| `index-*.js` | ~131KB | React+Zustand+game+data |
| **합계** | **~133KB** | 예산 200KB 이내 |

---

## 2. 상태 모델

### 2.1 Phase (Discriminated Union)

```typescript
type Phase =
  | { kind: 'title' }
  | { kind: 'onboarding'; step: number }
  | { kind: 'dream-pick' }
  | { kind: 'playing' }
  | { kind: 'paused'; event: EconomicEvent }  // pause ↔ event 단일 진실
  | { kind: 'ending' };
```

**설계 의도**: `phase`와 `activeEvent`를 분리하면 "paused인데 event 없음" 불법 상태 가능. Discriminated union으로 타입 레벨 보장.

### 2.2 전체 상태 형태

```typescript
type GameStoreState = {
  schemaVersion: 1;
  phase: Phase;

  // 캐릭터
  character: Character;      // name, age(float), happiness, health, wisdom, charisma, traits[], emoji
  cash: number;
  bank: BankAccount;         // balance, interestRate
  holdings: Holding[];       // ticker, shares, avgBuyPrice
  prices: Record<string, number>;  // 현재 주가 맵
  job: Job | null;
  dreams: Dream[];           // 선택한 꿈 (1~3개)
  traits: string[];          // 획득 특성 태그

  // NPC
  npcs: FriendNPC[];         // 4명, 매년 갱신

  // 기록
  keyMoments: KeyMoment[];   // 중요 순간 (상한 30, importance 기반)
  recentLog: LifeEvent[];    // 최근 로그 (FIFO 100)
  assetHistory: { age: number; value: number }[];  // 5년 주기
  usedScenarioIds: string[]; // oneShot 중복 방지

  // 설정
  seeds: Seeds;              // { master, stock, event, npc }
  autoInvest: boolean;
  speedMultiplier: 0.5 | 1 | 2;

  // 결과
  ending: Ending | null;

  // 마스터 데이터 (런타임 참조)
  stocksMaster: StockDef[];
  jobsMaster: Job[];
  scenariosMaster: ScenarioEvent[];
};
```

### 2.3 스토어 밖 상태 (mutable ref)

| 변수 | 위치 | 역할 |
|------|------|------|
| `elapsedMs` | `gameLoop.ts` 내부 | rAF 누적 시간 (store에 쓰지 않음) |
| `streams` | `gameStore.ts` 모듈 스코프 | PRNG 스트림 4개 |
| `lastTick` | `gameLoop.ts` 내부 | 이전 프레임 timestamp |
| `lastIntAge` | `gameLoop.ts` 내부 | 정수 나이 변경 감지 |

---

## 3. 시간 모델

### 3.1 상수

```typescript
MS_PER_YEAR = 6700       // 1년 = 6.7초
START_AGE   = 10
END_AGE     = 100
```

### 3.2 변환 함수

```typescript
elapsedMsToAge(ms)  = START_AGE + ms / MS_PER_YEAR
ageToElapsedMs(age) = (age - START_AGE) * MS_PER_YEAR
progressFraction(age) = (age - 10) / 90   // 0.0 ~ 1.0
```

### 3.3 게임 루프 tick 흐름

```
rAF callback(now):
  rawDelta = now - lastTick
  delta = min(rawDelta, 100)         ← 탭 복귀 시 점프 방지
  scaled = delta × speedMultiplier
  elapsedMs += scaled
  
  age = elapsedMsToAge(elapsedMs)
  intAge = floor(age)
  
  if intAge ≠ lastIntAge:
    deltaYears = intAge - lastIntAge
    lastIntAge = intAge
    callbacks.onIntAgeChange(intAge, deltaYears, elapsedMs)
  
  if age ≥ 100:
    callbacks.onFinished()
    return
  
  schedule next rAF
```

### 3.4 가시성 제어

```
document.visibilitychange:
  hidden  → gameLoop.pause()     // rAF 중단
  visible → gameLoop.resume()    // rAF 재개, lastTick 리셋
```

---

## 4. PRNG (결정적 난수)

### 4.1 알고리즘: mulberry32

```typescript
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### 4.2 서브 스트림 분리

```typescript
Seeds = { master, stock, event, npc }

createStreams(seeds) → {
  stock: mulberry32(seeds.stock),   // 주가 전용
  event: mulberry32(seeds.event),   // 이벤트 추첨 전용
  npc:   mulberry32(seeds.npc),     // NPC AI 전용
  misc:  mulberry32(seeds.master),  // 비문, 자동투자 등
}
```

**설계 의도**: 스트림 분리로 이벤트 추가/변경해도 주가 시퀀스 불변. 결정론 계약 보장.

### 4.3 결정론 계약

> 같은 `seeds` + 같은 선택 입력 → 같은 엔딩·비문

---

## 5. 주식 시뮬레이션

### 5.1 가격 모델: GBM (기하 브라운 운동)

```typescript
nextPrice(prev, def, rng, stepYears):
  μ  = def.drift × stepYears
  σ  = def.volatility × √stepYears
  z  = gaussian(rng)          // Box-Muller (mulberry32 기반)
  Δ  = μ + σ × z
  next = prev × exp(Δ)
  return max(1, round(next))  // 최소가 1 (파산 방지)
```

### 5.2 가우시안 생성

```typescript
gaussian(rng):
  u = max(1e-9, rng())       // log(0) 방지
  v = rng()
  return √(-2 ln u) × cos(2π v)
```

### 5.3 종목 파라미터

| Ticker | drift | volatility | dividendRate | 특성 |
|--------|-------|------------|-------------|------|
| DDUK | 0.08 | 0.35 | 0.02 | 코믹 대표, 체인 이벤트 핵심 |
| RAIN | 0.12 | 0.25 | 0.01 | 성장주 |
| PENG | 0.06 | 0.18 | 0.03 | 안정 배당 |
| TOFU | 0.04 | 0.12 | 0.04 | 초안정 고배당 |
| ROCK | 0.15 | 0.45 | 0.00 | 극고위험 성장 |
| CATB | 0.05 | 0.10 | 0.05 | 금융주 최고 배당 |
| META | 0.18 | 0.55 | 0.00 | 극고위험 투기 |
| LEGC | 0.10 | 0.22 | 0.025 | 중간 |
| BORA | 0.09 | 0.28 | 0.015 | 뷰티 |
| DOGE | 0.07 | 0.15 | 0.03 | 안정 배당 |

### 5.4 쇼크 메커니즘

```typescript
// 이벤트 효과 중 stockShock
shockPrice(price, multiplier) = max(1, round(price × multiplier))
```

### 5.5 배당금 계산 (연간)

```typescript
dividend = Σ(price[ticker] × shares × dividendRate × deltaYears)
```

---

## 6. 이벤트 디스패치

### 6.1 적격성 검사

```
isEligible(event, ctx):
  1. event.oneShot && ctx.usedScenarioIds.has(event.id) → false
  2. ctx.age < event.ageRange[0] || ctx.age > event.ageRange[1] → false
  3. for each trigger in event.triggers:
       if !matchTrigger(trigger, ctx) → false
  4. → true
```

### 6.2 트리거 타입

| kind | 조건 |
|------|------|
| `ageRange` | min ≤ age ≤ max |
| `specificAge` | floor(age) == target |
| `cashGte` | cash ≥ value |
| `cashLte` | cash ≤ value |
| `hasJob` | job.id == jobId |
| `hasTrait` | traits.includes(trait) |

### 6.3 발생 확률

```
specificAge 트리거 존재 → 100% 보장 (우선 추첨)
일반 → eventChancePerYear() = 0.4 (상수), 실제 확률 = 0.4 × deltaYears
이론: 0.4 × 90년 ≈ 36 이벤트/게임 (마일스톤 8개 별도)
실측: Playwright 자동 테스트 기준 ~40~50 이벤트/게임 (마일스톤 포함)
```

> 주의: `eventDispatcher.ts:66`의 주석("~0.7 events/year = ~63")은 이전 확률(0.6) 기준. 현재 0.4로 변경됨.

### 6.4 가중 추첨

```typescript
weightedPick(rng, eligibleEvents, ev => ev.weight)
// weight가 높을수록 선택 확률 증가
```

---

## 7. 캐릭터 시뮬레이션

### 7.1 스탯 자연 감소 (연간)

| 나이대 | 행복도 감소 | 건강 감소 |
|--------|-----------|----------|
| 10~50세 | -0.4/년 | -0.15/년 |
| 50~70세 | -0.8/년 | -0.5/년 |
| 70~100세 | -1.2/년 | -1.0/년 |

**최저값**: 자연 감소 최저 10 (`advanceYear` 내 `Math.max(10, ...)`), 이벤트 효과 최저 0 (`clampStats` 0~100)

### 7.2 케어 버튼 효과

| 버튼 | 비용 | 효과 | 대상 스탯 |
|------|------|------|----------|
| 🍕 간식 | 5,000원 | +5 | happiness |
| 💊 건강 | 10,000원 | +8 | health |
| 📖 공부 | 8,000원 | +4 | wisdom |
| 🎤 노래 | 3,000원 | +4 | charisma |

### 7.3 이모지 매핑

```
age < 14: happiness > 60 ? 🧒 : > 30 ? 😐 : 😢
age < 20: happiness > 60 ? 😁 : > 30 ? 😕 : 😭
age < 35: happiness > 60 ? 😎 : > 30 ? 😶 : 😩
age < 55: happiness > 60 ? 🤩 : > 30 ? 😐 : 😞
age < 75: happiness > 60 ? 😊 : > 30 ? 🤔 : 😪
age ≥ 75: happiness > 60 ? 🥰 : > 30 ? 😌 : 😴
```

---

## 8. NPC 시뮬레이션

### 8.1 성격 파라미터

| 성격 | riskAppetite | luckFactor | growthRate |
|------|-------------|-----------|-----------|
| conservative | 0.2 | 0.4 | 0.04 |
| aggressive | 0.9 | 0.5 | 0.09 |
| lucky | 0.5 | 0.9 | 0.07 |
| scholarly | 0.4 | 0.5 | 0.06 |

### 8.2 연간 자산 성장

```
base  = growthRate × yearsPassed
noise = randFloat(-0.25, 0.35) × riskAppetite × yearsPassed
lucky = (rng() < 0.1 × luckFactor) ? randFloat(0.2, 0.8) × yearsPassed : 0
growth = 1 + base + noise + lucky
newAssets = max(1000, round(currentAssets × growth))
```

### 8.3 반응 로직 (UI)

```
npc.assets < player.assets × 0.5 → "😢 부러워..."
npc.assets > player.assets × 2   → "😏 나를 이겨봐!"
else                              → npc.status (성격별 풀)
```

---

## 9. 수입 구조 (연간)

```typescript
// advanceYear() 내 계산 순서:
salaryIncome   = job.salary × 12 × deltaYears
dividendIncome = Σ(price × shares × dividendRate × deltaYears)
pensionIncome  = (age ≥ 65)
  ? 500,000 × min(usedScenarioIds.filter(id ⊃ 'job'|'career'|'part_time').length + 1, 5) × deltaYears
  : 0
// 주의: 연금은 "직업 수"가 아니라, 사용된 시나리오 ID 중 job/career/part_time을 포함하는 개수 기반
autoInvestCost = autoInvest ? ~salaryIncome × 0.1 : 0
bankInterest   = applyInterestForYears(bank, deltaYears)

totalCash = cash + salary + dividend + pension - autoInvest
```

---

## 10. 엔딩 계산

### 10.1 등급

```
ratio = dreamsAchieved / totalDreams
S: ratio ≥ 0.999
A: ratio ≥ 0.66
B: ratio ≥ 0.33
C: ratio < 0.33 (또는 totalDreams == 0)
```

### 10.2 키 모먼트 선택 (최대 8개)

```
1단계: 각 인생 단계(유년/청년/중년/장년)에서 importance 최고 1개씩 확보
2단계: 나머지 importance 순 채우기
3단계: age 순 정렬
```

### 10.3 비문 생성

```
1. opening 템플릿 랜덤 선택 (10개 풀)
   "{name}의 {grade} 인생" 형태 ({grade}는 gradeWord()로 변환됨)
2. 빈 줄
3. 키 모먼트 × 8: "• {age}세, {text}"
4. 빈 줄
5. 달성 꿈 목록 또는 "꿈은 이루지 못했지만..."
6. closing 템플릿 랜덤 선택 (10개 풀)
   "{assets}원의 유산과 함께..." 형태
```

### 10.4 인생 타이틀 (20+ 종)

우선순위 기반 매칭:
```
1. 우주떡볶이       → "🚀 우주 떡볶이 황제"
2. 시간여행+외계인  → "🌌 차원 여행자"
3. 글로벌리더       → "🌍 글로벌 리더"
4. IT사업가         → "💻 IT 거물"
5. 자산 10억+       → "💎 10억 부자"
6. 꿈 3개+ 전달성   → "🌈 꿈의 완성자"
...
20. 기본             → "🌱 평범한 시민"
```

---

## 11. 영속성

### 11.1 localStorage 키

| 키 | 용도 | 스키마 |
|----|------|--------|
| `lifetycoon-kids:save` | 게임 세이브 | `{ v:1, savedAt, state }` |
| `lifetycoon-kids:achievements` | 업적 해금 | `[{ id, unlockedAt }]` |
| `lifetycoon-kids:achievement-meta` | 메타 | `{ totalGamesPlayed, gradesEarned[] }` |
| `lifetycoon-kids:highscore` | 최고 기록 | `{ bestGrade, highestAssets, ... }` |
| `lifetycoon-kids:theme` | 다크모드 | `"dark" \| "light"` |
| `lifetycoon-kids:tutorial-seen` | 튜토리얼 | `"1"` |

### 11.2 저장 타이밍

- 5년마다 자동 저장 (`advanceYear` 내 `intAge % 5 === 0`)
- 게임 루프 종료/언마운트 시
- 이벤트 선택 후 (간접)

### 11.3 버전 관리

```typescript
// persistence.ts
CURRENT_VERSION = 1
// 로드 시 v !== CURRENT_VERSION → 세이브 무시 + 경고

// shareCode.ts
SCHEMA_VERSION = 1
// 디코드 시 v !== SCHEMA_VERSION → "지원 안 되는 버전" 안내
```

---

## 12. 공유 코드

### 12.1 인코딩 파이프라인

```
EndingSnapshot (JSON)
  → TextEncoder.encode()
  → pako.deflateRaw()
  → bytesToBase64Url()        // +→- /→_ =제거
  → ?s={code} 쿼리스트링

최대 길이: 1900자 (초과 시 epitaph 6줄로 트림)
```

### 12.2 디코딩

```
base64url → bytes → pako.inflateRaw() → JSON.parse()
→ ShareEnvelope { v: 1, payload: { characterName, ending } }
```

---

## 13. 이벤트 효과 시스템

### 13.1 효과 타입

| kind | 파라미터 | 동작 |
|------|---------|------|
| `cash` | delta | cash += delta (하한 -5천만) |
| `happiness` | delta | character.happiness += delta |
| `health` | delta | character.health += delta |
| `wisdom` | delta | character.wisdom += delta |
| `charisma` | delta | character.charisma += delta |
| `addTrait` | trait | traits에 추가 (중복 무시) |
| `setJob` | jobId | 직업 변경 |
| `stockShock` | ticker, multiplier | 해당 종목 가격 × multiplier |
| `keyMoment` | text, importance | 키 모먼트 추가 |
| `bankInterestChange` | delta | 이자율 변경 |
| `gotoScenario` | scenarioId | (미사용, 예약) |

### 13.2 효과 적용 후

```
clampStats(character)  // 모든 스탯 0~100 범위
pruneKeyMoments(moments, 30)  // importance 기준 상위 30개 유지
```

---

## 14. UI 컴포넌트 트리

```
App
├── ToastContainer (전역 토스트)
├── TitleScreen
│   ├── 이름 입력
│   ├── 새 인생 / 빠른 시작 / 이어하기
│   ├── 하이스코어 카드
│   ├── 업적 배지 (15개)
│   └── 다크모드 토글
├── DreamPickScreen
│   └── 꿈 카드 × 8 (최대 3개 선택)
├── PlayScreen
│   ├── NewsTicker (3년 주기)
│   ├── AgeTimeline (진행바 + 마일스톤 마커)
│   ├── CharacterCard (이모지 + 말풍선 + 스탯바 + 케어버튼 + 특성태그)
│   ├── DreamsCard (진행도 바 + %)
│   ├── AssetsCard (현금/예금/주식 + 수입분해 + 입출금)
│   ├── StockBoard (10종목 + 배당률 + 방향 + 매매)
│   ├── NPCRanking (순위 + 반응 + 내 위치)
│   ├── LifeDiary (최근 키모먼트 5개)
│   ├── EventModal (효과 미리보기 + 번호 키)
│   ├── MilestonePopup (10년 주기)
│   ├── TutorialOverlay (첫 플레이 4단계)
│   └── ConfettiBurst (꿈 달성 시)
└── EndingScreen
    ├── Tombstone (등급 + 타이틀 + 한줄요약 + 비문)
    ├── AssetChart (SVG 라인)
    ├── LifeStats (이벤트/특성/종목/예금/최고순간)
    ├── NPCComparison (자산 랭킹)
    ├── Achievements (신규 해금)
    ├── MissedDreams (리플레이 유도)
    ├── StrategyTip (맞춤 조언)
    ├── SeedDisplay (게임 시드)
    └── ShareButton (URL 복사)
```

---

## 15. CSS 설계

### 15.1 디자인 토큰 (`tokens.css`)

```css
--bg-primary: #faf7f2;
--accent: #ff7043;
--success: #4caf50;
--danger: #e53935;
--font-main: 'Pretendard Variable', 'Noto Sans KR', sans-serif;
--radius-md: 12px;
```

### 15.2 다크 모드 (`[data-theme="dark"]`)

```css
--bg-primary: #1a1a2e;
--bg-card: #0f3460;
--text-primary: #e8e8e8;
```

### 15.3 나이별 배경 그라데이션

| 나이 | 배경 | 의미 |
|------|------|------|
| 10~14 | #fffde7 → #fff8e1 | 밝은 유년 |
| 15~24 | #e8f5e9 → #f1f8e9 | 상쾌한 청춘 |
| 25~39 | #e3f2fd → #e8eaf6 | 시원한 성인 |
| 40~54 | #fff3e0 → #fbe9e7 | 따뜻한 중년 |
| 55~69 | #fce4ec → #f3e5f5 | 부드러운 장년 |
| 70~84 | #ede7f6 → #e8eaf6 | 차분한 노년 |
| 85~100 | #efebe9 → #d7ccc8 | 포근한 말년 |

### 15.4 접근성

- `prefers-reduced-motion: reduce` → 모든 애니메이션 0.01ms
- 최소 터치 타겟: 48px
- 스탯 30 이하: 펄싱 경고 애니메이션

---

## 16. 성능 고려사항

### 16.1 렌더링 최적화

- Zustand `subscribeWithSelector`: 필요한 slice만 구독
- `intAge` 변경 시에만 store 커밋 (rAF 매 프레임 X)
- CSS transition으로 애니메이션 (JS 리렌더 최소화)

### 16.2 데이터 크기 관리

- `keyMoments`: importance 기반 reservoir (상한 30)
- `recentLog`: FIFO 100
- `assetHistory`: 5년 간격만 기록 (18개 포인트)
- 시나리오 JSON: ~130KB (gzip ~12KB)

### 16.3 메모리 누수 방지

- 게임 루프: useEffect cleanup에서 `loop.stop()` + `vis.detach()`
- setInterval (뉴스 티커, 토스트): cleanup으로 `clearInterval`

---

## 17. 테스트 전략

### 17.1 현재 구성

```bash
pnpm test        # vitest run (happy-dom 환경)
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm build       # 정적 빌드 검증
```

### 17.2 권장 테스트 계층

| 계층 | 범위 | 도구 |
|------|------|------|
| 단위 | domain/ 순수함수, PRNG | vitest |
| 통합 | store actions, persistence | vitest + happy-dom |
| E2E | 전체 플레이 루프 | Playwright (수동/자동) |
| 결정론 | 같은 seed → 같은 결과 | vitest (해시 비교) |
| 성능 | headless 100회 반복 | vitest + 메모리 프로파일 |

---

## 18. 배포

### 18.1 빌드 명령

```bash
pnpm build
# → dist/index.html + dist/assets/*.{js,css}
```

### 18.2 호스팅 옵션

| 서비스 | 설정 | 비용 |
|--------|------|------|
| Vercel | `vercel deploy` | 무료 |
| Netlify | `netlify deploy --dir dist` | 무료 |
| GitHub Pages | `base: './'` 이미 설정됨 | 무료 |

### 18.3 요구사항

- Node.js 18+
- pnpm 10+
- 브라우저: ES2020 지원 (Chrome 80+, Safari 14+, Firefox 78+)
