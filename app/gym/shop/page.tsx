import Link from "next/link";
import type { Metadata } from "next";
import {
  getProducts,
  PRODUCT_CATEGORIES,
  PRODUCT_BODY_PARTS,
  PRODUCT_DRIVE_TYPES,
} from "@/lib/products";
import { getShopCopy } from "@/lib/settings";
import ProductImage, { formatPrice } from "@/components/shop/ProductImage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "기구 스토어 — 골지어스",
  description:
    "헬스 기구 담아서 한번에 견적 받으세요. Plate Loaded부터 유산소까지 골지어스가 검증한 라인업.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; body?: string; drive?: string }>;
}) {
  const sp = await searchParams;
  const category = PRODUCT_CATEGORIES.find((c) => c === sp.category) ?? null;
  const body = PRODUCT_BODY_PARTS.find((b) => b === sp.body) ?? null;
  const drive = PRODUCT_DRIVE_TYPES.find((d) => d === sp.drive) ?? null;

  const [all, copy] = await Promise.all([getProducts(), getShopCopy()]);
  const products = all.filter(
    (p) =>
      (!category || p.category === category) &&
      (!body || p.bodyPart === body) &&
      (!drive || p.driveType === drive)
  );

  // 현재 필터 조합 유지한 링크 생성
  const filterHref = (next: { category?: string | null; body?: string | null; drive?: string | null }) => {
    const params = new URLSearchParams();
    const c = next.category === undefined ? category : next.category;
    const b = next.body === undefined ? body : next.body;
    const d = next.drive === undefined ? drive : next.drive;
    if (c) params.set("category", c);
    if (b) params.set("body", b);
    if (d) params.set("drive", d);
    const qs = params.toString();
    return qs ? `/gym/shop?${qs}` : "/gym/shop";
  };

  const tab = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
      active ? "" : "border-line text-dim hover:text-ink"
    }`;
  const activeStyle = { borderColor: "var(--accent)", color: "var(--accent)" } as const;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 md:py-20">
      <p className="eyebrow">Gear Store</p>
      <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
        {copy.title}
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-dim">{copy.sub}</p>

      {/* 시리즈 필터 */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[11px] tracking-wider text-dim">시리즈</span>
        <Link href={filterHref({ category: null })} className={tab(category === null)} style={category === null ? activeStyle : undefined}>
          전체
        </Link>
        {PRODUCT_CATEGORIES.map((c) => (
          <Link key={c} href={filterHref({ category: c })} className={tab(category === c)} style={category === c ? activeStyle : undefined}>
            {c}
          </Link>
        ))}
      </div>

      {/* 운동 부위 필터 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[11px] tracking-wider text-dim">부위</span>
        <Link href={filterHref({ body: null })} className={tab(body === null)} style={body === null ? activeStyle : undefined}>
          전체
        </Link>
        {PRODUCT_BODY_PARTS.map((b) => (
          <Link key={b} href={filterHref({ body: b })} className={tab(body === b)} style={body === b ? activeStyle : undefined}>
            {b}
          </Link>
        ))}
      </div>

      {/* 구동 방식 필터 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[11px] tracking-wider text-dim">구동</span>
        <Link href={filterHref({ drive: null })} className={tab(drive === null)} style={drive === null ? activeStyle : undefined}>
          전체
        </Link>
        {PRODUCT_DRIVE_TYPES.map((d) => (
          <Link key={d} href={filterHref({ drive: d })} className={tab(drive === d)} style={drive === d ? activeStyle : undefined}>
            {d}
          </Link>
        ))}
      </div>

      {/* 상품 그리드 */}
      {products.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-line bg-surface p-10 text-center text-sm text-dim">
          {category || body || drive
            ? "선택한 조건에 맞는 상품이 없습니다."
            : "등록된 상품이 없습니다."}
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
                {(p.bodyPart || p.bodyDetail) && (
                  <p className="mt-1 text-xs text-dim">
                    {[p.bodyPart, p.bodyDetail].filter(Boolean).join(" · ")}
                  </p>
                )}
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
        찾는 기구가 없나요? 표기된 상품 외 기종도 문의 가능합니다.{" "}
        <Link href="/gym#contact" className="font-semibold" style={{ color: "var(--accent)" }}>
          오픈 상담
        </Link>
        으로 문의하시면 센터 규모에 맞는 구성을 제안해 드립니다.
      </p>
    </div>
  );
}
