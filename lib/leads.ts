// 문의 접수(리드) 저장소.
// 운영(Vercel): Upstash Redis(KV) REST API에 영구 저장.
// 로컬/미설정: 메모리 폴백 — 서버 재시작 시 사라짐(테스트용).
//
// 필요한 환경변수(Vercel Storage > Upstash Redis 연결 시 자동 주입):
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//   (또는 레거시 KV_REST_API_URL / KV_REST_API_TOKEN)

import type { VerticalKey } from "@/lib/verticals";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  message: string;
  vertical: VerticalKey;
  createdAt: string; // ISO
}

const KEY = "golgius:leads";

function redisEnv() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
  return url && token ? { url, token } : null;
}

// Upstash REST: 단일 커맨드를 POST 본문(JSON 배열)으로 전송
async function redisCmd(cmd: (string | number)[]): Promise<unknown> {
  const env = redisEnv();
  if (!env) throw new Error("no-redis");
  const res = await fetch(env.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const data = (await res.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(data.error);
  return data.result;
}

// ── 메모리 폴백 (dev) ── 핫리로드에도 유지되도록 globalThis에 보관
const mem: Lead[] = ((globalThis as Record<string, unknown>).__golgiusLeads ??=
  []) as Lead[];

export function isPersistent(): boolean {
  return redisEnv() !== null;
}

export async function addLead(
  input: Omit<Lead, "id" | "createdAt">
): Promise<Lead> {
  const lead: Lead = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  if (isPersistent()) {
    await redisCmd(["LPUSH", KEY, JSON.stringify(lead)]);
  } else {
    mem.unshift(lead);
  }
  return lead;
}

export async function getLeads(): Promise<Lead[]> {
  if (isPersistent()) {
    const raw = (await redisCmd(["LRANGE", KEY, 0, -1])) as string[];
    return raw
      .map((s) => {
        try {
          return JSON.parse(s) as Lead;
        } catch {
          return null;
        }
      })
      .filter((l): l is Lead => l !== null);
  }
  return mem;
}
