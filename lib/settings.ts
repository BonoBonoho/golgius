// 앱 설정(알림 키 등) 저장소 — Supabase `app_settings` 테이블(key-value).
// 코드는 "DB 값이 있으면 그걸, 없으면 환경변수" 순으로 읽는다.
// 이로써 어드민에서 키를 수정하면 재배포 없이 즉시 반영된다.
//
// ⚠️ DB 평문 저장. service_role(서버)로만 접근하며 어드민 로그인으로 보호한다.

const TABLE = "app_settings";

// 설정 키 ↔ 환경변수 폴백 매핑
export const SETTING_ENV: Record<string, string> = {
  resend_api_key: "RESEND_API_KEY",
  resend_from: "RESEND_FROM",
  notify_email: "GOLGIUS_NOTIFY_EMAIL",
  solapi_api_key: "SOLAPI_API_KEY",
  solapi_api_secret: "SOLAPI_API_SECRET",
  solapi_sender: "SOLAPI_SENDER",
  notify_phone: "GOLGIUS_NOTIFY_PHONE",
  shop_title: "SHOP_TITLE",
  shop_sub: "SHOP_SUB",
};

export type SettingKey = keyof typeof SETTING_ENV;

// 비밀로 취급(마스킹, 빈 입력 시 기존 유지)
export const SECRET_KEYS: SettingKey[] = [
  "resend_api_key",
  "solapi_api_key",
  "solapi_api_secret",
];

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

export function settingsBacked(): boolean {
  return supabaseEnv() !== null;
}

// DB에 저장된 설정 전체 (없으면 빈 객체)
export async function getDbSettings(): Promise<Record<string, string>> {
  const env = supabaseEnv();
  if (!env) return {};
  try {
    const res = await fetch(`${env.url}/rest/v1/${TABLE}?select=key,value`, {
      headers: headers(env.key),
      cache: "no-store",
    });
    if (!res.ok) return {};
    const rows = (await res.json()) as { key: string; value: string }[];
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return map;
  } catch {
    return {};
  }
}

// 키 하나의 유효값 + 출처 (표시·진단용)
export type Effective = { value: string; source: "db" | "env" | "none" };

export function effective(
  key: SettingKey,
  db: Record<string, string>
): Effective {
  const dbv = (db[key] ?? "").trim();
  if (dbv) return { value: dbv, source: "db" };
  const envv = (process.env[SETTING_ENV[key]] ?? "").trim();
  if (envv) return { value: envv, source: "env" };
  return { value: "", source: "none" };
}

// 알림 모듈이 쓰는 병합 설정 (DB 우선, 환경변수 폴백)
export interface NotifyConfig {
  resendApiKey: string;
  resendFrom: string;
  notifyEmail: string;
  solapiApiKey: string;
  solapiApiSecret: string;
  solapiSender: string;
  notifyPhone: string;
}

export async function getNotifyConfig(): Promise<NotifyConfig> {
  const db = await getDbSettings();
  const v = (k: SettingKey) => effective(k, db).value;
  return {
    resendApiKey: v("resend_api_key"),
    resendFrom: v("resend_from"),
    notifyEmail: v("notify_email"),
    solapiApiKey: v("solapi_api_key"),
    solapiApiSecret: v("solapi_api_secret"),
    solapiSender: v("solapi_sender"),
    notifyPhone: v("notify_phone"),
  };
}

// 설정 저장(업서트). 빈 문자열 값도 그대로 저장(= 폴백으로 떨어짐).
export async function saveDbSettings(
  entries: Record<string, string>
): Promise<void> {
  const env = supabaseEnv();
  if (!env) throw new Error("no-supabase");
  const rows = Object.entries(entries).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return;
  const res = await fetch(`${env.url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: headers(env.key, {
      Prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify(rows),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`settings upsert ${res.status}`);
}

// ── 기구 스토어 문구 (어드민에서 수정, 재배포 불필요) ──
export const SHOP_COPY_DEFAULTS = {
  title: "헬스 기구 담아서 한번에 견적 받으세요",
  sub: "1,200곳을 열어본 골지어스가 검증한 기구 라인업입니다. 필요한 기구를 바구니에 담아 견적을 요청하면 설치·배치까지 함께 안내해 드립니다.",
};

export interface ShopCopy {
  title: string;
  sub: string;
}

export async function getShopCopy(): Promise<ShopCopy> {
  const db = await getDbSettings();
  return {
    title: effective("shop_title", db).value || SHOP_COPY_DEFAULTS.title,
    sub: effective("shop_sub", db).value || SHOP_COPY_DEFAULTS.sub,
  };
}

export function maskSecret(v: string): string {
  if (!v) return "미설정";
  if (v.length <= 6) return "••••";
  return `${v.slice(0, 3)}••••${v.slice(-2)}`;
}
