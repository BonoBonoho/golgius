import { isAuthed } from "@/lib/admin";
import { getOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const orders = await getOrders();
  const head = ["접수일시", "상태", "이름", "연락처", "이메일", "품목", "색상", "사이즈", "수량", "시안파일", "요청내용"];
  const rows = orders.map((o) => [
    o.createdAt,
    o.status,
    o.name,
    o.phone,
    o.email,
    o.productType,
    o.options.color,
    o.options.size,
    o.options.quantity,
    o.designFile,
    o.message,
  ]);

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [head, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="golgius-orders.csv"',
    },
  });
}
