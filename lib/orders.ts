// 발주 요청(orders) 저장소 + 시안 파일(Supabase Storage).
// 운영: Supabase Postgres + Storage(비공개 버킷 order-files).
// 로컬/미설정: 메모리 폴백(파일은 이름만 보관).

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
}

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

function toOrder(r: Record<string, unknown>): Order {
  const status = STATUSES.includes(r.status as OrderStatus)
    ? (r.status as OrderStatus)
    : "requested";
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
      color: opts.color ?? "",
      size: opts.size ?? "",
      quantity: opts.quantity ?? "",
    },
    designFile: String(r.design_file ?? ""),
    message: String(r.message ?? ""),
    status,
    createdAt: String(r.created_at ?? new Date().toISOString()),
    updatedAt: String(r.updated_at ?? r.created_at ?? new Date().toISOString()),
  };
}

const mem: Order[] = ((globalThis as Record<string, unknown>).__golgiusOrders ??=
  []) as Order[];

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
  };
  mem.unshift(order);
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
  return mem;
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
  const i = mem.findIndex((o) => o.id === id);
  if (i >= 0) mem.splice(i, 1);
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
  const o = mem.find((x) => x.id === id);
  if (o) {
    o.status = status;
    o.updatedAt = now;
  }
}
