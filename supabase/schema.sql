-- 골지어스 문의 접수 테이블.
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  message     text not null default '',
  vertical    text not null check (vertical in ('gym', 'hospital')),
  created_at  timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- RLS 활성화: 정책을 추가하지 않으면 익명/anon 키로는 접근 불가.
-- 서버는 service_role 키로 접근하므로 RLS를 우회한다(안전).
alter table public.leads enable row level security;
