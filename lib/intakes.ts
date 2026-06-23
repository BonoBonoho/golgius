// 견적용 서류·정보 수집(intake) 저장소 + 비공개 파일.
// 담당자가 고객에게 /intake URL을 보내면 고객이 제출 → 어드민에서 확인.

export type IntakeStatus = "received" | "reviewed" | "done";

export interface Intake {
  id: string;
  name: string;
  phone: string;
  ext: string;
  address: string;
  withdrawalDay: string; // 10/15/20/25
  email: string;
  installDate: string;
  bizFile: string; // 사업자등록증 경로
  bankFiles: string[]; // 통장사본/카드 경로들
  note: string;
  status: IntakeStatus;
  createdAt: string;
}

export type NewIntake = {
  name: string;
  phone: string;
  ext?: string;
  address: string;
  withdrawalDay: string;
  email: string;
  installDate?: string;
  bizFile?: string | null;
  bankFiles?: string[];
  note?: string;
};

const TABLE = "intakes";
const BUCKET = "intake-files";

function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
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

const STATUSES: IntakeStatus[] = ["received", "reviewed", "done"];

function toIntake(r: Record<string, unknown>): Intake {
  const status = STATUSES.includes(r.status as IntakeStatus) ? (r.status as IntakeStatus) : "received";
  const bank = String(r.bank_files ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    phone: String(r.phone ?? ""),
    ext: String(r.ext ?? ""),
    address: String(r.address ?? ""),
    withdrawalDay: String(r.withdrawal_day ?? ""),
    email: String(r.email ?? ""),
    installDate: String(r.install_date ?? ""),
    bizFile: String(r.biz_file ?? ""),
    bankFiles: bank,
    note: String(r.note ?? ""),
    status,
    createdAt: String(r.created_at ?? new Date().toISOString()),
  };
}

const mem: Intake[] = ((globalThis as Record<string, unknown>).__golgiusIntakes ??= []) as Intake[];

export function isPersistent(): boolean {
  return supabaseEnv() !== null;
}

export async function uploadIntakeFile(file: File, prefix: string): Promise<string | null> {
  const env = supabaseEnv();
  if (!env) return null;
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  const path = `${prefix}/${crypto.randomUUID()}.${ext || "bin"}`;
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

export async function signedUrl(path: string, expiresIn = 3600): Promise<string | null> {
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

export async function addIntake(input: NewIntake): Promise<Intake> {
  const env = supabaseEnv();
  if (env) {
    const res = await fetch(`${env.url}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: headers(env.key, { Prefer: "return=representation" }),
      body: JSON.stringify({
        name: input.name,
        phone: input.phone,
        ext: input.ext ?? null,
        address: input.address,
        withdrawal_day: input.withdrawalDay,
        email: input.email,
        install_date: input.installDate ?? null,
        biz_file: input.bizFile ?? null,
        bank_files: (input.bankFiles ?? []).join(","),
        note: input.note ?? "",
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`supabase intake insert ${res.status}`);
    const rows = (await res.json()) as Record<string, unknown>[];
    return toIntake(rows[0]);
  }

  const intake: Intake = {
    id: crypto.randomUUID(),
    name: input.name,
    phone: input.phone,
    ext: input.ext ?? "",
    address: input.address,
    withdrawalDay: input.withdrawalDay,
    email: input.email,
    installDate: input.installDate ?? "",
    bizFile: input.bizFile ?? "",
    bankFiles: input.bankFiles ?? [],
    note: input.note ?? "",
    status: "received",
    createdAt: new Date().toISOString(),
  };
  mem.unshift(intake);
  return intake;
}

export async function getIntakes(): Promise<Intake[]> {
  const env = supabaseEnv();
  if (env) {
    const res = await fetch(`${env.url}/rest/v1/${TABLE}?select=*&order=created_at.desc`, {
      headers: headers(env.key),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`supabase intakes select ${res.status}`);
    const rows = (await res.json()) as Record<string, unknown>[];
    return rows.map(toIntake);
  }
  return mem;
}

export async function updateIntakeStatus(id: string, status: IntakeStatus): Promise<void> {
  const env = supabaseEnv();
  if (env) {
    const res = await fetch(`${env.url}/rest/v1/${TABLE}?id=eq.${id}`, {
      method: "PATCH",
      headers: headers(env.key, { Prefer: "return=minimal" }),
      body: JSON.stringify({ status }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`supabase intake update ${res.status}`);
    return;
  }
  const o = mem.find((x) => x.id === id);
  if (o) o.status = status;
}

export async function deleteIntake(id: string): Promise<void> {
  const env = supabaseEnv();
  if (env) {
    const res = await fetch(`${env.url}/rest/v1/${TABLE}?id=eq.${id}`, {
      method: "DELETE",
      headers: headers(env.key, { Prefer: "return=minimal" }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`supabase intake delete ${res.status}`);
    return;
  }
  const i = mem.findIndex((x) => x.id === id);
  if (i >= 0) mem.splice(i, 1);
}
