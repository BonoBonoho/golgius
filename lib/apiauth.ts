// 외부 연동 API(v1) 공통 — 토큰 인증 + CORS.
// API_TOKEN 환경변수와 일치해야 접근 가능. 미설정 시 전부 거부.
// ⚠️ 고객 개인정보를 노출하므로 토큰은 서버 간 연동에서만 사용하세요
//    (브라우저 클라이언트에 토큰을 넣으면 노출됩니다).

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-api-key",
  "Cache-Control": "no-store",
};

export function apiToken(): string {
  return (process.env.API_TOKEN ?? "").trim();
}

export function authorized(req: Request): boolean {
  const tok = apiToken();
  if (!tok) return false; // 키 미설정 → 거부
  const h = req.headers;
  const bearer = (h.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const xkey = (h.get("x-api-key") ?? "").trim();
  let q = "";
  try {
    q = (new URL(req.url).searchParams.get("token") ?? "").trim();
  } catch {
    // ignore
  }
  return [bearer, xkey, q].some((v) => v && v === tok);
}

export function jsonRes(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS });
}

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export function unauthorized(): Response {
  return jsonRes({ ok: false, error: "unauthorized" }, 401);
}

// 공통 쿼리 파싱: since(ISO) 이후 + limit
export function parseQuery(req: Request): { sinceMs: number | null; limit: number } {
  const url = new URL(req.url);
  const sinceRaw = url.searchParams.get("since");
  const sinceMs = sinceRaw ? Date.parse(sinceRaw) : NaN;
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 200, 1), 1000);
  return { sinceMs: Number.isNaN(sinceMs) ? null : sinceMs, limit };
}

export function filterSince<T extends { createdAt: string }>(rows: T[], sinceMs: number | null): T[] {
  if (sinceMs === null) return rows;
  return rows.filter((r) => Date.parse(r.createdAt) >= sinceMs);
}
