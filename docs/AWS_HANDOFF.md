# AWS 이전 핸드오프 (Cursor 인계용) — 2026-07-05

골지어스는 **AWS 전용**으로 운영한다. Vercel 미사용(프로젝트 정지·삭제). 시크릿은
`.env.production.local`(gitignore)에 있다.

---

## 1) 라이브 상태

### 골지어스 (Next.js 15 standalone, Server Actions)
- **웹**: https://golgius.biz (주), https://www.golgius.biz, https://golgius.milestone-x.app (병존)
- **CloudFront** `E1PXGQWLU7OP7S` · **S3** `golgius-web-624627264933`
- **서버**: EC2 `i-0e8f0108342602704` (EIP `43.200.50.83`, SG `sg-0120d6d5ad294571b`, ssh `~/.ssh/golgius.pem`)
  - Next standalone: systemd `golgius-app`, `PORT=8787`(loopback), Caddy :80→8787.
- **폴더/브랜치**: `/Users/bonohan/Documents/golgius-aws` → `aws-restore`
- **배포**:
  ```bash
  cd ~/Documents/golgius-aws
  # SSM 터널 배포(공인 IP·22번 포트 불필요) — 첫 인자 = 인스턴스 ID
  bash scripts/aws/deploy.sh i-0e8f0108342602704 golgius-web-624627264933 E1PXGQWLU7OP7S \
    "golgius.biz,www.golgius.biz,golgius.milestone-x.app"
  # 발주 워커: bash scripts/aws/worker-deploy.sh i-0e8f0108342602704
  ```
  ⚠️ `NEXT_PUBLIC_*`·`ALLOWED_ORIGINS`는 빌드시 박힘 → 도메인 바뀌면 재빌드.
- **DB**: 전용 Supabase `dgrdkneddmybkepylpdz` (Milestone과 별개).
- **기구 쇼핑몰**(/gym/shop): 상품은 **DynamoDB `golgius-products`**, 이미지는 S3 `media/products/*`
  (CloudFront `/media/*` 비헤이비어). EC2 는 인스턴스 프로파일 `golgius-app-profile`(역할
  `golgius-app-role`)로 접근 — 키 없음. env: `PRODUCTS_TABLE`, `MEDIA_BUCKET`.
  인프라: `bash scripts/aws/shop-provision.sh`(멱등), 샘플: `shop-seed.sh`. 상품 관리: `/admin/products`.
  견적 요청은 기존 Supabase `orders`(product_type=기구)로 접수.
- **ACM**: 통합 인증서(golgius.biz+www+golgius.milestone-x.app) — `bash scripts/aws/cert-unify.sh`
- **연동**: Milestone `GOLGIUS_API_BASE=https://golgius.biz/api/v1`, golgius `GOLGIUS_WEBHOOK_URL=https://milestone-x.app/api/integrations/golgius`
- **유입 추적**: 문의 폼 `lib/attribution.ts`(UTM·리퍼러 → Supabase leads.source). Vercel Analytics 제거됨.

### Milestone-X (참고 — 별도 저장소)
- 웹/API: https://milestone-x.app (AWS). 상세는 `~/Documents/Milestone-X-debug/docs/AWS_HANDOFF.md`

---

## 2) 이어서 할 일

1. **네이버 CPC 랜딩 URL → golgius.biz** (searchad.naver.com, 보노) — `golgius.vercel.app` 링크 전수 교체.
2. **Vercel golgius 프로젝트 삭제/정지** (보노, Vercel 대시보드) — AWS만 사용.
3. Milestone 스토어·Supabase Site URL 등은 Milestone-X 저장소 HANDOFF 참조.

---

## 3) 함정·주의
- **AWS provision/teardown**: `Name/Project` 태그로만 조작. EC2 `i-0e8f0108342602704` 건드리지 말 것.
- **SSH 접속은 SSM 터널**(공인 IP·22번 포트 불필요). `~/.ssh/config`의 `Host i-* … ProxyCommand aws ssm start-session …` + EC2 역할 `golgius-app-role`에 `AmazonSSMManagedInstanceCore` 부여됨. 배포·수동 SSH 모두 `ubuntu@i-0e8f0108342602704`로. (구방식: IP 인자도 스크립트가 지원하나 그땐 SG 22번에 현재 IP 추가 필요. SSM 정상 동작 확인 후 SG 22번 인바운드 규칙은 정리 권장.)
- **CloudFront→EC2는 http** → Caddy `X-Forwarded-Proto https` (deploy.sh 반영).
- **golgius.biz Route53**: `Z06368082MVHE8PUOST0W`
- **작업 격리**: `golgius-aws@aws-restore`. 커밋 전 브랜치 확인.

---

## 4) 자주 쓰는 명령
```bash
# 재배포
bash scripts/aws/deploy.sh 43.200.50.83 golgius-web-624627264933 E1PXGQWLU7OP7S \
  "golgius.biz,www.golgius.biz,golgius.milestone-x.app"

# SSL(3도메인 통합 cert)
bash scripts/aws/cert-unify.sh E1PXGQWLU7OP7S

# 상태
curl -sS -o /dev/null -w '%{http_code}\n' https://golgius.biz/
ssh -i ~/.ssh/golgius.pem ubuntu@43.200.50.83 'journalctl -u golgius-app -n 30 --no-pager'
```
