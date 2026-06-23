import { getOrders } from "@/lib/orders";
import { authorized, unauthorized, jsonRes, corsPreflight, parseQuery, filterSince } from "@/lib/apiauth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  if (!authorized(req)) return unauthorized();
  const { sinceMs, limit } = parseQuery(req);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  let data = await getOrders();
  data = filterSince(data, sinceMs);
  if (status) data = data.filter((o) => o.status === status);
  data = data.slice(0, limit);

  return jsonRes({ ok: true, count: data.length, data });
}
