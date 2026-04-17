#!/bin/bash
# Parallel SVG generation via gemini CLI
set -u
cd "$(dirname "$0")/.."

INVENTORY=".design-refresh/icons/icon-inventory.json"
OUT_DIR=".design-refresh/images"
LOG_DIR=".design-refresh/logs"
mkdir -p "$OUT_DIR" "$LOG_DIR"

MAX_PARALLEL="${MAX_PARALLEL:-6}"

gen_one() {
  local id="$1"
  local label="$2"
  local context="$3"
  local prompt="$4"
  local out="$OUT_DIR/${id}.svg"
  local log="$LOG_DIR/${id}.log"

  if [ -f "$out" ]; then
    echo "SKIP $id"
    return 0
  fi

  local full_prompt
  full_prompt=$(cat <<EOF
너는 숙련된 벡터 일러스트레이터다. 한국 초등학생 대상 경제 게임 아이콘을 SVG로 그린다.

슬롯 ID: $id
라벨: $label
용도: $context
디자인 지시: $prompt

엄격한 사양:
- viewBox="0 0 64 64"
- 플랫 벡터 스타일 (그라데이션 1-2개 허용)
- 두꺼운 아웃라인 (stroke-width: 2.5, stroke="#2D3436")
- 둥근 모서리 (stroke-linejoin="round", stroke-linecap="round")
- 투명 배경 (배경 사각형 금지)
- 텍스트/글자 금지
- 필터/그림자 금지 (성능)
- 파스텔 톤, 밝고 친근한 느낌
- 복잡한 path 금지, 단순한 shape 조합 선호
- width/height 속성 생략 또는 64
- 64x64에서 선명하게 보이도록

저장 경로: $out
정확히 이 경로에만 저장. 다른 파일 생성/수정 금지.
완료 후 "OK"만 출력.
EOF
)

  gemini -p "$full_prompt" --approval-mode yolo -o text > "$log" 2>&1
  if [ -f "$out" ]; then
    echo "DONE $id"
  else
    echo "FAIL $id (see $log)"
  fi
}
export -f gen_one
export OUT_DIR LOG_DIR

jq -r '.slots[] | [.id, .label, .context, .prompt] | @tsv' "$INVENTORY" | \
while IFS=$'\t' read -r id label context prompt; do
  while [ "$(jobs -rp | wc -l | tr -d ' ')" -ge "$MAX_PARALLEL" ]; do
    sleep 1
  done
  gen_one "$id" "$label" "$context" "$prompt" &
done
wait
echo "ALL_DONE"
ls -la "$OUT_DIR"
