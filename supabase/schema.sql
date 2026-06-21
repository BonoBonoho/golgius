-- 골지어스 리드 스키마. Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- 신규/기존 모두 안전(IF NOT EXISTS / ADD COLUMN IF NOT EXISTS) — 여러 번 실행해도 됨.

-- ── leads (문의 = 리드) ─────────────────────────────────
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  vertical    text not null check (vertical in ('gym', 'hospital')),
  name        text not null,
  phone       text not null,
  email       text,
  region      text,
  message     text not null default '',
  source      text not null default 'direct',
  stage       text not null default 'inquiry'
              check (stage in ('inquiry','consult','quote','contract','open','lost')),
  assignee    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 기존(Phase 3 이전) 최소 테이블에 컬럼 보강
alter table public.leads add column if not exists email      text;
alter table public.leads add column if not exists region     text;
alter table public.leads add column if not exists source     text not null default 'direct';
alter table public.leads add column if not exists stage      text not null default 'inquiry';
alter table public.leads add column if not exists assignee   text;
alter table public.leads add column if not exists updated_at timestamptz not null default now();

-- stage 체크 제약 (없으면 추가)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_stage_check'
  ) then
    alter table public.leads
      add constraint leads_stage_check
      check (stage in ('inquiry','consult','quote','contract','open','lost'));
  end if;
end $$;

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_stage_idx on public.leads (stage);

-- ── lead_events (단계 이력 — 인사이트의 핵심) ───────────
create table if not exists public.lead_events (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  from_stage  text,
  to_stage    text not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists lead_events_lead_id_idx on public.lead_events (lead_id);

-- ── app_settings (어드민에서 관리하는 키/설정 key-value) ─
-- 알림 키(Resend/Solapi)·수신처 등을 여기 저장해 어드민에서 수정.
-- ⚠️ 평문 저장이므로 service_role(서버)로만 접근, anon 노출 금지.
create table if not exists public.app_settings (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz not null default now()
);

-- ── orders (발주 요청) ──────────────────────────────────
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references public.leads(id) on delete set null,
  vertical      text check (vertical in ('gym', 'hospital')),
  name          text not null,
  phone         text not null,
  email         text,
  product_type  text not null,
  options       jsonb not null default '{}'::jsonb,  -- {color,size,quantity}
  design_file   text,                                 -- storage 객체 경로(bucket: order-files)
  message       text not null default '',
  status        text not null default 'requested'
                check (status in ('requested','quoted','confirmed','produced','canceled')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

-- 시안 파일 비공개 버킷 (서버는 service_role로 업로드/서명 URL 생성)
insert into storage.buckets (id, name, public)
values ('order-files', 'order-files', false)
on conflict (id) do nothing;

-- ── RLS ─────────────────────────────────────────────────
-- 정책 없음 = anon 키 접근 불가. 서버는 service_role 키로 RLS 우회(안전).
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.app_settings enable row level security;
alter table public.orders enable row level security;
