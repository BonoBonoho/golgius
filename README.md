# 골지어스 통합 홈페이지 — Phase 1 (골격 & 디자인 시스템)

단일 도메인 안에서 헬스장(`/gym`)·병원(`/hospital`)을 하나의 소스로 분리 노출하는 Next.js 골격입니다.

## 실행

```bash
npm install
npm run dev
```

- 진입점: <http://localhost:3000> (버티컬 선택)
- 헬스장: <http://localhost:3000/gym>
- 병원: <http://localhost:3000/hospital>

## 스택
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- 폰트: Pretendard(본문) + IBM Plex Mono(영문 라벨)

## 이번 Phase에 포함된 것
- ✅ 디자인 토큰 (`app/globals.css`) — 다크 + 골지어스 골드, 버티컬별 액센트
- ✅ `lib/verticals.ts` — 두 버티컬 콘텐츠/테마를 한 곳에서 관리
- ✅ 공통 레이아웃 / `Header` / `Footer`
- ✅ `VerticalShell` — 런타임에 `--accent` 주입해 버티컬 분기
- ✅ `/gym`·`/hospital` 라우팅 + 히어로 스텁(디자인 시스템 검증용)

## 구조
```
app/
  globals.css        # 디자인 토큰
  layout.tsx
  page.tsx           # 버티컬 선택 진입점
  gym/page.tsx
  hospital/page.tsx
components/
  Header.tsx
  Footer.tsx
  Hero.tsx           # Phase 2에서 확장
  VerticalShell.tsx
lib/
  verticals.ts       # 콘텐츠/테마 단일 소스
```

## 확장 규칙
- 색/폰트/간격은 토큰만 사용 (임의 색 금지)
- 버티컬별 값은 `lib/verticals.ts`에서만 — 컴포넌트 하드코딩 금지
- 다음 단계(Phase 2)에서 `gym/page.tsx`·`hospital/page.tsx`의 주석 위치에
  강점 · 진행 과정 · 실적 · 후기 · 문의 CTA 섹션을 추가합니다.
