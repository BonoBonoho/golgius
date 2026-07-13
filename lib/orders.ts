// 발주 요청(orders) 저장소 + 시안 파일(Supabase Storage).
// 운영: Supabase Postgres + Storage(비공개 버킷 order-files).
// 로컬/미설정: 메모리 폴백(파일은 이름만 보관).

import { readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { VerticalKey } from "@/lib/verticals";

export type OrderStatus =
  | "requested"
  | "quoted"
  | "confirmed"
  | "produced"
  | "canceled";

export interface OrderOptions {
  color?: string;
  size?: string;
  quantity?: string;
  // 제품별 추가 옵션(명함: paper/sides/coating/designJson 등) — jsonb에 그대로 저장
  [key: string]: string | null | undefined;
}

// 성원애드피아 자동 발주 파이프라인 상태 (고객용 status와 분리)
export type AdpiaStatus =
  | "idle"
  | "approved"
  | "ordering"
  | "awaiting_payment"
  | "ordered"
  | "failed";

export interface Order {
  id: string;
  vertical: VerticalKey | "";
  name: string;
  phone: string;
  email: string;
  productType: string;
  options: OrderOptions;
  designFile: string; // storage 경로 또는 (로컬) 파일명
  message: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  adpiaStatus: AdpiaStatus;
  adpiaScreenshots: string[];
  adpiaCartUrl: string;
  adpiaError: string;
  adpiaAttempts: number;
}

export type NewOrder = {
  vertical?: VerticalKey;
  name: string;
  phone: string;
  email?: string;
  productType: string;
  options: OrderOptions;
  message?: string;
  designFile?: string | null;
};

const TABLE = "orders";
const BUCKET = "order-files";

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

const STATUSES: OrderStatus[] = [
  "requested",
  "quoted",
  "confirmed",
  "produced",
  "canceled",
];

export const ORDER_FLOW: OrderStatus[] = [
  "requested",
  "quoted",
  "confirmed",
  "produced",
];

const ADPIA_STATUSES: AdpiaStatus[] = [
  "idle",
  "approved",
  "ordering",
  "awaiting_payment",
  "ordered",
  "failed",
];

function toOrder(r: Record<string, unknown>): Order {
  const status = STATUSES.includes(r.status as OrderStatus)
    ? (r.status as OrderStatus)
    : "requested";
  const adpiaStatus = ADPIA_STATUSES.includes(r.adpia_status as AdpiaStatus)
    ? (r.adpia_status as AdpiaStatus)
    : "idle";
  const opts = (r.options ?? {}) as OrderOptions;
  return {
    id: String(r.id),
    vertical: (r.vertical === "gym" || r.vertical === "hospital"
      ? r.vertical
      : "") as VerticalKey | "",
    name: String(r.name ?? ""),
    phone: String(r.phone ?? ""),
    email: String(r.email ?? ""),
    productType: String(r.product_type ?? ""),
    options: {
      ...opts,
      color: opts.color ?? "",
      size: opts.size ?? "",
      quantity: opts.quantity ?? "",
    },
    designFile: String(r.design_file ?? ""),
    message: String(r.message ?? ""),
    status,
    createdAt: String(r.created_at ?? new Date().toISOString()),
    updatedAt: String(r.updated_at ?? r.created_at ?? new Date().toISOString()),
    adpiaStatus,
    adpiaScreenshots: Array.isArray(r.adpia_screenshots)
      ? (r.adpia_screenshots as string[])
      : [],
    adpiaCartUrl: String(r.adpia_cart_url ?? ""),
    adpiaError: String(r.adpia_error ?? ""),
    adpiaAttempts: Number(r.adpia_attempts ?? 0),
  };
}

// 로컬(미설정) 폴백 — Next dev는 라우트 핸들러와 페이지를 별도 워커로 돌려
// globalThis가 공유되지 않으므로, 임시 파일로 워커 간 공유한다. (운영은 Supabase)
const MEM_FILE = path.join(os.tmpdir(), "golgius-dev-orders.json");

function memRead(): Order[] {
  try {
    return JSON.parse(readFileSync(MEM_FILE, "utf8")) as Order[];
  } catch {
    return [];
  }
}

function memWrite(list: Order[]): void {
  try {
    writeFileSync(MEM_FILE, JSON.stringify(list));
  } catch {
    /* tmp 쓰기 실패 시 무시 — 폴백의 폴백은 없음 */
  }
}

export function isPersistent(): boolean {
  return supabaseEnv() !== null;
}

// 시안 파일 업로드 → storage 객체 경로 반환 (운영 시에만)
export async function uploadDesignFile(file: File): Promise<string | null> {
  const env = supabaseEnv();
  if (!env) return null;
  const ext = (file.name.split(".").pop() ?? "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  const path = `${crypto.randomUUID()}.${ext || "bin"}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const res = await fetch(`${env.url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.key}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: buf,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`storage ${res.status}`);
  return path;
}

// 바이트 직접 업로드 — 서버 생성 파일(인쇄 PDF, design.json 등)용.
// path에 하위 폴더 허용 (예: namecard/{uuid}/print.pdf)
export async function uploadDesignBytes(
  bytes: Uint8Array,
  contentType: string,
  objectPath: string
): Promise<string | null> {
  const env = supabaseEnv();
  if (!env) return null;
  const res = await fetch(
    `${env.url}/storage/v1/object/${BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.key}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: Buffer.from(bytes),
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`storage ${res.status}`);
  return objectPath;
}

// 비공개 파일의 임시 서명 URL (관리자 조회용)
export async function signedUrl(
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const env = supabaseEnv();
  if (!env || !path) return null;
  try {
    const res = await fetch(`${env.url}/storage/v1/object/sign/${BUCKET}/${path}`, {
      method: "POST",
      headers: headers(env.key),
      body: JSON.stringify({ expiresIn }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { signedURL?: string };
    return data.signedURL ? `${env.url}/storage/v1${data.signedURL}` : null;
  } catch {
    return null;
  }
}

export async function addOrder(input: NewOrder): Promise<Order> {
  const env = supabaseEnv();

  if (env) {
    const res = await fetch(`${env.url}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: headers(env.key, { Prefer: "return=representation" }),
      body: JSON.stringify({
        vertical: input.vertical ?? null,
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        product_type: input.productType,
        options: input.options ?? {},
        design_file: input.designFile ?? null,
        message: input.message ?? "",
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`supabase order insert ${res.status}`);
    const rows = (await res.json()) as Record<string, unknown>[];
    return toOrder(rows[0]);
  }

  const now = new Date().toISOString();
  const order: Order = {
    id: crypto.randomUUID(),
    vertical: input.vertical ?? "",
    name: input.name,
    phone: input.phone,
    email: input.email ?? "",
    productType: input.productType,
    options: input.options ?? {},
    designFile: input.designFile ?? "",
    message: input.message ?? "",
    status: "requested",
    createdAt: now,
    updatedAt: now,
    adpiaStatus: "idle",
    adpiaScreenshots: [],
    adpiaCartUrl: "",
    adpiaError: "",
    adpiaAttempts: 0,
  };
  const list = memRead();
  list.unshift(order);
  memWrite(list);
  return order;
}

export async function getOrders(): Promise<Order[]> {
  const env = supabaseEnv();
  if (env) {
    const res = await fetch(
      `${env.url}/rest/v1/${TABLE}?select=*&order=created_at.desc`,
      { headers: headers(env.key), cache: "no-store" }
    );
    if (!res.ok) throw new Error(`supabase orders select ${res.status}`);
    const rows = (await res.json()) as Record<string, unknown>[];
    return rows.map(toOrder);
  }
  return memRead();
}

export async function deleteOrder(id: string): Promise<void> {
  const env = supabaseEnv();
  if (env) {
    const res = await fetch(`${env.url}/rest/v1/${TABLE}?id=eq.${id}`, {
      method: "DELETE",
      headers: headers(env.key, { Prefer: "return=minimal" }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`supabase order delete ${res.status}`);
    return;
  }
  const list = memRead();
  const i = list.findIndex((o) => o.id === id);
  if (i >= 0) {
    list.splice(i, 1);
    memWrite(list);
  }
}

// adpia_status 조건부 전이 — WHERE에 기대 상태를 포함한 원자적 PATCH.
// 반환 false = 이미 다른 상태(중복 클릭/중복 발주 방지).
export async function adpiaTransition(
  id: string,
  fromStatuses: AdpiaStatus[],
  to: AdpiaStatus,
  extra: Record<string, unknown> = {}
): Promise<boolean> {
  const env = supabaseEnv();
  const now = new Date().toISOString();
  if (env) {
    const res = await fetch(
      `${env.url}/rest/v1/${TABLE}?id=eq.${id}&adpia_status=in.(${fromStatuses.join(",")})`,
      {
        method: "PATCH",
        headers: headers(env.key, { Prefer: "return=representation" }),
        body: JSON.stringify({ adpia_status: to, updated_at: now, ...extra }),
        cache: "no-store",
      }
    );
    if (!res.ok) throw new Error(`supabase adpia transition ${res.status}`);
    const rows = (await res.json()) as unknown[];
    return rows.length > 0;
  }
  const list = memRead();
  const o = list.find((x) => x.id === id);
  if (!o || !fromStatuses.includes(o.adpiaStatus)) return false;
  o.adpiaStatus = to;
  o.updatedAt = now;
  if (typeof extra.adpia_error === "string") o.adpiaError = extra.adpia_error;
  if (typeof extra.adpia_attempts === "number") o.adpiaAttempts = extra.adpia_attempts;
  memWrite(list);
  return true;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<void> {
  const env = supabaseEnv();
  const now = new Date().toISOString();
  if (env) {
    const res = await fetch(`${env.url}/rest/v1/${TABLE}?id=eq.${id}`, {
      method: "PATCH",
      headers: headers(env.key, { Prefer: "return=minimal" }),
      body: JSON.stringify({ status, updated_at: now }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`supabase order update ${res.status}`);
    return;
  }
  const list = memRead();
  const o = list.find((x) => x.id === id);
  if (o) {
    o.status = status;
    o.updatedAt = now;
    memWrite(list);
  }
}
