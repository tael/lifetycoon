---
name: balance-sim
description: 인생타이쿤 밸런스 자동 시뮬레이션. 헤드리스로 N회 병렬 실행하고 지표/인사이트 리포트를 생성한다. 개발 전용.
---

<Purpose>
인생타이쿤의 현재 밸런스를 N회 반복 시뮬레이션으로 검증하고, 등급 분포·자산 분포·꿈 달성률·시나리오 트리거 빈도·스탯 분포 등의 핵심 지표를 집계한다. 개발자가 밸런스 조정 인사이트를 빠르게 얻을 수 있도록 한다.
</Purpose>

<Use_When>
- "밸런스 시뮬", "balance sim", "/balance-sim" 키워드
- 밸런스 검증, 시나리오 트리거 빈도 확인, 꿈 달성률 분포 확인
- 게임 파라미터 변경 후 영향 확인
- 난이도 조정 전후 비교 (같은 시드로 재실행)
</Use_When>

<Steps>
1. Run `pnpm tsx scripts/balance-sim.ts --runs {N} --seed {seed}` (default N=1000)
   - 빠른 스모크 테스트: `--runs 20 --workers 2 --seed 42`
   - 풀 배치: `--runs 1000 --seed 42`
   - 대규모: `--runs 10000 --seed 42`
2. Read the generated markdown report at `.omc/sim-reports/report-{ts}.md`
3. Summarize the terminal output and top 3 insights in Korean to the user
4. If the user asks for more runs, re-invoke with --runs 10000
</Steps>

<Tool_Usage>
- Bash: `pnpm tsx scripts/balance-sim.ts --runs 1000 --seed 42`
- Read: `.omc/sim-reports/report-{timestamp}.md` (latest file)
- 진행률은 stderr로 출력되므로 Bash 출력에서 `[sim]` 접두사 라인을 확인
</Tool_Usage>
