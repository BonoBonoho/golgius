import Link from "next/link";
import { isAuthed, adminPassword } from "@/lib/admin";
import { getLeads, isPersistent, PIPELINE, type Lead, type Stage } from "@/lib/leads";
import { computeInsights, daysSince, STALL_DAYS } from "@/lib/insights";
import { logout } from "@/app/actions/admin";
import { moveStage } from "@/app/actions/leads";
import { verticals } from "@/lib/verticals";
import AdminLogin from "./AdminLogin";
import DeleteLeadButton from "@/components/admin/DeleteLeadButton";
import RequestIntakeButton from "@/components/admin/RequestIntakeButton";

export const dynamic = "force-dynamic";

const STAGE_LABEL: Record<Stage, string> = {
  inquiry: "문의",
  consult: "상담예약",
  quote: "견적발송",
  contract: "계약",
  open: "오픈완료",
  lost: "보류·이탈",
};

const STAGE_ACTION: Partial<Record<Stage, string>> = {
  inquiry: "상담 예약 잡기 (전화·문자)",
  consult: "상담 리마인드 발송",
  quote: "견적 팔로업 콜",
  contract: "계약 진행 상태 확인",
};

const BOARD: Stage[] = [...PIPELINE, "lost"];

const fmt = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

function MoveButtons({ lead }: { lead: Lead }) {
  const i = PIPELINE.indexOf(lead.stage);
  const btn =
    "rounded-md border border-line px-2 py-1 text-xs text-dim transition hover:text-ink hover:border-ink";

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {i > 0 && (
        <form action={moveStage}>
          <input type="hidden" name="id" value={lead.id} />
          <input type="hidden" name="from" value={lead.stage} />
          <input type="hidden" name="to" value={PIPELINE[i - 1]} />
          <button className={btn}>← {STAGE_LABEL[PIPELINE[i - 1]]}</button>
        </form>
      )}
      {i >= 0 && i < PIPELINE.length - 1 && (
        <form action={moveStage}>
          <input type="hidden" name="id" value={lead.id} />
          <input type="hidden" name="from" value={lead.stage} />
          <input type="hidden" name="to" value={PIPELINE[i + 1]} />
          <button className={btn} style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
            {STAGE_LABEL[PIPELINE[i + 1]]} →
          </button>
        </form>
      )}
      {lead.stage !== "lost" ? (
        <form action={moveStage}>
          <input type="hidden" name="id" value={lead.id} />
          <input type="hidden" name="from" value={lead.stage} />
          <input type="hidden" name="to" value="lost" />
          <button className={btn}>보류</button>
        </form>
      ) : (
        <form action={moveStage}>
          <input type="hidden" name="id" value={lead.id} />
          <input type="hidden" name="from" value={lead.stage} />
          <input type="hidden" name="to" value="inquiry" />
          <button className={btn}>문의로 복구</button>
        </form>
      )}
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; view?: string }>;
}) {
  if (!(await isAuthed())) {
    return <AdminLogin configured={adminPassword() !== null} />;
  }

  const sp = await searchParams;
  const days = sp.days === "7" || sp.days === "30" ? Number(sp.days) : null;
  const view: "board" | "table" = sp.view === "table" ? "table" : "board";

  const all = await getLeads();
  const leads = days
    ? all.filter((l) => daysSince(l.createdAt) <= days)
    : all;

  const ins = computeInsights(leads);

  const hrefWith = (d: number | null, v: "board" | "table") => {
    const p = new URLSearchParams();
    if (d) p.set("days", String(d));
    if (v === "table") p.set("view", "table");
    const s = p.toString();
    return `/admin${s ? `?${s}` : ""}`;
  };
  const chip = (active: boolean) =>
    "rounded-full border px-3 py-1 text-xs font-semibold transition";
  const chipStyle = (active: boolean) =>
    active
      ? { color: "var(--accent)", borderColor: "var(--accent)" }
      : { color: "var(--color-dim)", borderColor: "var(--color-line)" };

  const periodLink = (v: string, label: string) => {
    const active = v === "all" ? days === null : String(days) === v;
    return (
      <Link href={hrefWith(v === "all" ? null : Number(v), view)} className={chip(active)} style={chipStyle(active)}>
        {label}
      </Link>
    );
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">리드 관리</h1>
          <p className="mt-1 text-sm text-dim">
            {days ? `최근 ${days}일` : "전체"} · {ins.total}건
            {!isPersistent() && (
              <span style={{ color: "#e2574a" }}>
                {" "}· 임시 저장(메모리) — Supabase 연결 시 영구 보관됩니다
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {periodLink("all", "전체")}
          {periodLink("30", "30일")}
          {periodLink("7", "7일")}
          {/* 보기 전환 */}
          <span className="mx-1 inline-flex overflow-hidden rounded-full border border-line">
            <Link
              href={hrefWith(days, "board")}
              className="px-3 py-1 text-xs font-semibold transition"
              style={view === "board" ? { backgroundColor: "var(--accent)", color: "var(--color-base)" } : { color: "var(--color-dim)" }}
            >
              보드
            </Link>
            <Link
              href={hrefWith(days, "table")}
              className="px-3 py-1 text-xs font-semibold transition"
              style={view === "table" ? { backgroundColor: "var(--accent)", color: "var(--color-base)" } : { color: "var(--color-dim)" }}
            >
              테이블
            </Link>
          </span>
          <a
            href="/admin/export"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-dim transition hover:text-ink"
          >
            엑셀 다운로드
          </a>
          <Link
            href="/admin/orders"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-dim transition hover:text-ink"
          >
            발주 요청
          </Link>
          <Link
            href="/admin/intakes"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-dim transition hover:text-ink"
          >
            서류 접수
          </Link>
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

      {ins.total === 0 ? (
        <p className="mt-12 rounded-2xl border border-line bg-surface p-10 text-center text-sm text-dim">
          해당 기간에 접수된 문의가 없습니다.
        </p>
      ) : (
        <>
          {/* 인사이트 */}
          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="eyebrow">Funnel</p>
              <ul className="mt-3 space-y-2 text-sm">
                {ins.funnel.map((f) => (
                  <li key={f.stage} className="flex items-center justify-between gap-3">
                    <span className="text-dim">{STAGE_LABEL[f.stage]}</span>
                    <span className="flex items-baseline gap-2">
                      <span className="font-semibold">{f.reached}</span>
                      {f.conv !== null && (
                        <span className="font-mono text-xs" style={{ color: "var(--accent)" }}>
                          {Math.round(f.conv)}%
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="eyebrow">분야 · 유입</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dim">헬스장</span>
                  <span className="font-semibold">{ins.byVertical.gym}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dim">병원</span>
                  <span className="font-semibold">{ins.byVertical.hospital}</span>
                </div>
                <div className="mt-2 border-t border-line pt-2">
                  {ins.bySource.map((s) => (
                    <div key={s.source} className="flex justify-between">
                      <span className="text-dim">{s.source}</span>
                      <span>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="eyebrow">
                정체 리드 ({STALL_DAYS}일+) · {ins.stalled.length}
              </p>
              {ins.stalled.length === 0 ? (
                <p className="mt-3 text-sm text-dim">정체된 리드가 없습니다. 👍</p>
              ) : (
                <ul className="mt-3 space-y-2.5 text-sm">
                  {ins.stalled.slice(0, 5).map(({ lead, days }) => (
                    <li key={lead.id}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{lead.name}</span>
                        <span className="font-mono text-xs" style={{ color: "#e2574a" }}>
                          {STAGE_LABEL[lead.stage]} {days}일
                        </span>
                      </div>
                      {STAGE_ACTION[lead.stage] && (
                        <p className="text-xs text-dim">→ {STAGE_ACTION[lead.stage]}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* 칸반 보드 */}
          {view === "board" ? (
          <section className="mt-8 overflow-x-auto pb-2">
            <div className="flex gap-4">
              {BOARD.map((stage) => {
                const items = leads.filter((l) => l.stage === stage);
                return (
                  <div key={stage} className="w-72 shrink-0">
                    <div className="flex items-center justify-between px-1 pb-2">
                      <span className="text-sm font-bold">{STAGE_LABEL[stage]}</span>
                      <span className="font-mono text-xs text-dim">{items.length}</span>
                    </div>
                    <div className="space-y-3">
                      {items.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-dim">
                          —
                        </p>
                      ) : (
                        items.map((lead) => (
                          <div key={lead.id} className="rounded-xl border border-line bg-surface p-4">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{lead.name}</span>
                              <span className="font-mono text-xs text-dim">
                                {verticals[lead.vertical]?.label}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-dim">
                              {lead.region || "지역 미입력"} ·{" "}
                              <a href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`} className="hover:opacity-80" style={{ color: "var(--accent)" }}>
                                {lead.phone}
                              </a>
                            </p>
                            <p className="mt-1 text-xs text-dim">
                              접수 {daysSince(lead.createdAt)}일 전 · 현재단계 {daysSince(lead.updatedAt)}일
                            </p>
                            {lead.message && (
                              <p className="mt-2 whitespace-pre-line text-xs text-dim">{lead.message}</p>
                            )}
                            <MoveButtons lead={lead} />
                            <div className="mt-3 border-t border-line pt-3">
                              <RequestIntakeButton leadId={lead.id} />
                              <div className="mt-2 flex justify-end">
                                <DeleteLeadButton id={lead.id} />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          ) : (
          /* 테이블 보기 */
          <section className="mt-8 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-dim">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">접수일시</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">단계</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">분야</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">이름</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">연락처</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">지역</th>
                  <th className="px-4 py-3 font-semibold">업체명 · 관심 품목 · 문의</th>
                  <th className="px-4 py-3 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-t border-line align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-dim">{fmt.format(new Date(lead.createdAt))}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-dim">{STAGE_LABEL[lead.stage]}</td>
                    <td className="whitespace-nowrap px-4 py-3">{verticals[lead.vertical]?.label ?? lead.vertical}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">
                      {lead.name}
                      {lead.email && <span className="block font-normal text-dim">{lead.email}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <a href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`} className="text-gold hover:opacity-80">
                        {lead.phone}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-dim">{lead.region || "—"}</td>
                    <td className="px-4 py-3 text-dim"><span className="whitespace-pre-line">{lead.message || "—"}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-2">
                        <RequestIntakeButton leadId={lead.id} />
                        <DeleteLeadButton id={lead.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          )}
        </>
      )}
    </main>
  );
}
