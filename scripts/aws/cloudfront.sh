#!/usr/bin/env bash
# golgius CloudFront: 기본 오리진=EC2(Next 서버 전체) + /_next/static/*=S3(OAC 오프로드).
# Next 는 SPA 가 아니므로 SPA 폴백 CloudFront Function 없음 — 라우팅/404 는 Next 가 처리.
# 동적(SSR·Server Actions·/api)은 캐시 안 함(CachingDisabled) + 모든 뷰어 헤더 전달
# (AllViewer: Host 포함 → Next Server Actions 의 Origin/Host 교차검증 통과).
# 커스텀 도메인 없이 *.cloudfront.net 으로 먼저 생성 → 검증 후 domain-attach.sh 로 별칭+ACM.
# 사용: bash scripts/aws/cloudfront.sh <S3버킷> <EC2_공개DNS>
set -euo pipefail
BUCKET="${1:?사용법: cloudfront.sh <버킷> <EC2_DNS>}"
EC2_DNS="${2:?EC2 공개 DNS 필요 (IP 불가)}"
REGION="${AWS_REGION:-ap-northeast-2}"
ACC=$(aws sts get-caller-identity --query Account --output text)

echo "== [1/4] Origin Access Control (S3용) =="
OAC_ID=$(aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='golgius-oac'].Id | [0]" --output text)
if [ "$OAC_ID" = "None" ] || [ -z "$OAC_ID" ]; then
  OAC_ID=$(aws cloudfront create-origin-access-control --origin-access-control-config \
    Name=golgius-oac,OriginAccessControlOriginType=s3,SigningBehavior=always,SigningProtocol=sigv4 \
    --query 'OriginAccessControl.Id' --output text)
fi
echo "  OAC: $OAC_ID"

echo "== [2/4] 배포 생성 (기본=EC2, /_next/static/*=S3) =="
# CachePolicyId: 4135ea2d…=CachingDisabled(동적), 658327ea…=CachingOptimized(정적)
# OriginRequestPolicyId: 216adef6…=AllViewer(Host 등 전 뷰어헤더 전달)
cat > /tmp/golg-cf.json <<EOF
{
  "CallerReference": "golgius-$(date +%s)",
  "Comment": "golgius web (Next on EC2) + S3 static",
  "Enabled": true,
  "HttpVersion": "http2and3",
  "PriceClass": "PriceClass_200",
  "Origins": { "Quantity": 2, "Items": [
    {
      "Id": "ec2-app",
      "DomainName": "${EC2_DNS}",
      "CustomOriginConfig": {
        "HTTPPort": 80, "HTTPSPort": 443,
        "OriginProtocolPolicy": "http-only",
        "OriginReadTimeout": 60, "OriginKeepaliveTimeout": 30,
        "OriginSslProtocols": { "Quantity": 1, "Items": ["TLSv1.2"] }
      }
    },
    {
      "Id": "s3-static",
      "DomainName": "${BUCKET}.s3.${REGION}.amazonaws.com",
      "OriginAccessControlId": "${OAC_ID}",
      "S3OriginConfig": { "OriginAccessIdentity": "" }
    }
  ]},
  "DefaultCacheBehavior": {
    "TargetOriginId": "ec2-app",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "OriginRequestPolicyId": "216adef6-5c7f-47e4-b989-5492eafa07d3",
    "AllowedMethods": { "Quantity": 7,
      "Items": ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"],
      "CachedMethods": { "Quantity": 2, "Items": ["GET","HEAD"] } }
  },
  "CacheBehaviors": { "Quantity": 1, "Items": [
    {
      "PathPattern": "/_next/static/*",
      "TargetOriginId": "s3-static",
      "ViewerProtocolPolicy": "redirect-to-https",
      "Compress": true,
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
      "AllowedMethods": { "Quantity": 2, "Items": ["GET","HEAD"],
        "CachedMethods": { "Quantity": 2, "Items": ["GET","HEAD"] } }
    }
  ]}
}
EOF
DIST_JSON=$(aws cloudfront create-distribution --distribution-config file:///tmp/golg-cf.json)
DIST_ID=$(echo "$DIST_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin)['Distribution']['Id'])")
DIST_DOMAIN=$(echo "$DIST_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin)['Distribution']['DomainName'])")
echo "  배포: $DIST_ID → https://$DIST_DOMAIN"

echo "== [3/4] S3 버킷 정책 (해당 배포만 읽기 허용) =="
cat > /tmp/golg-bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::${BUCKET}/*",
    "Condition": { "StringEquals": {
      "AWS:SourceArn": "arn:aws:cloudfront::${ACC}:distribution/${DIST_ID}" } }
  }]
}
EOF
aws s3api put-bucket-policy --bucket "$BUCKET" --policy file:///tmp/golg-bucket-policy.json

echo "== [4/4] 완료 — 전파 대기(수 분) =="
echo "DIST_ID=$DIST_ID"
echo "CF_DOMAIN=$DIST_DOMAIN"
echo "→ 배포시 ALLOWED_ORIGINS 에 '$DIST_DOMAIN' 포함해 빌드할 것(Server Actions 신뢰):"
echo "   bash scripts/aws/deploy.sh <EIP> $BUCKET $DIST_ID $DIST_DOMAIN"
