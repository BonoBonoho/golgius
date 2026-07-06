#!/usr/bin/env bash
# 기구 상품 PDF → 이미지 추출 + DynamoDB/S3 시드
# 사용: bash scripts/aws/mc-catalog-seed.sh [PDF경로]
set -euo pipefail
REGION="${AWS_REGION:-ap-northeast-2}"
TABLE="${PRODUCTS_TABLE:-golgius-products}"
BUCKET="${MEDIA_BUCKET:-golgius-web-624627264933}"
PDF="${1:-/Users/bonohan/Downloads/매머드컴퍼니 MC 카달로그.pdf}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VENV=/tmp/pdf-venv

[ -f "$PDF" ] || { echo "❌ PDF 없음: $PDF"; exit 1; }

if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q pymupdf Pillow
fi

echo "== [1/3] PDF 페이지 렌더링 =="
mkdir -p /tmp/mc-catalog
"$VENV/bin/python" - <<PY
import fitz
doc = fitz.open("$PDF")
for i in range(len(doc)):
    doc[i].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(f"/tmp/mc-catalog/page-{i+1:02d}.png")
print(f"  {len(doc)} pages")
PY

echo "== [2/3] 상품 썸네일 크롭 =="
"$VENV/bin/python" "$SCRIPT_DIR/extract-mc-images.py"

echo "== [3/3] DynamoDB + S3 업로드 =="
cd "$ROOT"
PRODUCTS_TABLE="$TABLE" MEDIA_BUCKET="$BUCKET" MC_IMAGE_DIR=/tmp/mc-products \
  node "$SCRIPT_DIR/mc-catalog-seed.mjs"

echo "완료. https://golgius.biz/gym/shop 에서 확인하세요."
