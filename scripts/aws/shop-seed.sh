#!/usr/bin/env bash
# 기구 쇼핑몰 샘플 상품 시드(멱등 — 같은 id 로 덮어씀). 실제 상품 등록은 /admin/products 에서.
# 사용: bash scripts/aws/shop-seed.sh
set -euo pipefail
REGION="${AWS_REGION:-ap-northeast-2}"
TABLE=golgius-products
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

put() {
  aws dynamodb put-item --table-name "$TABLE" --region "$REGION" --item "$1" >/dev/null
}

put "{
  \"id\": {\"S\": \"seed-power-rack\"},
  \"name\": {\"S\": \"파워 랙 PR-500\"},
  \"category\": {\"S\": \"프리웨이트\"},
  \"brand\": {\"S\": \"GOLGIUS PRO\"},
  \"price\": {\"N\": \"1850000\"},
  \"summary\": {\"S\": \"상업용 풀사이즈 파워 랙. 스쿼트·벤치·풀업까지 한 대로, 3mm 스틸 프레임.\"},
  \"specs\": {\"L\": [
    {\"M\": {\"label\": {\"S\": \"크기\"}, \"value\": {\"S\": \"1400 × 1500 × 2300mm\"}}},
    {\"M\": {\"label\": {\"S\": \"프레임\"}, \"value\": {\"S\": \"75×75mm 스틸, 3mm\"}}},
    {\"M\": {\"label\": {\"S\": \"최대 하중\"}, \"value\": {\"S\": \"500kg\"}}}
  ]},
  \"images\": {\"L\": []},
  \"featured\": {\"BOOL\": true},
  \"status\": {\"S\": \"active\"},
  \"createdAt\": {\"S\": \"$NOW\"},
  \"updatedAt\": {\"S\": \"$NOW\"}
}"

put "{
  \"id\": {\"S\": \"seed-treadmill\"},
  \"name\": {\"S\": \"커머셜 트레드밀 TX-9\"},
  \"category\": {\"S\": \"유산소\"},
  \"brand\": {\"S\": \"GOLGIUS PRO\"},
  \"price\": {\"NULL\": true},
  \"summary\": {\"S\": \"22인치 터치스크린, 4.0HP AC 모터의 상업용 트레드밀. 대량 구매 시 견적 문의.\"},
  \"specs\": {\"L\": [
    {\"M\": {\"label\": {\"S\": \"모터\"}, \"value\": {\"S\": \"4.0HP AC\"}}},
    {\"M\": {\"label\": {\"S\": \"속도\"}, \"value\": {\"S\": \"0.8 ~ 25km/h\"}}},
    {\"M\": {\"label\": {\"S\": \"디스플레이\"}, \"value\": {\"S\": \"22인치 터치\"}}}
  ]},
  \"images\": {\"L\": []},
  \"featured\": {\"BOOL\": true},
  \"status\": {\"S\": \"active\"},
  \"createdAt\": {\"S\": \"$NOW\"},
  \"updatedAt\": {\"S\": \"$NOW\"}
}"

put "{
  \"id\": {\"S\": \"seed-lat-pulldown\"},
  \"name\": {\"S\": \"랫풀다운 머신 LP-300\"},
  \"category\": {\"S\": \"웨이트 머신\"},
  \"brand\": {\"S\": \"GOLGIUS\"},
  \"price\": {\"N\": \"2450000\"},
  \"summary\": {\"S\": \"등 운동의 기본. 100kg 스택, 부드러운 풀리 시스템의 상업용 랫풀다운.\"},
  \"specs\": {\"L\": [
    {\"M\": {\"label\": {\"S\": \"스택\"}, \"value\": {\"S\": \"100kg (5kg 단위)\"}}},
    {\"M\": {\"label\": {\"S\": \"크기\"}, \"value\": {\"S\": \"1200 × 1600 × 2400mm\"}}}
  ]},
  \"images\": {\"L\": []},
  \"featured\": {\"BOOL\": false},
  \"status\": {\"S\": \"active\"},
  \"createdAt\": {\"S\": \"$NOW\"},
  \"updatedAt\": {\"S\": \"$NOW\"}
}"

put "{
  \"id\": {\"S\": \"seed-dumbbell-set\"},
  \"name\": {\"S\": \"우레탄 덤벨 세트 1~50kg\"},
  \"category\": {\"S\": \"액세서리\"},
  \"brand\": {\"S\": \"GOLGIUS\"},
  \"price\": {\"NULL\": true},
  \"summary\": {\"S\": \"1kg 단위 우레탄 덤벨 풀세트 + 3단 랙. 센터 규모에 맞춰 구성 견적.\"},
  \"specs\": {\"L\": [
    {\"M\": {\"label\": {\"S\": \"구성\"}, \"value\": {\"S\": \"1~50kg, 1kg 단위 (50조)\"}}},
    {\"M\": {\"label\": {\"S\": \"재질\"}, \"value\": {\"S\": \"우레탄 코팅 / 스틸 핸들\"}}}
  ]},
  \"images\": {\"L\": []},
  \"featured\": {\"BOOL\": false},
  \"status\": {\"S\": \"active\"},
  \"createdAt\": {\"S\": \"$NOW\"},
  \"updatedAt\": {\"S\": \"$NOW\"}
}"

echo "시드 완료: 4개 상품 → $TABLE"
