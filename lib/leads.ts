// 문의 접수(리드) 저장소.
// 운영(Vercel): Supabase Postgres 테이블에 영구 저장 (PostgREST REST API).
// 로컬/미설정: 메모리 폴백 — 서버 재시작 시 사라짐(테스트용).
//
// 필요한 환경변수:
//   NEXT_PUBLIC_SUPABASE_URL      Supabase 프로젝트 URL
//   SUPABASE_SERVICE_ROLE_KEY     서버 전용 키(RLS 우회, 절대 클라이언트 노출 금지)
//
// 테이블(public.leads, public.lead_events) 생성 SQL은 supabase/schema.sql 참고.

import type { VerticalKey } from "@/lib/verticals";

export type Stage =
  | "inquiry"
  | "consult"
  | "quote"
  | "contract"
  | "open"
  | "lost";

export interface Lead {
  id: string;
  vertical: VerticalKey;
  name: string;
  phone: string;
  email: string;
  region: string;
  message: string;
  source: string;
  stage: Stage;
  assignee: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// 폼에서 새 리드 생성 시 받는 입력
export type NewLead = {
  vertical: VerticalKey;
  name: string;
  phone: string;
  email?: string;
  region?: string;
  message?: string;
  source?: string;
};

const TABLE = "leads";
const EVENTS = "lead_events";

// 파이프라인 단계 순서 ('lost'는 별도)
export const PIPELINE: Stage[] = ["inquiry", "consult", "quote", "contract", "open"];

function supabaseEnv() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

function headers(key: string, extra: Record<string, string> = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

const STAGES: Stage[] = ["inquiry", "consult", "quote", "contract", "open", "lost"];

// DB row(snake_case) → Lead
function toLead(r: Record<string, unknown>): Lead {
  const stage = STAGES.includes(r.stage as Stage) ? (r.stage as Stage) : "inquiry";
  return {
    id: String(r.id),
    vertical: (r.vertical === "hospital" ? "hospital" : "gym") as VerticalKey,
    name: String(r.name ?? ""),
    phone: String(r.phone ?? ""),
    email: String(r.email ?? ""),
    region: String(r.region ?? ""),
    message: String(r.message ?? ""),
    source: String(r.source ?? "direct"),
    stage,
    assignee: String(r.assignee ?? ""),
    createdAt: String(r.created_at ?? new Date().toISOString()),
    updatedAt: String(r.updated_at ?? r.created_at ?? new Date().toISOString()),
  };
}

// ── 메모리 폴백 (dev) ── 핫리로드에도 유지되도록 globalThis에 보관
const mem: Lead[] = ((globalThis as Record<string, unknown>).__golgiusLeads ??=
  []) as Lead[];

export function isPersistent(): boolean {
  return supabaseEnv() !== null;
}

export async function addLead(input: NewLead): Promise<Lead> {
  const env = supabaseEnv();

  if (env) {
    const res = await fetch(`${env.url}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: headers(env.key, { Prefer: "return=representation" }),
      body: JSON.stringify({
        vertical: input.vertical,
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        region: input.region ?? null,
        message: input.message ?? "",
        source: input.source ?? "direct",
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`supabase insert ${res.status}`);
    const rows = (await res.json()) as Record<string, unknown>[];
    const lead = toLead(rows[0]);
    // 단계 이력 첫 기록(인사이트용) — 실패해도 접수는 성공으로 둔다
    void recordEvent(env, lead.id, null, "inquiry", "문의 접수");
    return lead;
  }

  // 폴백: 메모리
  const now = new Date().toISOString();
  const lead: Lead = {
    id: crypto.randomUUID(),
    vertical: input.vertical,
    name: input.name,
    phone: input.phone,
    email: input.email ?? "",
    region: input.region ?? "",
    message: input.message ?? "",
    source: input.source ?? "direct",
    stage: "inquiry",
    assignee: "",
    createdAt: now,
    updatedAt: now,
  };
  mem.unshift(lead);
  return lead;
}

async function recordEvent(
  env: { url: string; key: string },
  leadId: string,
  from: Stage | null,
  to: Stage,
  note: string
): Promise<void> {
  try {
    await fetch(`${env.url}/rest/v1/${EVENTS}`, {
      method: "POST",
      headers: headers(env.key, { Prefer: "return=minimal" }),
      body: JSON.stringify({ lead_id: leadId, from_stage: from, to_stage: to, note }),
      cache: "no-store",
    });
  } catch {
    // 인사이트용 부가 기록 — 실패는 무시
  }
}

// 단계 변경 + 이력 기록
export async function updateLeadStage(
  id: string,
  from: Stage,
  to: Stage
): Promise<void> {
  const env = supabaseEnv();
  const now = new Date().toISOString();

  if (env) {
    const res = await fetch(`${env.url}/rest/v1/${TABLE}?id=eq.${id}`, {
      method: "PATCH",
      headers: headers(env.key, { Prefer: "return=minimal" }),
      body: JSON.stringify({ stage: to, updated_at: now }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`supabase update ${res.status}`);
    void recordEvent(env, id, from, to, `단계 변경: ${from} → ${to}`);
    return;
  }

  const lead = mem.find((l) => l.id === id);
  if (lead) {
    lead.stage = to;
    lead.updatedAt = now;
  }
}

export async function getLeads(): Promise<Lead[]> {
  const env = supabaseEnv();

  if (env) {
    const res = await fetch(
      `${env.url}/rest/v1/${TABLE}?select=*&order=created_at.desc`,
      { headers: headers(env.key), cache: "no-store" }
    );
    if (!res.ok) throw new Error(`supabase select ${res.status}`);
    const rows = (await res.json()) as Record<string, unknown>[];
    return rows.map(toLead);
  }

  return mem;
}
