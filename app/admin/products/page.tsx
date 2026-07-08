import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/admin";
import { getProducts, getProduct, isProductsPersistent } from "@/lib/products";
import { toggleProductStatus, deleteProduct, removeProductImage } from "@/app/actions/products";
import ProductForm from "@/components/admin/ProductForm";
import ProductImage, { formatPrice } from "@/components/shop/ProductImage";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  if (!(await isAuthed())) redirect("/admin/login");

  const sp = await searchParams;
  const editing = sp.edit ? await getProduct(sp.edit) : null;
  const products = await getProducts({ includeHidden: true });

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">기구 상품 관리</h1>
          <p className="mt-1 text-sm text-dim">
            총 {products.length}개 · 스토어:{" "}
            <Link href="/gym/shop" className="text-gold hover:opacity-80" target="_blank">
              /gym/shop
            </Link>
            {!isProductsPersistent() && (
              <span style={{ color: "#e2574a" }}>
                {" "}· 임시 저장(메모리) — PRODUCTS_TABLE 설정 시 DynamoDB에 영구 보관됩니다
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editing && (
            <Link
              href="/admin/products"
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-dim transition hover:text-ink"
            >
              + 새 상품 등록으로
            </Link>
          )}
          <Link
            href="/admin"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-dim transition hover:text-ink"
          >
            ← 리드 관리
          </Link>
        </div>
      </div>

      {/* 등록/수정 폼 */}
      <div className="mt-8">
        <ProductForm key={editing?.id ?? "new"} product={editing ?? undefined} />
      </div>

      {/* 수정 중 — 기존 이미지 관리 */}
      {editing && editing.images.length > 0 && (
        <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold">등록된 이미지 ({editing.images.length})</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {editing.images.map((img) => (
              <div key={img} className="w-32">
                <div className="overflow-hidden rounded-xl border border-line">
                  <ProductImage src={img} alt={editing.name} label={editing.category} className="aspect-square h-auto w-full" />
                </div>
                <form action={removeProductImage} className="mt-1.5 text-center">
                  <input type="hidden" name="id" value={editing.id} />
                  <input type="hidden" name="path" value={img} />
                  <button className="text-xs text-dim transition hover:text-ink">이미지 삭제</button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 상품 목록 */}
      {products.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-line bg-surface p-10 text-center text-sm text-dim">
          등록된 상품이 없습니다. 위 폼에서 첫 상품을 등록하세요.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-dim">
              <tr>
                <th className="px-4 py-3 font-semibold">상품</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">카테고리</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">가격</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">상태</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">등록일</th>
                <th className="px-4 py-3 font-semibold">관리</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-line align-middle">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line">
                        <ProductImage src={p.images[0]} alt={p.name} label={p.category.slice(0, 2)} className="h-full w-full" />
                      </div>
                      <div>
                        <span className="font-semibold">{p.nameKo || p.name}</span>
                        {p.featured && (
                          <span className="ml-2 rounded-full border border-line px-1.5 py-0.5 font-mono text-[10px] text-gold">BEST</span>
                        )}
                        <span className="block text-xs text-dim">
                          {p.nameKo ? `${p.name} · ${p.brand}` : p.brand}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-dim">{p.category}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatPrice(p.price)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {p.status === "active" ? (
                      <span className="text-gold">공개</span>
                    ) : (
                      <span className="text-dim">숨김</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-dim">{fmt.format(new Date(p.createdAt))}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/products?edit=${p.id}`}
                        className="rounded-md border border-line px-2.5 py-1 text-xs text-dim transition hover:text-ink"
                      >
                        수정
                      </Link>
                      <form action={toggleProductStatus}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="to" value={p.status === "active" ? "hidden" : "active"} />
                        <button className="rounded-md border border-line px-2.5 py-1 text-xs text-dim transition hover:text-ink">
                          {p.status === "active" ? "숨기기" : "공개"}
                        </button>
                      </form>
                      <form action={deleteProduct}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="rounded-md border border-line px-2.5 py-1 text-xs transition hover:border-[#e2574a]" style={{ color: "#e2574a" }}>
                          삭제
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
