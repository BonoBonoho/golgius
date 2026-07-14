# 골지어스 배포 가이드

SSM Session Manager 터널로 접속 → 공인 IP·22번 포트 불필요. 어디서든 아래 명령 그대로 사용.
인스턴스 ID: `i-0e8f0108342602704` (리전 ap-northeast-2)

---

## 1. 앱 배포 (golgius.biz — 명함 AI 포함 사이트)

```bash
cd ~/Documents/golgius-aws
bash scripts/aws/deploy.sh i-0e8f0108342602704 golgius-web-624627264933 E1PXGQWLU7OP7S "golgius.biz,www.golgius.biz,golgius.milestone-x.app"
```

- 로컬 빌드 → SSM 터널로 EC2 전송 → 재시작 → S3/CloudFront 갱신까지 자동
- 끝에 `--- 공개(https) --- 200` 나오면 성공
- 전제: `~/Documents/golgius-aws/.env.production.local` 존재 (ANTHROPIC_API_KEY 포함)

## 2. 발주 워커 배포 (성원애드피아 자동 발주)

```bash
cd ~/Documents/golgius-aws
bash scripts/aws/worker-deploy.sh i-0e8f0108342602704
```

- 끝에 `active` 나오면 성공
- 전제: `~/Documents/golgius-aws/worker/.env.production` 존재 (성원애드피아 계정 포함)

---

## 3. 코드 수정 후 재배포 (전체 흐름)

```bash
# (1) 작업 폴더에서 커밋 & main 반영
cd "/Users/bonohan/Library/CloudStorage/OneDrive-개인/01.개발 프로젝트/03.golgius"
git add -A && git commit -m "수정 내용" && git push origin main

# (2) 배포 폴더를 최신 main으로 동기화
git -C ~/Documents/golgius-aws pull --ff-only origin main

# (3) 배포
#   앱 코드(app/ components/ lib/) 수정 → 1번 명령
#   워커 코드(worker/) 수정        → 2번 명령
#   둘 다 수정                     → 둘 다
```

---

## 참고 명령

```bash
# 워커 로그 실시간
ssh ubuntu@i-0e8f0108342602704 'journalctl -u golgius-adpia-worker -f'

# 앱 로그 실시간
ssh ubuntu@i-0e8f0108342602704 'journalctl -u golgius-app -f'

# 서버 수동 접속
ssh ubuntu@i-0e8f0108342602704
```

(로그 보기는 Ctrl+C로 빠져나옴)

---

## 주의

- `.env.production.local`(앱)·`worker/.env.production`(워커)은 gitignore → **배포 폴더에만 있고 git 미포함**.
  다른 컴퓨터에서 배포하려면 이 두 파일을 따로 복사해와야 함.
- `NEXT_PUBLIC_*`·`ALLOWED_ORIGINS`는 빌드 시 코드에 박힘 → 도메인 바뀌면 앱 재배포 필요.
- SSM 사전 구성(1회, 완료됨): EC2 역할 `golgius-app-role`에 `AmazonSSMManagedInstanceCore`,
  로컬 `session-manager-plugin`, `~/.ssh/config`의 `Host i-* mi-*` ProxyCommand.
