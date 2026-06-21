import Link from "next/link";
import { isAuthed, adminPassword } from "@/lib/admin";
import { getLeads, isPersistent, type Stage } from "@/lib/leads";
import { logout } from "@/app/actions/admin";
import { verticals } from "@/lib/verticals";
import AdminLogin from "./AdminLogin";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

const STAGE_LABEL: Record<Stage, string> = {
  inquiry: "문의",
  consult: "상담예약",
  quote: "견적발송",
  contract: "계약",
  open: "오픈완료",
  lost: "보류·이탈",
};

export default async function AdminPage() {
  if (!(await isAuthed())) {
    return <AdminLogin configured={adminPassword() !== null} />;
  }

  const leads = await getLeads();

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">문의 접수 내역</h1>
          <p className="mt-1 text-sm text-dim">
            총 {leads.length}건
            {!isPersistent() && (
              <span style={{ color: "#e2574a" }}>
                {" "}· 임시 저장(메모리) — Supabase 연결 시 영구 보관됩니다
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/settings"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-dim transition hover:text-ink"
          >
            알림 설정
          </Link>
          <form action={logout}>
            <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-dim transition hover:text-ink">
              로그아웃
            </button>
          </form>
        </div>
      </div>

      {leads.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-line bg-surface p-10 text-center text-sm text-dim">
          아직 접수된 문의가 없습니다.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-dim">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">접수일시</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">분야</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">단계</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">이름</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">연락처</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">지역</th>
                <th className="px-4 py-3 font-semibold">문의 내용</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-line align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-dim">
                    {fmt.format(new Date(l.createdAt))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {verticals[l.vertical]?.label ?? l.vertical}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-dim">
                    {STAGE_LABEL[l.stage] ?? l.stage}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">
                    {l.name}
                    {l.email && (
                      <span className="block font-normal text-dim">{l.email}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <a href={`tel:${l.phone.replace(/[^0-9+]/g, "")}`} className="text-gold hover:opacity-80">
                      {l.phone}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-dim">{l.region || "—"}</td>
                  <td className="px-4 py-3 text-dim">{l.message || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
