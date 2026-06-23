import { getIntakes, signedUrl } from "@/lib/intakes";
import { authorized, unauthorized, jsonRes, corsPreflight, parseQuery, filterSince } from "@/lib/apiauth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  if (!authorized(req)) return unauthorized();
  const { sinceMs, limit } = parseQuery(req);

  let rows = await getIntakes();
  rows = filterSince(rows, sinceMs).slice(0, limit);

  // 서류는 1시간 서명 URL로 제공(외부 앱에서 바로 열람 가능)
  const data = await Promise.all(
    rows.map(async (it) => ({
      ...it,
      bizFileUrl: it.bizFile ? await signedUrl(it.bizFile) : null,
      bankFileUrls: await Promise.all(it.bankFiles.map((p) => signedUrl(p))),
    }))
  );

  return jsonRes({ ok: true, count: data.length, data });
}
