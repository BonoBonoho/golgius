#!/usr/bin/env bash
# golgius AWS 프로비저닝 (Vercel→AWS 이전): EC2(t4g.small) + S3(정적) + (선택)Route53.
# golgius 는 Next.js App Router 라 '앱 전체를 EC2 에서 실행'(Next standalone) + CloudFront 앞단.
# S3 는 /_next/static 오프로드용(정적 자산). 참조: Milestone-X scripts/aws (SPA+api 분리형)를
# Next-on-EC2 형태로 이식.
# 사전: aws(default 프로필=IAM bono-cli, ap-northeast-2). 도메인은 이후 단계(cloudfront.net 먼저 검증).
# 사용: bash scripts/aws/provision.sh                       # 도메인 없이(권장, 먼저 검증)
#       bash scripts/aws/provision.sh golgius.example.com   # 도메인 지정시 Route53 존 확인까지
set -euo pipefail

DOMAIN="${1:-}"
REGION="${AWS_REGION:-ap-northeast-2}"
APP=golgius
ACC=$(aws sts get-caller-identity --query Account --output text)

echo "== [1/6] 키페어 =="
if ! aws ec2 describe-key-pairs --key-names "$APP" --region "$REGION" >/dev/null 2>&1; then
  aws ec2 create-key-pair --key-name "$APP" --region "$REGION" \
    --query 'KeyMaterial' --output text > ~/.ssh/${APP}.pem
  chmod 600 ~/.ssh/${APP}.pem
  echo "  키 저장: ~/.ssh/${APP}.pem"
else
  echo "  기존 키페어 재사용: $APP"
fi

echo "== [2/6] 보안그룹 (22 내IP · 80/443 공개, 8787 미개방) =="
VPC=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --region "$REGION" --query 'Vpcs[0].VpcId' --output text)
SG=$(aws ec2 describe-security-groups --filters Name=group-name,Values=${APP}-web Name=vpc-id,Values=$VPC --region "$REGION" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo None)
if [ "$SG" = "None" ] || [ -z "$SG" ]; then
  SG=$(aws ec2 create-security-group --group-name ${APP}-web --description "$APP web" --vpc-id "$VPC" --region "$REGION" --query 'GroupId' --output text)
  MYIP=$(curl -s https://checkip.amazonaws.com)/32
  aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port 22 --cidr "$MYIP" --region "$REGION"
  aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "$REGION"
  aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port 443 --cidr 0.0.0.0/0 --region "$REGION"
fi
echo "  SG: $SG   (Next 8787 은 loopback 전용 — 미개방)"

echo "== [3/6] EC2 t4g.small (ARM, Ubuntu 24.04, 20GB gp3) =="
AMI=$(aws ssm get-parameter --name /aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id --region "$REGION" --query 'Parameter.Value' --output text)
INSTANCE=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=${APP}-app" "Name=instance-state-name,Values=running,pending" --region "$REGION" --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null || echo None)
if [ "$INSTANCE" = "None" ] || [ -z "$INSTANCE" ]; then
  INSTANCE=$(aws ec2 run-instances --image-id "$AMI" --instance-type t4g.small \
    --key-name "$APP" --security-group-ids "$SG" --region "$REGION" \
    --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${APP}-app}]" \
    --query 'Instances[0].InstanceId' --output text)
  aws ec2 wait instance-running --instance-ids "$INSTANCE" --region "$REGION"
fi
EIP=$(aws ec2 describe-addresses --filters "Name=tag:Name,Values=${APP}-app" --region "$REGION" --query 'Addresses[0].PublicIp' --output text 2>/dev/null || echo None)
if [ "$EIP" = "None" ] || [ -z "$EIP" ]; then
  ALLOC=$(aws ec2 allocate-address --domain vpc --region "$REGION" --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=${APP}-app}]" --query 'AllocationId' --output text)
  aws ec2 associate-address --instance-id "$INSTANCE" --allocation-id "$ALLOC" --region "$REGION"
  EIP=$(aws ec2 describe-addresses --allocation-ids "$ALLOC" --region "$REGION" --query 'Addresses[0].PublicIp' --output text)
fi
# CloudFront 오리진은 IP 불가 → EC2 퍼블릭 DNS 사용(EIP 연결 후에도 DNS 는 안정).
EC2_DNS=$(aws ec2 describe-instances --instance-ids "$INSTANCE" --region "$REGION" --query 'Reservations[0].Instances[0].PublicDnsName' --output text)
echo "  EC2: $INSTANCE   IP(EIP): $EIP   DNS: $EC2_DNS"

echo "== [4/6] S3 (정적 /_next/static 오프로드, 퍼블릭 차단) =="
BUCKET="${APP}-web-${ACC}"
aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null || aws s3 mb "s3://$BUCKET" --region "$REGION"
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
echo "  버킷: $BUCKET (CloudFront OAC 로만 접근)"

echo "== [5/6] Route53 존 (도메인 지정시만) =="
if [ -n "$DOMAIN" ]; then
  ZONE=$(aws route53 list-hosted-zones-by-name --dns-name "$DOMAIN" --query "HostedZones[?Name=='${DOMAIN}.'].Id | [0]" --output text | sed 's|/hostedzone/||' || echo None)
  if [ "$ZONE" = "None" ] || [ -z "$ZONE" ]; then
    echo "  ⚠️ 존 없음 — 도메인 등록/이관 후 domain-attach.sh 실행"
  else
    echo "  존: $ZONE"
  fi
else
  echo "  (도메인 미지정 — *.cloudfront.net 으로 먼저 전 기능 검증)"
fi

echo "== [6/6] 다음 단계 =="
cat <<EOF
  EC2_DNS=$EC2_DNS
  BUCKET=$BUCKET
  EIP=$EIP
  1) CloudFront 생성:  bash scripts/aws/cloudfront.sh "$BUCKET" "$EC2_DNS"
  2) 앱 배포:          bash scripts/aws/deploy.sh "$EIP" "$BUCKET" <CF_ID> <CF도메인>
  3) (도메인 확보후)   bash scripts/aws/domain-attach.sh <도메인> <CF_ID>
EOF
