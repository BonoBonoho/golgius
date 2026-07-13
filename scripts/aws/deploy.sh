#!/usr/bin/env bash
# golgius 배포(최초 + 재배포 겸용): Next standalone 로컬 빌드 → EC2 rsync(자기완결 번들)
#   + /_next/static → S3. 비공개 저장소라 git clone 대신 로컬 rsync.
# 환경파일 .env.production.local (프로덕션 시크릿, gitignore):
#   · 빌드시  : Next 가 자동 로드 → NEXT_PUBLIC_* 인라인.
#   · 런타임  : EC2 ~/app/.env 로 업로드되어 `node --env-file=.env` 로 로드(민감값 포함).
# t4g.small(2GB) 에서 Next 빌드는 무겁다 → 빌드는 로컬, EC2 엔 standalone 산출물만 전송(npm ci 불필요).
# 사용: bash scripts/aws/deploy.sh <EC2_IP> <S3버킷> [CF배포ID] [ALLOWED_ORIGINS(콤마, 스킴없는 호스트)]
set -euo pipefail
IP="${1:?사용법: deploy.sh <EC2_IP> <버킷> [CF_ID] [ALLOWED_ORIGINS]}"
BUCKET="${2:?S3 버킷 필요}"
CF_ID="${3:-}"
ALLOWED_ORIGINS="${4:-}"
REGION="${AWS_REGION:-ap-northeast-2}"
KEY=~/.ssh/golgius.pem
SSHOPTS=(-i "$KEY" -o StrictHostKeyChecking=accept-new)
SSH="ssh ${SSHOPTS[*]} ubuntu@$IP"

[ -f .env.production.local ] || { echo "⚠️ .env.production.local 없음 — 프로덕션 env 파일 준비 후 재실행"; exit 1; }

echo "== [1/6] 프로덕션 빌드(standalone) =="
export ALLOWED_ORIGINS                 # next.config.mjs 가 process.env 로 읽어 Server Actions 허용목록에 반영
rm -rf .next
npm run build                          # Next 가 .env.production.local 자동 로드(NEXT_PUBLIC_* 인라인)
[ -f .next/standalone/server.js ] || { echo "❌ standalone 산출물 없음 — next.config 의 output:'standalone' 확인"; exit 1; }

echo "== [2/6] standalone 스테이징(static+public 동봉) =="
STAGE=.next/standalone
rm -rf "$STAGE/public" "$STAGE/.next/static"
cp -r public "$STAGE/public"
mkdir -p "$STAGE/.next/static"
cp -r .next/static/. "$STAGE/.next/static/"

echo "== [3/6] Node24/Caddy 설치(멱등) =="
$SSH 'command -v node >/dev/null || (curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - && sudo apt-get install -y nodejs)'
$SSH 'command -v caddy >/dev/null || (sudo apt-get update -qq && sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl >/dev/null && curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | sudo gpg --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg && curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null && sudo apt-get update -qq && sudo apt-get install -y caddy)'

echo "== [4/6] 코드 rsync(자기완결 번들 → ~/app) + .env 업로드 =="
rsync -az --delete -e "ssh ${SSHOPTS[*]}" "$STAGE"/ ubuntu@"$IP":~/app/
scp "${SSHOPTS[@]}" .env.production.local ubuntu@"$IP":~/app/.env   # rsync --delete 뒤에 올려야 유지됨

# resvg 네이티브 바이너리: 맥 빌드 번들엔 darwin만 담김 → EC2(linux-arm64)용을 현장 설치(멱등).
# rsync --delete 가 매번 지우므로 rsync 직후에 실행해야 함.
RESVG_VER=$(node -e "console.log(require('@resvg/resvg-js/package.json').version)")
$SSH "cd ~/app && node -e 'require(\"@resvg/resvg-js\")' 2>/dev/null || npm install --no-save --no-package-lock @resvg/resvg-js-linux-arm64-gnu@$RESVG_VER"

echo "== [5/6] systemd + Caddy =="
$SSH 'sudo tee /etc/systemd/system/golgius-app.service >/dev/null <<EOF
[Unit]
Description=golgius (Next.js standalone)
After=network.target
[Service]
WorkingDirectory=/home/ubuntu/app
ExecStart=/usr/bin/node --env-file=.env server.js
Environment=PORT=8787
Environment=HOSTNAME=127.0.0.1
Environment=NODE_ENV=production
Restart=always
RestartSec=3
User=ubuntu
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload && sudo systemctl enable --now golgius-app >/dev/null 2>&1; sudo systemctl restart golgius-app'
# 공개 트래픽은 전부 https(CloudFront) → Caddy 가 X-Forwarded-Proto=https 고정(참조 FORCE_PROTO 등가).
$SSH 'sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
:80 {
  reverse_proxy 127.0.0.1:8787 {
    header_up X-Forwarded-Proto https
  }
}
EOF
sudo systemctl reload caddy || sudo systemctl restart caddy'

echo "== [6/6] /_next/static → S3(immutable) + 헬스체크 =="
aws s3 sync .next/static "s3://$BUCKET/_next/static" --delete \
  --cache-control "public,max-age=31536000,immutable" --region "$REGION"
if [ -n "$CF_ID" ]; then
  aws cloudfront create-invalidation --distribution-id "$CF_ID" --paths "/_next/static/*" >/dev/null 2>&1 || true
fi
echo "--- EC2 로컬(:8787) ---"; $SSH 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8787/ || true'
echo "--- EC2 공개(:80) ---";  curl -s -m 8 -o /dev/null -w "%{http_code}\n" "http://$IP/" || echo "(80 실패 — SG/Caddy 점검)"
echo "완료. ALLOWED_ORIGINS='${ALLOWED_ORIGINS:-(미설정)}'"
