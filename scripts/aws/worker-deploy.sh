#!/usr/bin/env bash
# 성원애드피아 발주 워커 배포: worker/ → EC2 ~/worker + Playwright Chromium + systemd.
# deploy.sh(앱)와 독립 — 앱 배포와 무관하게 워커만 갱신 가능.
#
# 준비물:
#   · worker/.env.production   (로컬, gitignore) — worker/.env.example 참고해 작성
#     SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SWADPIA_ID / SWADPIA_PW / ANTHROPIC_API_KEY
# 접속: SSM 터널(SSH over SSM) — 공인 IP·22번 포트 불필요(~/.ssh/config의 Host i-* 처리).
# 사용: bash scripts/aws/worker-deploy.sh <EC2_INSTANCE_ID(i-...) 또는 IP>
set -euo pipefail
TARGET="${1:?사용법: worker-deploy.sh <i-인스턴스ID 또는 IP>}"
KEY=~/.ssh/golgius.pem
case "$TARGET" in
  i-*) SSHOPTS=(-o StrictHostKeyChecking=accept-new) ;;
  *)   SSHOPTS=(-i "$KEY" -o StrictHostKeyChecking=accept-new) ;;
esac
SSH="ssh ${SSHOPTS[*]} ubuntu@$TARGET"

[ -f worker/.env.production ] || { echo "⚠️ worker/.env.production 없음 — worker/.env.example 참고해 작성 후 재실행"; exit 1; }

echo "== [1/5] 소스 rsync (node_modules 제외 — EC2에서 npm ci) =="
rsync -az --delete \
  --exclude node_modules --exclude .env --exclude .env.production \
  -e "ssh ${SSHOPTS[*]}" worker/ ubuntu@"$TARGET":~/worker/
scp "${SSHOPTS[@]}" worker/.env.production ubuntu@"$TARGET":~/worker/.env
$SSH 'chmod 600 ~/worker/.env'

echo "== [2/5] swap 2GB (멱등 — t4g.small에서 Chromium 여유) =="
$SSH 'if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile >/dev/null && sudo swapon /swapfile
  grep -q "/swapfile" /etc/fstab || echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab >/dev/null
fi'

echo "== [3/5] npm ci + Playwright Chromium(멱등) =="
$SSH 'cd ~/worker && npm ci --omit=dev 2>/dev/null || npm install'
$SSH 'cd ~/worker && npx playwright install --with-deps chromium'

echo "== [4/5] systemd 유닛 =="
$SSH 'sudo tee /etc/systemd/system/golgius-adpia-worker.service >/dev/null <<EOF
[Unit]
Description=golgius adpia order worker (Playwright)
After=network.target
[Service]
WorkingDirectory=/home/ubuntu/worker
ExecStart=/usr/bin/npx tsx index.ts
EnvironmentFile=/home/ubuntu/worker/.env
Environment=NODE_ENV=production
Restart=always
RestartSec=10
User=ubuntu
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload && sudo systemctl enable --now golgius-adpia-worker >/dev/null 2>&1; sudo systemctl restart golgius-adpia-worker'

echo "== [5/5] 상태 확인 =="
sleep 3
$SSH 'systemctl is-active golgius-adpia-worker && journalctl -u golgius-adpia-worker -n 5 --no-pager'
echo "완료. 로그: ssh ... journalctl -u golgius-adpia-worker -f"
