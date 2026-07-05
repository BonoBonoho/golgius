# AWS 이전 핸드오프 (Cursor 인계용) — 2026-07-05

Vercel+Supabase → AWS 이전 진행 상황. **Milestone-X와 골지어스 두 프로덕션 서비스**를
AWS로 옮겼다. 아래는 현재 상태 + 이어서 할 일. 시크릿은 각 폴더의 `.env.production.local`
(gitignore됨, 이미 채워짐)에 있다.

---

## 1) 완료 — 라이브 상태

### Milestone-X (Vite SPA + api/ 서버리스 144개)
- **웹**: https://milestone-x.app (S3 `milestone-x-web-milestonex-app` + CloudFront `E27UPWQY0K09HP`)
- **API 서버**: EC2 `i-0f41b4a764f22a333` (EIP `3.38.228.123`, SG `sg-0efc052162732d689`, ssh `~/.ssh/milestone-x.pem`)
  - `server/index.mjs`가 api/ 144라우트를 단일 Node로 서빙. systemd `milestone-api`.
  - 환경: `PORT=8787 FORCE_PROTO=https ENABLE_CRON=1 CRON_PATHS=/api/jobs/process`
- **폴더/브랜치**: `/Users/bonohan/Documents/Milestone-X-debug` → `aws-migration`
- **배포**: `bash scripts/aws/deploy-server.sh 3.38.228.123` (rsync+systemd) / `bash scripts/aws/deploy-frontend.sh milestone-x-web-milestonex-app E27UPWQY0K09HP` (S3+CF무효화)
- **네이티브**: iOS 0.2.167(빌드113) App Store 심사 제출됨(1~3일). Android 107(0.2.167) AAB 빌드됨 — **Play Console 업로드는 수동(보노)**. 경로 `android/app/build/outputs/bundle/release/app-release.aab`
- **회의 요약 파이프라인 복구됨**(jobs/upload 403 회귀 + 크론 시크릿 공백). 실음성 E2E 통과.
- **빈 env 키 복구 완료**: CRON_SECRET(신규발급), R2(파일함), KAKAO_REST_API_KEY, RevenueCat(iOS/Android), GOLGIUS_*(API_BASE/TOKEN/WEBHOOK_SECRET), POPBILL_SECRET_KEY. 전부 실호출 검증.
- **DB/인증/스토리지는 아직 Supabase**(vkqodqllqzexjurwhkyf) — Phase 1~4에서 이관 예정.

### 골지어스 (Next.js 15 standalone, Server Actions)
- **웹**: https://golgius.biz (+ https://golgius.milestone-x.app 병존). CloudFront `E1PXGQWLU7OP7S`, S3 `golgius-web-624627264933`
- **서버**: EC2 `i-0e8f0108342602704` (EIP `43.200.50.83`, SG `sg-0120d6d5ad294571b`, ssh `~/.ssh/golgius.pem`)
  - Next standalone: systemd `golgius-app`, `PORT=8787`(loopback), Caddy :80→8787.
- **폴더/브랜치**: `/Users/bonohan/Documents/golgius-aws` → `aws-restore` (repo BonoBonoho/golgius)
- **배포**: `bash scripts/aws/deploy.sh 43.200.50.83 golgius-web-624627264933 E1PXGQWLU7OP7S "d18kxr0qc24f10.cloudfront.net,golgius.milestone-x.app,golgius.biz,www.golgius.biz"`
  - ⚠️ Next는 `NEXT_PUBLIC_*`·`ALLOWED_ORIGINS`가 빌드시 코드에 박힘 → 도메인 바뀌면 반드시 재빌드.
- **DB**: 전용 Supabase `dgrdkneddmybkepylpdz` (Milestone과 별개).
- **golgius.vercel.app**: 앱 대신 **308 리다이렉트 껍데기**로 교체(`deploy/vercel-redirect/`, Vercel framework=Other). 광고 유입 무중단. → golgius.biz.
- **연동**: Milestone `GOLGIUS_API_BASE=https://golgius.biz/api/v1`, golgius `GOLGIUS_WEBHOOK_URL=https://milestone-x.app/api/integrations/golgius`. pull-sync·API토큰 조회 200 검증.

---

## 2) 이어서 할 일 (우선순위)

