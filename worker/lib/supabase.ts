// PostgREST/Storage 미니 클라이언트 — 메인 앱 lib/orders.ts 패턴의 축약판.
// 워커는 Next 앱 외부에서 돌므로 service_role 키로 직접 접근한다.

const BUCKET = "order-files";
const TABLE = "orders";

function env() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  return { url, key };
}

function headers(extra: Record<string, string> = {}) {
  const { key } = env();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export type AdpiaOrderRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  product_type: string;
  options: Record<string, string | null>;
  design_file: string | null;
  adpia_status: string;
  adpia_attempts: number;
  adpia_job_log: unknown[];
  adpia_screenshots: string[];
};

const SELECT =
  "id,name,phone,email,product_type,options,design_file,adpia_status,adpia_attempts,adpia_job_log,adpia_screenshots";

/** approved 1건을 원자적으로 claim(→ordering). 없으면 null */
export async function claimNextApproved(orderId?: string): Promise<AdpiaOrderRow | null> {
  const { url } = env();
  const filter = orderId
    ? `id=eq.${orderId}&adpia_status=eq.approved`
    : `adpia_status=eq.approved&product_type=eq.namecard-ai`;
  const list = await fetch(
    `${url}/rest/v1/${TABLE}?${filter}&select=${SELECT}&order=updated_at.asc&limit=1`,
    { headers: headers() }
  );
  if (!list.ok) throw new Error(`orders select ${list.status}`);
  const rows = (await list.json()) as AdpiaOrderRow[];
  if (rows.length === 0) return null;
  const row = rows[0];

  // WHERE에 기대 상태 포함 → 반환 0행이면 다른 프로세스가 선점
  const res = await fetch(
    `${url}/rest/v1/${TABLE}?id=eq.${row.id}&adpia_status=eq.approved`,
    {
      method: "PATCH",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify({
        adpia_status: "ordering",
        adpia_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    }
  );
  if (!res.ok) throw new Error(`claim ${res.status}`);
  const claimed = (await res.json()) as AdpiaOrderRow[];
  return claimed.length > 0 ? { ...row, adpia_status: "ordering" } : null;
}

export async function transition(
  id: string,
  from: string[],
  to: string,
  extra: Record<string, unknown> = {}
): Promise<boolean> {
  const { url } = env();
  const res = await fetch(
    `${url}/rest/v1/${TABLE}?id=eq.${id}&adpia_status=in.(${from.join(",")})`,
    {
      method: "PATCH",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify({
        adpia_status: to,
        updated_at: new Date().toISOString(),
        ...extra,
      }),
    }
  );
  if (!res.ok) throw new Error(`transition ${res.status}`);
  return ((await res.json()) as unknown[]).length > 0;
}

/** ordering 상태로 15분 이상 방치된 행 → failed (워커 재시작 복구) */
export async function failStaleOrdering(): Promise<number> {
  const { url } = env();
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const res = await fetch(
    `${url}/rest/v1/${TABLE}?adpia_status=eq.ordering&adpia_started_at=lt.${cutoff}`,
    {
      method: "PATCH",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify({
        adpia_status: "failed",
        adpia_error: "워커 중단으로 작업이 유실됨 — 재시도 필요",
        updated_at: new Date().toISOString(),
      }),
    }
  );
  if (!res.ok) throw new Error(`stale sweep ${res.status}`);
  return ((await res.json()) as unknown[]).length;
}

/** 스텝 로그 append (단일 워커 전제의 read-modify-write) */
export async function appendJobLog(row: AdpiaOrderRow, entry: unknown): Promise<void> {
  const { url } = env();
  row.adpia_job_log = [...(row.adpia_job_log ?? []), entry];
  const res = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${row.id}`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=minimal" }),
    body: JSON.stringify({ adpia_job_log: row.adpia_job_log }),
  });
  if (!res.ok) throw new Error(`job log ${res.status}`);
}

export async function addScreenshot(row: AdpiaOrderRow, path: string): Promise<void> {
  const { url } = env();
  row.adpia_screenshots = [...(row.adpia_screenshots ?? []), path];
  const res = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${row.id}`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=minimal" }),
    body: JSON.stringify({ adpia_screenshots: row.adpia_screenshots }),
  });
  if (!res.ok) throw new Error(`screenshot list ${res.status}`);
}

// ── Storage ──────────────────────────────────────────────
export async function downloadObject(path: string): Promise<Buffer> {
  const { url, key } = env();
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`storage download ${res.status}: ${path}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function uploadObject(
  path: string,
  bytes: Buffer,
  contentType: string
): Promise<string> {
  const { url, key } = env();
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: new Uint8Array(bytes),
  });
  if (!res.ok) throw new Error(`storage upload ${res.status}: ${path}`);
  return path;
}

/** app_settings 전체 로드 (알림 키) */
export async function loadSettings(): Promise<Record<string, string>> {
  const { url } = env();
  const res = await fetch(`${url}/rest/v1/app_settings?select=key,value`, {
    headers: headers(),
  });
  if (!res.ok) return {};
  const rows = (await res.json()) as { key: string; value: string }[];
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}
