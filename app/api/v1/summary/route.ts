import { getLeads } from "@/lib/leads";
import { getOrders } from "@/lib/orders";
import { getIntakes } from "@/lib/intakes";
import { computeInsights } from "@/lib/insights";
import { authorized, unauthorized, jsonRes, corsPreflight } from "@/lib/apiauth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  if (!authorized(req)) return unauthorized();

  const [leads, orders, intakes] = await Promise.all([getLeads(), getOrders(), getIntakes()]);
  const ins = computeInsights(leads);

  const ordersByStatus: Record<string, number> = {};
  for (const o of orders) ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;

  return jsonRes({
    ok: true,
    generatedAt: new Date().toISOString(),
    leads: {
      total: ins.total,
      byStage: ins.byStage,
      byVertical: ins.byVertical,
      bySource: ins.bySource,
      funnel: ins.funnel,
    },
    orders: { total: orders.length, byStatus: ordersByStatus },
    intakes: { total: intakes.length },
  });
}