### 즉시/단기
1. **Android**: `android/app/build/outputs/bundle/release/app-release.aab`(107) Play Console 업로드→출시 (보노 계정).
2. **iOS**: App Store 심사 결과 대기(승인 시 자동 출시). 거절 사유 오면 대응.
3. **네이버 CPC 광고 랜딩 URL을 golgius.biz로 직접 교체** — 지금은 리다이렉트로 살아있으나 직접 교체가 깔끔·추적 정확.
4. **Supabase Site URL(Milestone)** → https://milestone-x.app (Authentication→URL Configuration, 보노).

### Vercel 정리 (청구 위험 제거)
5. **Milestone Vercel**: 미결제 $3,317 연체 — 5·6월 환불 전례 있으니 서포트에 사고성 과금 환불 요청 병행 후 프로젝트 정지. (배포는 이미 BLOCKED, 서비스는 AWS라 무관.)
6. **골지어스 Vercel**: 광고 URL 다 옮긴 뒤엔 리다이렉트만 남음(거의 무료). 완전 정지하려면 리다이렉트도 죽으니, 광고 유입 0 확인 후 정지.

### Milestone-X Supabase 탈출 (Phase 1~4, 수 주~수개월 — docs/AWS_MIGRATION.md 참조)
7. **Phase 1**: Supabase Postgres → RDS(pgvector) `pg_dump`/`pg_restore`. 서버측 서비스롤 접속만 교체.
8. **Phase 2**: 프론트 `supabase.from(...)` **495곳** → 자체 `/api/db/*` REST. RLS 정책 수십 개 → 서버 미들웨어 권한 이식(**유출 위험, 기능별 보안 리뷰 필수**).
9. **Phase 3**: Supabase Auth → Cognito(구글 IdP + 이메일 OTP). 기존 사용자 이메일 매핑.
10. **Phase 4**: Supabase Storage 3버킷 → S3. Supabase 해지.

---

## 3) 함정·주의 (반드시 지킬 것)
- **vercel env pull은 sensitive 변수를 빈 값("")으로 내림** → 새 env 받으면 `grep '=""' .env` 전수조사 필수.
- **동시 세션 AWS 충돌**: 여러 앱을 같은 계정에 올릴 때 provision/teardown은 **반드시 `Name/Project` 태그로만** 리소스 조작. "전체 terminate", "이름 안 맞는 버킷 삭제" 금지. (Formula X 세션이 골지어스 인프라를 한 번 삭제해 프로덕션 다운시킨 전례.) 건드리면 안 되는 것: Milestone EC2 `i-0f41b4a764f22a333`, 골지어스 EC2 `i-0e8f0108342602704`.
- **IP 바뀌면** 두 SG(위 ID) 22번 포트에 현재 IP 추가해야 ssh 됨: `aws ec2 authorize-security-group-ingress --group-id <SG> --protocol tcp --port 22 --cidr $(curl -s https://checkip.amazonaws.com)/32 --region ap-northeast-2`
- **CloudFront→EC2는 http** → 서버 `FORCE_PROTO=https` 필수(OTA/절대URL http 누수·iOS ATS 차단 방지).
- **OTA zip은 content-type=application/zip 보존** 업로드(deploy-frontend.sh에 반영됨).
- **작업 격리**: 세션마다 전용 워크트리+브랜치. 이 세션 = `Milestone-X-debug@aws-migration`, `golgius-aws@aws-restore`. 커밋 전 브랜치 확인.
- **golgius.biz 도메인**: Route53 존 `Z06368082MVHE8PUOST0W`, ACM(us-east-1) 발급됨.

---

## 4) 자주 쓰는 명령
```bash
# Milestone 서버/프론트 재배포
cd ~/Documents/Milestone-X-debug
bash scripts/aws/deploy-server.sh 3.38.228.123
bash scripts/aws/deploy-frontend.sh milestone-x-web-milestonex-app E27UPWQY0K09HP

# 골지어스 재배포(도메인 바뀌면 ALLOWED_ORIGINS 갱신해 재빌드)
cd ~/Documents/golgius-aws
bash scripts/aws/deploy.sh 43.200.50.83 golgius-web-624627264933 E1PXGQWLU7OP7S "golgius.biz,www.golgius.biz,golgius.milestone-x.app"

# 서버 상태
curl -s https://milestone-x.app/version.json
ssh -i ~/.ssh/milestone-x.pem ubuntu@3.38.228.123 'journalctl -u milestone-api -n 30 --no-pager'
ssh -i ~/.ssh/golgius.pem ubuntu@43.200.50.83 'journalctl -u golgius-app -n 30 --no-pager'
```
