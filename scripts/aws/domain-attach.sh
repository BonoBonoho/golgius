#!/usr/bin/env bash
# golgius 도메인 연결(검증 완료 후): ACM 인증서(us-east-1, DNS 검증) → CloudFront 별칭 → Route53 A/AAAA.
# 선행: 도메인이 Route53 호스팅 존에 있어야 함(구매/이관은 콘솔에서 — 결제 자동화 안 함).
# 사용: bash scripts/aws/domain-attach.sh golgius.example.com <CF배포ID>
set -euo pipefail
DOMAIN="${1:?사용법: domain-attach.sh <도메인> <CF배포ID>}"
DIST_ID="${2:?CF 배포 ID 필요}"
CF_HOSTED_ZONE=Z2FDTNDATAQYW2  # CloudFront 고정 존 ID

echo "== [1/6] Route53 존 확인 =="
ZONE=$(aws route53 list-hosted-zones-by-name --dns-name "$DOMAIN" \
  --query "HostedZones[?Name=='${DOMAIN}.'].Id | [0]" --output text | sed 's|/hostedzone/||')
[ -n "$ZONE" ] && [ "$ZONE" != "None" ] || { echo "존 없음 — 도메인 등록/이관 완료 후 재실행"; exit 1; }
echo "  존: $ZONE"

echo "== [2/6] ACM 인증서 요청 (us-east-1) =="
CERT=$(aws acm list-certificates --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='${DOMAIN}'].CertificateArn | [0]" --output text)
if [ -z "$CERT" ] || [ "$CERT" = "None" ]; then
  CERT=$(aws acm request-certificate --region us-east-1 \
    --domain-name "$DOMAIN" --subject-alternative-names "www.${DOMAIN}" \
    --validation-method DNS --query CertificateArn --output text)
  sleep 5
fi
echo "  인증서: $CERT"

echo "== [3/6] DNS 검증 레코드 업서트 =="
aws acm describe-certificate --certificate-arn "$CERT" --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[].ResourceRecord' --output json |
python3 -c "
import sys, json
recs = {(r['Name'], r['Value']) for r in json.load(sys.stdin) if r}
changes = [{'Action':'UPSERT','ResourceRecordSet':{'Name':n,'Type':'CNAME','TTL':300,'ResourceRecords':[{'Value':v}]}} for n,v in recs]
print(json.dumps({'Changes':changes}))
" > /tmp/golg-acm-validation.json
aws route53 change-resource-record-sets --hosted-zone-id "$ZONE" --change-batch file:///tmp/golg-acm-validation.json >/dev/null

echo "== [4/6] 인증서 발급 대기 (DNS 검증, 수 분) =="
aws acm wait certificate-validated --certificate-arn "$CERT" --region us-east-1
echo "  발급 완료"

echo "== [5/6] CloudFront 별칭+인증서 연결 =="
aws cloudfront get-distribution-config --id "$DIST_ID" > /tmp/golg-cf-current.json
python3 - "$DOMAIN" "$CERT" <<'EOF'
import json, sys
domain, cert = sys.argv[1], sys.argv[2]
d = json.load(open('/tmp/golg-cf-current.json'))
cfg = d['DistributionConfig']
cfg['Aliases'] = {'Quantity': 2, 'Items': [domain, f'www.{domain}']}
cfg['ViewerCertificate'] = {
    'ACMCertificateArn': cert,
    'SSLSupportMethod': 'sni-only',
    'MinimumProtocolVersion': 'TLSv1.2_2021',
    'Certificate': cert,
    'CertificateSource': 'acm',
}
open('/tmp/golg-cf-new.json', 'w').write(json.dumps(cfg))
open('/tmp/golg-cf-etag.txt', 'w').write(d['ETag'])
EOF
aws cloudfront update-distribution --id "$DIST_ID" \
  --distribution-config file:///tmp/golg-cf-new.json --if-match "$(cat /tmp/golg-cf-etag.txt)" >/dev/null
echo "  별칭 연결됨: $DOMAIN, www.$DOMAIN"

echo "== [6/6] Route53 A/AAAA 별칭 레코드 =="
CF_DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" --query 'Distribution.DomainName' --output text)
python3 - "$DOMAIN" "$CF_DOMAIN" "$CF_HOSTED_ZONE" <<'EOF' > /tmp/golg-alias-records.json
import json, sys
domain, cf, zone = sys.argv[1], sys.argv[2], sys.argv[3]
changes = []
for name in (domain, f'www.{domain}'):
    for t in ('A', 'AAAA'):
        changes.append({'Action': 'UPSERT', 'ResourceRecordSet': {
            'Name': name, 'Type': t,
            'AliasTarget': {'HostedZoneId': zone, 'DNSName': cf, 'EvaluateTargetHealth': False}}})
print(json.dumps({'Changes': changes}))
EOF
aws route53 change-resource-record-sets --hosted-zone-id "$ZONE" --change-batch file:///tmp/golg-alias-records.json >/dev/null

echo "완료 — CloudFront 전파 후 https://${DOMAIN}"
echo "⚠️ milestone-x.app 서브도메인 병존 시: bash scripts/aws/cert-unify.sh <CF배포ID> 로 3개 SAN 통합 인증서 사용."
echo "⚠️ 이후: (1) 새 도메인 포함해 ALLOWED_ORIGINS 재빌드/재배포, (2) 외부연동 API 소비자·웹훅 URL 갱신."
