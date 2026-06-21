# 골지어스 통합 홈페이지 & 리드 관리 시스템 — 기획/기술 스펙

> 이 문서는 Claude Code에 그대로 입력해 단계별로 구현하기 위한 작업 지시서입니다.
> **한 번에 전부 만들지 말고, 아래 Phase 순서대로 진행하세요.** 각 Phase 완료 후 브라우저에서 확인하고 다음으로 넘어갑니다.

---

## 0. 프로젝트 개요

골지어스는 **헬스장**과 **병원** 오픈을 돕는 B2B 컨설팅 회사다.
이 시스템은 단순 홈페이지가 아니라 다음 흐름을 가진 리드 운영 시스템이다.

```
방문자 → 문의 폼 → 자동 알림(이메일/문자/카카오) → 고객 DB 적재
       → CRM 파이프라인(단계 관리) → 단계별 인사이트 → 후속 액션
                                              └→ (확장) 운동복·수건 발주
```

### 핵심 요구사항
1. 병원용 / 헬스장용 홈페이지를 **하나의 소스로 공유하되 분리** 노출 — **단일 도메인 + `/gym`·`/hospital` 경로 방식 (확정)**
2. 문의 시 **이메일 · 문자 · 카카오 알림톡** 자동 발송
3. 문의 데이터로 **고객 DB 확보** + **단계별 인사이트** 제공(가벼운 CRM)
4. (확장) 고객이 **운동복/수건 등을 시안 업로드 → 발주 요청** 하는 기능

---

## 1. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | **Next.js (App Router) + TypeScript** | 공통 컴포넌트 재사용, 두 버티컬 분기, 확장 용이 |
| 스타일 | **Tailwind CSS** | 디자인 토큰 기반 일관성 |
| DB/인증/스토리지 | **Supabase (Postgres)** | 기존 Postgres 경험 활용, 리드 DB + 관리자 인증 + 시안 파일 저장 한 번에 |
| 이메일 | **Resend** (또는 Nodemailer + SMTP) | 트랜잭션 메일 간단 |
| 문자 + 카카오 알림톡 | **Solapi(솔라피)** | SMS/LMS와 알림톡을 같은 API에서 처리 → 알림톡 나중에 끼우기 쉬움 |
| 배포 | **Vercel** | Next.js 친화, 미리보기 배포 |

> 모든 외부 키(Supabase, Resend, Solapi)는 `.env.local`에 두고 절대 코드에 하드코딩하지 않는다.

---

## 2. 버티컬 분리 구조 (병원 vs 헬스장)

**두 개의 프로젝트를 만들지 않는다.** 하나의 앱에서 `vertical` 설정으로 분기한다.

```
/app
  /(site)
    /gym         → 헬스장 랜딩 (vertical = "gym")
    /hospital    → 병원 랜딩   (vertical = "hospital")
  /admin         → 관리자 CRM 대시보드
  /api
    /inquiry     → 문의 접수 API (알림 발송 + DB 적재)
    /order       → 발주 요청 API (Phase 4)
/lib
  /verticals.ts  → 버티컬별 콘텐츠/문구/색 구성 객체
/components
  /sections      → Hero, Strengths, Pricing, CTA 등 공통 섹션 (props로 콘텐츠 주입)
```

`lib/verticals.ts` 예시 형태:

```ts
export const verticals = {
  gym: {
    label: "헬스장",
    hero: { title: "...", sub: "..." },
    strengths: [ ... ],
    accent: "var(--accent-gym)",
  },
  hospital: {
    label: "병원",
    hero: { title: "...", sub: "..." },
    strengths: [ ... ],
    accent: "var(--accent-hospital)",
  },
} as const;
```

→ 같은 `<Hero>` 컴포넌트가 버티컬 객체만 받아서 양쪽을 렌더한다.
→ 추후 도메인 분리(gym.golgius.com / hospital.golgius.com)는 미들웨어로 vertical 매핑만 바꾸면 됨.

---

## 3. 디자인 토큰 (명함 톤 유지)

명함의 다크 키노트 + 골드/러스트 무드를 그대로 가져간다. 임의 색 사용 금지, 토큰만 사용.

```css
:root {
  --bg-base: #0d0d0f;        /* 딥 차콜 */
  --bg-elevated: #1a1a1d;
  --text-primary: #ffffff;
  --text-muted: #a1a1aa;
  --accent: #C8881F;          /* 골지어스 골드/러스트 */
  --accent-gym: #E0892B;      /* 헬스장 강조 */
  --accent-hospital: #2E7DA6; /* 병원 강조(신뢰감 블루) */
  --radius: 16px;
}
```

- 폰트: 한글 **Pretendard** + 영문 산세리프
- 헤딩 굵게, 본문 여백 넉넉히, 섹션 사이 간격 크게
- 명함의 "헬스장 오픈은 골지어스가 가장 많이 해봤습니다" 같은 **실적 카피(40개/월, 1,200+ 누적)** 를 신뢰 섹션으로 활용

