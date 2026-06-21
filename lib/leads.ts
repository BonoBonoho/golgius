// 문의 접수(리드) 저장소.
// 운영(Vercel): Supabase Postgres 테이블에 영구 저장 (PostgREST REST API).
// 로컬/미설정: 메모리 폴백 — 서버 재시작 시 사라짐(테스트용).
//
// 필요한 환경변수:
//   NEXT_PUBLIC_SUPABASE_URL      Supabase 프로젝트 URL
//   SUPABASE_SERVICE_ROLE_KEY     서버 전용 키(RLS 우회, 절대 클라이언트 노출 금지)
//
// 테이블(public.leads) 생성 SQL은 README / 설정 안내 참고.

import type { VerticalKey } from "@/lib/verticals";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  message: string;
  vertical: VerticalKey;
  createdAt: string; // ISO
}

const TABLE = "leads";

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

// DB row(snake_case) → Lead
function toLead(r: Record<string, unknown>): Lead {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    phone: String(r.phone ?? ""),
    message: String(r.message ?? ""),
    vertical: (r.vertical === "hospital" ? "hospital" : "gym") as VerticalKey,
    createdAt: String(r.created_at ?? new Date().toISOString()),
  };
}

// ── 메모리 폴백 (dev) ── 핫리로드에도 유지되도록 globalThis에 보관
const mem: Lead[] = ((globalThis as Record<string, unknown>).__golgiusLeads ??=
  []) as Lead[];

export function isPersistent(): boolean {
  return supabaseEnv() !== null;
}

export async function addLead(
  input: Omit<Lead, "id" | "createdAt">
): Promise<Lead> {
  const env = supabaseEnv();

  if (env) {
    const res = await fetch(`${env.url}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: headers(env.key, { Prefer: "return=representation" }),
      body: JSON.stringify({
        name: input.name,
        phone: input.phone,
        message: input.message,
        vertical: input.vertical,
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`supabase insert ${res.status}`);
    const rows = (await res.json()) as Record<string, unknown>[];
    return toLead(rows[0]);
  }

  // 폴백: 메모리
  const lead: Lead = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  mem.unshift(lead);
  return lead;
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
