import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/admin";
import { getIntakes, signedUrl, isPersistent, type Intake, type IntakeStatus } from "@/lib/intakes";
import { setIntakeStatus } from "@/app/actions/intakes";
import DeleteIntakeButton from "@/components/admin/DeleteIntakeButton";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<IntakeStatus, string> = {
  received: "접수",
  reviewed: "확인중",
  done: "완료",
};
const STATUS_FLOW: IntakeStatus[] = ["received", "reviewed", "done"];

const fmt = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

function StatusButtons({ intake }: { intake: Intake }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_FLOW.map((s) => {
        const active = intake.status === s;
        return (
          <form action={setIntakeStatus} key={s}>
            <input type="hidden" name="id" value={intake.id} />
            <input type="hidden" name="status" value={s} />
            <button
              className="rounded-md border px-2.5 py-1 text-xs font-semibold transition"
              disabled={active}
              style={
                active
                  ? { color: "var(--accent)", borderColor: "var(--accent)" }
                  : { color: "var(--color-dim)", borderColor: "var(--color-line)" }
              }
            >
              {STATUS_LABEL[s]}
            </button>
          </form>
        );
      })}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-dim">{label}</dt>
      <dd className="flex-1">{children}</dd>
    </div>
  );
}

export default async function IntakesPage() {
  if (!(await isAuthed())) redirect("/admin");

  const intakes = await getIntakes();
  const withUrls = await Promise.all(
    intakes.map(async (it) => ({
      intake: it,
      bizUrl: it.bizFile ? await signedUrl(it.bizFile) : null,
      bankUrls: await Promise.all(it.bankFiles.map((p) => signedUrl(p))),
    }))
  );

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">서류·정보 제출</h1>
          <p className="mt-1 text-sm text-dim">
            총 {intakes.length}건
            {!isPersistent() && (
              <span style={{ color: "#e2574a" }}> · 임시 저장(메모리) — Supabase 연결 시 영구 보관됩니다</span>
            )}
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-dim transition hover:text-ink"
        >
          ← 리드 관리
        </Link>
      </div>

      {intakes.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-line bg-surface p-10 text-center text-sm text-dim">
          아직 제출된 서류·정보가 없습니다. 고객에게{" "}
          <code className="font-mono text-ink">/intake</code> 링크를 보내주세요.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {withUrls.map(({ intake, bizUrl, bankUrls }) => (
            <div key={intake.id} className="rounded-2xl border border-line bg-surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{intake.name}</span>
                  <span className="font-mono text-xs text-dim">{STATUS_LABEL[intake.status]}</span>
                </div>
                <span className="font-mono text-xs text-dim">{fmt.format(new Date(intake.createdAt))}</span>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <Row label="휴대폰">
                  <a href={`tel:${intake.phone.replace(/[^0-9+]/g, "")}`} className="text-gold hover:opacity-80">
                    {intake.phone}
                  </a>
                  {intake.ext && <span className="text-dim"> · 내선 {intake.ext}</span>}
                </Row>
                <Row label="이메일">
                  <a href={`mailto:${intake.email}`} className="text-gold hover:opacity-80">
                    {intake.email}
                  </a>
                </Row>
                <Row label="설치 주소">{intake.address}</Row>
                <Row label="출금일">{intake.withdrawalDay}일</Row>
                <Row label="설치요청일">{intake.installDate || "—"}</Row>
                {intake.note && <Row label="요청">{intake.note}</Row>}
                <Row label="사업자등록증">
                  {bizUrl ? (
                    <a href={bizUrl} target="_blank" rel="noopener noreferrer" className="text-gold hover:opacity-80">
                      파일 보기
                    </a>
                  ) : intake.bizFile ? (
                    <span className="text-dim">{intake.bizFile}</span>
                  ) : (
                    <span className="text-dim">없음</span>
                  )}
                </Row>
                <Row label="통장·카드">
                  {bankUrls.length === 0 ? (
                    <span className="text-dim">없음</span>
                  ) : (
                    <span className="flex flex-wrap gap-3">
                      {bankUrls.map((u, i) =>
                        u ? (
                          <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="text-gold hover:opacity-80">
                            파일 {i + 1}
                          </a>
                        ) : (
                          <span key={i} className="text-dim">{intake.bankFiles[i]}</span>
                        )
                      )}
                    </span>
                  )}
                </Row>
              </dl>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <StatusButtons intake={intake} />
                <DeleteIntakeButton id={intake.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
