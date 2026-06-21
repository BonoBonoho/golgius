import { isAuthed } from "@/lib/admin";
import { getLeads } from "@/lib/leads";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const leads = await getLeads();
  const head = ["접수일시", "분야", "단계", "이름", "연락처", "이메일", "지역", "유입", "문의내용"];
  const rows = leads.map((l) => [
    l.createdAt,
    l.vertical,
    l.stage,
    l.name,
    l.phone,
    l.email,
    l.region,
    l.source,
    l.message,
  ]);

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [head, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");

  // BOM 추가 → 엑셀에서 한글 깨짐 방지
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="golgius-leads.csv"',
    },
  });
}
