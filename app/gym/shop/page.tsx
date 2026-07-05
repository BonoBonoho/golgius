import Link from "next/link";
import type { Metadata } from "next";
import { getProducts, PRODUCT_CATEGORIES } from "@/lib/products";
import { getShopCopy } from "@/lib/settings";
import ProductImage, { formatPrice } from "@/components/shop/ProductImage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "기구 스토어 — 골지어스",
  description:
    "헬스 기구 담아서 한번에 견적 받으세요. 웨이트 머신·유산소·프리웨이트까지 골지어스가 검증한 라인업.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const category = PRODUCT_CATEGORIES.find((c) => c === sp.category) ?? null;

  const [all, copy] = await Promise.all([getProducts(), getShopCopy()]);
  const products = category ? all.filter((p) => p.category === category) : all;

  const tab = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
      active ? "" : "border-line text-dim hover:text-ink"
    }`;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 md:py-20">
      <p className="eyebrow">Gear Store</p>
      <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
        {copy.title}
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-dim">{copy.sub}</p>

      {/* 카테고리 필터 */}
      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href="/gym/shop"
          className={tab(category === null)}
          style={category === null ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
        >
          전체
        </Link>
        {PRODUCT_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/gym/shop?category=${encodeURIComponent(c)}`}
            className={tab(category === c)}
            style={category === c ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
          >
            {c}
          </Link>
        ))}
      </div>

      {/* 상품 그리드 */}
      {products.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-line bg-surface p-10 text-center text-sm text-dim">
          {category ? `'${category}' 카테고리에 등록된 상품이 없습니다.` : "등록된 상품이 없습니다."}
        </p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/gym/shop/${p.id}`}
              className="group overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-[var(--accent)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden border-b border-line">
                <ProductImage
                  src={p.images[0]}
                  alt={p.name}
                  label={p.category}
                  className="h-full w-full transition group-hover:scale-[1.02]"
                />
                {p.featured && (
                  <span
                    className="absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-base"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    BEST
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-xs tracking-wider text-dim">{p.brand}</span>
                  <span className="font-mono text-[11px] text-dim">{p.category}</span>
                </div>
                <h2 className="mt-1.5 text-lg font-bold leading-snug">{p.name}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-dim">{p.summary}</p>
                <p
                  className="mt-3 text-base font-extrabold"
                  style={p.price === null ? { color: "var(--accent)" } : undefined}
                >
                  {formatPrice(p.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-12 rounded-2xl border border-line bg-surface p-6 text-sm leading-relaxed text-dim">
        찾는 기구가 없나요? 골지어스는 표기된 상품 외에도 전 브랜드 기구를 취급합니다.{" "}
        <Link href="/gym#contact" className="font-semibold" style={{ color: "var(--accent)" }}>
          오픈 상담
        </Link>
        으로 문의하시면 센터 규모에 맞는 구성을 제안해 드립니다.
      </p>
    </div>
  );
}
