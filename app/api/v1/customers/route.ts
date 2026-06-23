import { getCustomers } from "@/lib/customers";
import { authorized, unauthorized, jsonRes, corsPreflight, parseQuery, filterSince } from "@/lib/apiauth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  if (!authorized(req)) return unauthorized();
  const { sinceMs, limit } = parseQuery(req);
  const url = new URL(req.url);
  const stage = url.searchParams.get("stage");
  const vertical = url.searchParams.get("vertical");

  let data = await getCustomers(); // 최신순
  data = filterSince(data, sinceMs);
  if (stage) data = data.filter((c) => c.stage === stage);
  if (vertical) data = data.filter((c) => c.vertical === vertical);
  data = data.slice(0, limit);

  return jsonRes({ ok: true, count: data.length, data });
}