---

## 4. 데이터 모델 (Supabase / Postgres)

### `leads` (문의 = 리드)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (pk) | |
| vertical | text | 'gym' \| 'hospital' |
| name | text | 담당자명 |
| phone | text | 연락처 |
| email | text | (선택) |
| region | text | 희망 지역 |
| message | text | 문의 내용 |
| source | text | 유입 경로(직접/검색/광고 등) |
| stage | text | 파이프라인 단계 (아래 enum) |
| assignee | text | 담당자 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**stage enum:** `inquiry`(문의) → `consult`(상담예약) → `quote`(견적발송) → `contract`(계약) → `open`(오픈완료) / `lost`(보류·이탈)

### `lead_events` (단계 이력 — 인사이트의 핵심)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (pk) | |
| lead_id | uuid (fk) | |
| from_stage | text | |
| to_stage | text | |
| note | text | |
| created_at | timestamptz | 단계 전환 시각 |

> 이 테이블이 있어야 **단계별 전환율 / 단계 체류시간** 같은 인사이트를 계산할 수 있다.

### `orders` (발주 요청 — Phase 4)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id, lead_id, vertical | | |
| product_type | text | 운동복/수건/기타 |
| options | jsonb | 색상·사이즈·수량 등 |
| design_file_url | text | Supabase Storage 업로드 시안 |
| status | text | requested → quoted → confirmed → produced |
| created_at | timestamptz | |

---

## 5. 자동 알림 모듈

`/api/inquiry`가 문의를 받으면 순서대로:
1. `leads`에 INSERT (stage='inquiry')
2. **이메일** 발송: (a) 골지어스 담당자에게 알림 (b) 고객에게 접수 확인
3. **문자(SMS/LMS)** 발송: 고객에게 접수 확인 + 담당자에게 신규 리드 알림
4. **카카오 알림톡** 발송: (Phase 3에서 활성화)

알림 발송 로직은 `/lib/notify.ts` 한 곳에 모은다. 채널 추가/제거가 한 파일에서 끝나도록.

```ts
// /lib/notify.ts
export async function notifyNewLead(lead) {
  await Promise.allSettled([
    sendEmail(...),
    sendSms(...),
    // sendAlimtalk(...)  // Phase 3
  ]);
}
```

### ⚠️ 카카오 알림톡 사전 준비 (코드 외 작업, 미리 시작할 것)
- 카카오 비즈니스 채널 개설 → 발신프로필 등록
- **알림톡 템플릿 사전 심사·승인** (영업일 며칠 소요) — 문구에 변수 `#{이름}` 형식
- Solapi에 발신프로필/템플릿 연동
- 승인 전까지는 이메일+문자만 가동, 승인 후 `sendAlimtalk` 한 줄 추가

---

## 6. 관리자 CRM 대시보드 (`/admin`)

Supabase Auth로 로그인(골지어스 내부 직원만).

### 6-1. 리드 보드 (칸반)
- 단계별 컬럼: 문의 / 상담예약 / 견적발송 / 계약 / 오픈완료
- 카드 드래그로 단계 이동 → `lead_events`에 자동 기록
- 카드: 이름·지역·버티컬·경과일

### 6-2. 인사이트 패널 (요구하신 "단계별 액션 인사이트")
- **단계별 전환율**: 문의→상담→견적→계약 각 구간 % (어디서 새는지)
- **단계 체류시간**: 평균 며칠 머무는지 → 정체 구간 발견
- **팔로업 알림**: N일 이상 단계 정체된 리드 자동 하이라이트 + 추천 액션
  - 예: "상담예약 3일 경과 → 리마인드 문자 발송" / "견적발송 5일 무응답 → 콜백"
- **버티컬·유입 채널별 성과** 비교
- 기간 필터, CSV 내보내기

---

## 7. 운동복·수건 발주 기능

> **MVP 범위:** 발주 폼(7-A)까지 포함. 실시간 커스터마이저(7-B)는 출시 직후 패스트팔로우.

### Phase 7-A: 발주 폼 ✅ MVP 포함
- 품목 선택(운동복/수건/기타) → 옵션(색·사이즈·수량) 입력 → 로고/시안 파일 업로드(Supabase Storage) → 견적 요청 제출
- `orders`에 적재, 담당자 알림 발송, 관리자에서 발주 상태 관리
- 가치의 80%를 차지하는 핵심. 1차 출시에 포함.

### Phase 7-B: 실시간 디자인 미리보기 (패스트팔로우)
- 제품 목업 위에 로고 배치·색 변경 미리보기 (canvas/fabric.js 등)
- 작업량이 커서 MVP에 넣으면 전체 일정이 밀림 → 출시 직후 별도 패스로 진행

---

