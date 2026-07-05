#!/usr/bin/env bash
# 기구 쇼핑몰 인프라(멱등): DynamoDB(상품) + EC2 IAM 인스턴스 프로파일 + CloudFront /media/*.
# - 상품 데이터: DynamoDB golgius-products (온디맨드)
# - 상품 이미지: 기존 S3 golgius-web-624627264933 의 media/products/* (CloudFront OAC 서빙)
# - EC2 는 인스턴스 프로파일로 접근(키를 env 에 넣지 않음). 연결은 무중단.
# 사용: bash scripts/aws/shop-provision.sh
set -euo pipefail
REGION="${AWS_REGION:-ap-northeast-2}"
TABLE=golgius-products
BUCKET=golgius-web-624627264933
DIST_ID=E1PXGQWLU7OP7S
INSTANCE=i-0e8f0108342602704   # 골지어스 EC2 — 이 인스턴스 외 조작 금지
ROLE=golgius-app-role
PROFILE=golgius-app-profile
ACC=$(aws sts get-caller-identity --query Account --output text)

echo "== [1/4] DynamoDB 테이블 ($TABLE, 온디맨드) =="
if aws dynamodb describe-table --table-name "$TABLE" --region "$REGION" >/dev/null 2>&1; then
  echo "  기존 테이블 재사용"
else
  aws dynamodb create-table --table-name "$TABLE" --region "$REGION" \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --tags Key=Project,Value=golgius Key=Name,Value=golgius-products >/dev/null
  aws dynamodb wait table-exists --table-name "$TABLE" --region "$REGION"
  echo "  생성 완료"
fi

echo "== [2/4] IAM 역할·정책·인스턴스 프로파일 =="
if ! aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  aws iam create-role --role-name "$ROLE" --tags Key=Project,Value=golgius \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{ "Effect": "Allow", "Principal": { "Service": "ec2.amazonaws.com" }, "Action": "sts:AssumeRole" }]
    }' >/dev/null
  echo "  역할 생성: $ROLE"
else
  echo "  기존 역할 재사용: $ROLE"
fi

aws iam put-role-policy --role-name "$ROLE" --policy-name golgius-shop \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Action\": [\"dynamodb:GetItem\",\"dynamodb:PutItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Scan\",\"dynamodb:Query\"],
        \"Resource\": \"arn:aws:dynamodb:${REGION}:${ACC}:table/${TABLE}\"
      },
      {
        \"Effect\": \"Allow\",
        \"Action\": [\"s3:PutObject\",\"s3:GetObject\",\"s3:DeleteObject\"],
        \"Resource\": \"arn:aws:s3:::${BUCKET}/media/*\"
      }
    ]
  }"
echo "  정책 갱신: golgius-shop (DynamoDB ${TABLE} + S3 media/*)"

if ! aws iam get-instance-profile --instance-profile-name "$PROFILE" >/dev/null 2>&1; then
  aws iam create-instance-profile --instance-profile-name "$PROFILE" >/dev/null
  sleep 5
fi
if ! aws iam get-instance-profile --instance-profile-name "$PROFILE" \
     --query 'InstanceProfile.Roles[?RoleName==`'"$ROLE"'`]' --output text | grep -q "$ROLE"; then
  aws iam add-role-to-instance-profile --instance-profile-name "$PROFILE" --role-name "$ROLE"
  sleep 5
fi
echo "  인스턴스 프로파일: $PROFILE"

echo "== [3/4] EC2 인스턴스 프로파일 연결 ($INSTANCE) =="
ASSOC=$(aws ec2 describe-iam-instance-profile-associations --region "$REGION" \
  --filters "Name=instance-id,Values=$INSTANCE" "Name=state,Values=associated" \
  --query 'IamInstanceProfileAssociations[0].IamInstanceProfile.Arn' --output text 2>/dev/null || echo None)
if [ "$ASSOC" != "None" ] && echo "$ASSOC" | grep -q "$PROFILE"; then
  echo "  이미 연결됨"
elif [ "$ASSOC" != "None" ] && [ -n "$ASSOC" ]; then
  echo "  ⚠️ 다른 프로파일이 연결돼 있음: $ASSOC — 수동 확인 필요"
  exit 1
else
  aws ec2 associate-iam-instance-profile --region "$REGION" \
    --instance-id "$INSTANCE" --iam-instance-profile Name="$PROFILE" >/dev/null
  echo "  연결 완료 (재부팅 불필요)"
fi

echo "== [4/4] CloudFront /media/* → s3-static 비헤이비어 =="
aws cloudfront get-distribution-config --id "$DIST_ID" > /tmp/golg-shop-cf.json
python3 - <<'EOF'
import json
d = json.load(open('/tmp/golg-shop-cf.json'))
cfg = d['DistributionConfig']
behaviors = cfg.setdefault('CacheBehaviors', {'Quantity': 0, 'Items': []})
items = behaviors.setdefault('Items', [])
if any(b['PathPattern'] == '/media/*' for b in items):
    print('  이미 존재 — 건너뜀')
    open('/tmp/golg-shop-cf-skip.txt', 'w').write('1')
else:
    items.append({
        'PathPattern': '/media/*',
        'TargetOriginId': 's3-static',
        'ViewerProtocolPolicy': 'redirect-to-https',
        'Compress': True,
        'CachePolicyId': '658327ea-f89d-4fab-a63d-7e88639e58f6',
        'AllowedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD'],
                           'CachedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD']}},
        'SmoothStreaming': False,
        'FieldLevelEncryptionId': '',
        'LambdaFunctionAssociations': {'Quantity': 0},
        'FunctionAssociations': {'Quantity': 0},
        'TrustedSigners': {'Enabled': False, 'Quantity': 0},
        'TrustedKeyGroups': {'Enabled': False, 'Quantity': 0},
    })
    behaviors['Quantity'] = len(items)
    open('/tmp/golg-shop-cf-new.json', 'w').write(json.dumps(cfg))
    open('/tmp/golg-shop-cf-etag.txt', 'w').write(d['ETag'])
EOF
if [ ! -f /tmp/golg-shop-cf-skip.txt ]; then
  aws cloudfront update-distribution --id "$DIST_ID" \
    --distribution-config file:///tmp/golg-shop-cf-new.json \
    --if-match "$(cat /tmp/golg-shop-cf-etag.txt)" >/dev/null
  echo "  비헤이비어 추가됨 (전파 수 분)"
fi
rm -f /tmp/golg-shop-cf-skip.txt

echo "완료. 앱 env 에 PRODUCTS_TABLE=$TABLE, MEDIA_BUCKET=$BUCKET 필요(deploy.sh 가 .env 업로드)."
