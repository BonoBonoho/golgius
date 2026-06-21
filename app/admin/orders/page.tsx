import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/admin";
import {
  getOrders,
  signedUrl,
  isPersistent,
  ORDER_FLOW,
  type Order,
  type OrderStatus,
} from "@/lib/orders";
import { setOrderStatus } from "@/app/actions/orders";
import DeleteOrderButton from "@/components/admin/DeleteOrderButton";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<OrderStatus, string> = {
  requested: "접수",
  quoted: "견적발송",
  confirmed: "확정",
  produced: "제작완료",
  canceled: "취소",
};

const fmt = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

function StatusButtons({ order }: { order: Order }) {
  const btn =
    "rounded-md border px-2.5 py-1 text-xs font-semibold transition";
  const targets: OrderStatus[] = [...ORDER_FLOW, "canceled"];
  return (
    <div className="flex flex-wrap gap-1.5">
      {targets.map((s) => {
        const active = order.status === s;
        return (
          <form action={setOrderStatus} key={s}>
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value={s} />
            <button
              className={btn}
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

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  if (!(await isAuthed())) redirect("/admin");

  const sp = await searchParams;
  const view: "cards" | "table" = sp.view === "table" ? "table" : "cards";

  const orders = await getOrders();
  const withFiles = await Promise.all(
    orders.map(async (o) => ({
      order: o,
      fileUrl: o.designFile ? await signedUrl(o.designFile) : null,
    }))
  );

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">발주 요청</h1>
          <p className="mt-1 text-sm text-dim">
            총 {orders.length}건
            {!isPersistent() && (
              <span style={{ color: "#e2574a" }}>
                {" "}· 임시 저장(메모리) — Supabase 연결 시 영구 보관됩니다
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex overflow-hidden rounded-full border border-line">
            <Link
              href="/admin/orders"
              className="px-3 py-1 text-xs font-semibold transition"
              style={view === "cards" ? { backgroundColor: "var(--accent)", color: "var(--color-base)" } : { color: "var(--color-dim)" }}
            >
              카드
            </Link>
            <Link
              href="/admin/orders?view=table"
              className="px-3 py-1 text-xs font-semibold transition"
              style={view === "table" ? { backgroundColor: "var(--accent)", color: "var(--color-base)" } : { color: "var(--color-dim)" }}
            >
              테이블
            </Link>
          </span>
          <a
            href="/admin/orders/export"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-dim transition hover:text-ink"
          >
            엑셀 다운로드
          </a>
          <Link
            href="/admin"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-dim transition hover:text-ink"
          >
            ← 리드 관리
          </Link>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-line bg-surface p-10 text-center text-sm text-dim">
          아직 접수된 발주 요청이 없습니다.
        </p>
      ) : view === "cards" ? (
        <div className="mt-8 space-y-4">
          {withFiles.map(({ order, fileUrl }) => (
            <div key={order.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{order.name}</span>
                    <span className="font-mono text-xs text-dim">{order.productType}</span>
                  </div>
                  <p className="mt-1 text-sm text-dim">
                    <a href={`tel:${order.phone.replace(/[^0-9+]/g, "")}`} className="text-gold hover:opacity-80">
                      {order.phone}
                    </a>
                    {order.email && <> · {order.email}</>}
                  </p>
                </div>
                <span className="font-mono text-xs text-dim">{fmt.format(new Date(order.createdAt))}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-dim">
                <span>색상: {order.options.color || "—"}</span>
                <span>사이즈: {order.options.size || "—"}</span>
                <span>수량: {order.options.quantity || "—"}</span>
                <span>
                  시안:{" "}
                  {fileUrl ? (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-gold hover:opacity-80">
                      파일 보기
                    </a>
                  ) : order.designFile ? (
                    order.designFile
                  ) : (
                    "없음"
                  )}
                </span>
              </div>

              {order.message && (
                <p className="mt-2 text-sm text-dim">{order.message}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <StatusButtons order={order} />
                <DeleteOrderButton id={order.id} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 테이블 보기 */
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-dim">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">접수일시</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">상태</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">이름</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">연락처</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">품목</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">옵션</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">시안</th>
                <th className="px-4 py-3 font-semibold">요청</th>
                <th className="px-4 py-3 font-semibold">관리</th>
              </tr>
            </thead>
            <tbody>
              {withFiles.map(({ order, fileUrl }) => (
                <tr key={order.id} className="border-t border-line align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-dim">{fmt.format(new Date(order.createdAt))}</td>
                  <td className="whitespace-nowrap px-4 py-3">{STATUS_LABEL[order.status]}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">
                    {order.name}
                    {order.email && <span className="block font-normal text-dim">{order.email}</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <a href={`tel:${order.phone.replace(/[^0-9+]/g, "")}`} className="text-gold hover:opacity-80">
                      {order.phone}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{order.productType}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-dim">
                    {[order.options.color, order.options.size, order.options.quantity].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {fileUrl ? (
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-gold hover:opacity-80">
                        파일 보기
                      </a>
                    ) : order.designFile ? (
                      <span className="text-dim">{order.designFile}</span>
                    ) : (
                      <span className="text-dim">없음</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-dim">{order.message || "—"}</td>
                  <td className="px-4 py-3"><DeleteOrderButton id={order.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