## 8. 구현 순서 (Phase) — 이 순서대로 진행

> **1차 출시(MVP) 범위 = Phase 1 ~ 6 전부.** 알림톡(Phase 5)은 외부 심사 승인 시점에 맞춰 활성화, 커스터마이저(Phase 7)는 출시 직후 패스트팔로우.

- [x] **Phase 1 — 골격 & 디자인 시스템** ⬅ MVP
  Next.js+Tailwind 셋업, 디자인 토큰, `lib/verticals.ts`, 공통 레이아웃/헤더/푸터. 단일 도메인 `/gym`·`/hospital` 라우팅까지.
- [x] **Phase 2 — 랜딩 페이지 (버티컬 2종)** ⬅ MVP
  Hero → 신뢰(실적) → 강점 → (가격/프로세스) → 후기 → 문의 CTA 섹션. 한 컴포넌트 세트로 양쪽 렌더. 모바일 반응형.
- [ ] **Phase 3 — 문의 폼 + DB + 이메일/문자 알림** ⬅ MVP (진행 중)
  Supabase `leads`/`lead_events` 생성, `/api/inquiry`, `/lib/notify.ts`(이메일·문자), 폼 검증.
- [x] **Phase 4 — 관리자 CRM** ⬅ MVP (코어 완료)
  `/admin` 칸반 보드(단계 이동 버튼 → `lead_events` 기록), 인사이트 패널(퍼널 전환율·정체 리드·분야/유입), 기간 필터, CSV 내보내기.
  ※ 인증은 현재 단일 비밀번호 유지(스펙의 Supabase Auth 다중직원은 보류). 단계 이동은 DnD 대신 버튼(모바일·안정성). 둘 다 추후 보강 가능.
- [ ] **Phase 5 — 카카오 알림톡** ⬅ MVP (외부 승인 게이트)
  채널·템플릿 승인 완료 후 `sendAlimtalk` 추가. 승인 전엔 이메일+문자만으로 출시 후 끼워넣기.
- [x] **Phase 6 — 발주 폼 (7-A)** ⬅ MVP (완료)
  `/order` 발주 폼(품목·옵션·시안 업로드) → `/api/order` → `orders` 적재 + Supabase Storage(order-files 비공개 버킷) + 담당자 알림(notifyNewOrder). `/admin/orders`에서 상태(접수→견적→확정→제작) 관리 + 서명 URL로 시안 조회.
- [x] **Phase 7 — 디자인 미리보기 (7-B)** (완료)
  `/order/design` 디자인 스튜디오 — 면별(티셔츠 앞/뒤, 바지, 수건) 독립 디자인, 색상·로고 업로드·드래그 배치·크기 조정 실시간 미리보기. 제출 시 디자인한 면들을 한 장의 캔버스 합성 PNG로 합쳐 발주 시안으로 첨부(의존성 없이 순수 React+Canvas).

---

## 9. Claude Code 작업 규칙 (중요)
1. **한 Phase씩만** 작업하고 끝나면 멈춰서 확인 요청.
2. 색/간격/폰트는 **3장의 디자인 토큰만** 사용. 임의 색 금지.
3. 외부 키는 `.env.local`. 코드/깃에 절대 노출 금지.
4. 컴포넌트는 props로 콘텐츠 주입 — 버티컬별 하드코딩 금지(verticals 객체에서만).
5. 알림 채널은 `/lib/notify.ts`에만 둔다.
6. 각 Phase 후 모바일 반응형 확인.
7. 막히면 임의 가정 말고 질문할 것.

---

## 10. 미리 결정·준비가 필요한 것 (사람이 할 일)
- [x] 도메인 — **단일 도메인 + `/gym`·`/hospital` 경로 (확정).** 서브도메인 분리는 추후 미들웨어로 전환 가능
- [ ] Supabase 프로젝트 생성, Resend·Solapi 계정/키 발급
- [ ] **카카오 비즈니스 채널 + 알림톡 템플릿 심사 신청** (가장 오래 걸림 — 지금 시작)
- [ ] 버티컬별 카피/실적 수치/후기 텍스트, 발주 가능 품목 목록
- [ ] 관리자 계정에 들어갈 직원 이메일

---

## 구현 메모 (현재까지 / 스펙과의 차이)
- 저장소: 현재 Supabase Postgres(PostgREST, `lib/leads.ts`) + 로컬 메모리 폴백.
- 어드민: 현재 단일 비밀번호(`ADMIN_PASSWORD`) 보호 + 읽기 전용 표. **Phase 4에서 Supabase Auth + 칸반/인사이트로 확장 예정.**
- 문의 접수: 현재 Server Action `submitContact`(스펙의 `/api/inquiry`와 기능 동일). 필요 시 라우트로 정리.
- 알림: `lib/notify.ts` 구축, Resend/Solapi 키 미설정 시 무동작(no-op) — 키 추가 시 자동 발송.
