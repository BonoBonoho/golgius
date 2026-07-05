#!/usr/bin/env bash
# golgius CloudFront 별칭 3개(golgius.biz, www.golgius.biz, golgius.milestone-x.app)용
# 통합 ACM 인증서 발급 → DNS 검증 → CloudFront E1PXGQWLU7OP7S 인증서 교체.
# domain-attach.sh 는 golgius.biz 전용 cert 만 붙여 milestone-x.app SAN 이 빠진 상태가 됨.
# 사용: bash scripts/aws/cert-unify.sh [CF배포ID]
set -euo pipefail
DIST_ID="${1:-E1PXGQWLU7OP7S}"
ZONE_BIZ=Z06368082MVHE8PUOST0W
ZONE_MX=Z01919352WC0C5ZQLMOWI

echo "== [1/5] 통합 ACM 인증서 요청 (us-east-1) =="
EXIST=$(aws acm list-certificates --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='golgius.biz' && contains(SubjectAlternativeNameSummaries, 'golgius.milestone-x.app')].CertificateArn | [0]" \
  --output text 2>/dev/null || true)
if [ -n "$EXIST" ] && [ "$EXIST" != "None" ]; then
  CERT="$EXIST"
  echo "  기존 통합 인증서 재사용: $CERT"
else
  CERT=$(aws acm request-certificate --region us-east-1 \
    --domain-name golgius.biz \
    --subject-alternative-names www.golgius.biz golgius.milestone-x.app \
    --validation-method DNS \
    --query CertificateArn --output text)
  echo "  신규 요청: $CERT"
fi

echo "== [2/5] DNS 검증 레코드 업서트 =="
aws acm describe-certificate --certificate-arn "$CERT" --region us-east-1 \
  --query 'Certificate.DomainValidationOptions' --output json > /tmp/golg-cert-dvo.json

python3 - "$ZONE_BIZ" "$ZONE_MX" <<'EOF'
import json, subprocess, sys
zone_biz, zone_mx = sys.argv[1], sys.argv[2]
dvos = json.load(open('/tmp/golg-cert-dvo.json'))
by_zone = {}
for d in dvos:
    rr = d.get('ResourceRecord')
    if not rr:
        continue
    dom = d['DomainName']
    if dom.endswith('golgius.biz') or dom == 'www.golgius.biz':
        zone = zone_biz
    elif dom.endswith('milestone-x.app'):
        zone = zone_mx
    else:
        zone = zone_biz
    by_zone.setdefault(zone, set()).add((rr['Name'], rr['Value']))
for zone, recs in by_zone.items():
    changes = [{'Action': 'UPSERT', 'ResourceRecordSet': {
        'Name': n, 'Type': 'CNAME', 'TTL': 300, 'ResourceRecords': [{'Value': v}]
    }} for n, v in recs]
    batch = {'Changes': changes}
    path = f'/tmp/golg-acm-{zone}.json'
    open(path, 'w').write(json.dumps(batch))
    subprocess.run(['aws', 'route53', 'change-resource-record-sets',
                    '--hosted-zone-id', zone, '--change-batch', f'file://{path}'],
                   check=True, capture_output=True)
    print(f'  검증 CNAME {len(changes)}건 → zone {zone}')
EOF

echo "== [3/5] 인증서 발급 대기 =="
aws acm wait certificate-validated --certificate-arn "$CERT" --region us-east-1
echo "  발급 완료"

echo "== [4/5] CloudFront 인증서 교체 (별칭 3개 유지) =="
aws cloudfront get-distribution-config --id "$DIST_ID" > /tmp/golg-cf-current.json
python3 - "$CERT" <<'EOF'
import json, sys
cert = sys.argv[1]
d = json.load(open('/tmp/golg-cf-current.json'))
cfg = d['DistributionConfig']
cfg['Aliases'] = {
    'Quantity': 3,
    'Items': ['golgius.biz', 'www.golgius.biz', 'golgius.milestone-x.app'],
}
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
  --distribution-config file:///tmp/golg-cf-new.json \
  --if-match "$(cat /tmp/golg-cf-etag.txt)" >/dev/null
echo "  CloudFront $DIST_ID 인증서 교체 요청됨 (전파 수 분)"

echo "== [5/5] 완료 =="
echo "CERT_ARN=$CERT"
echo "검증: curl -sS -o /dev/null -w '%{http_code}' https://golgius.milestone-x.app/"
