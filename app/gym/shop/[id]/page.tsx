import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct } from "@/lib/products";
import ProductImage, { formatPrice } from "@/components/shop/ProductImage";
import AddToCartButton from "@/components/shop/AddToCartButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p || p.status !== "active") return { title: "기구 스토어 — 골지어스" };
  return { title: `${p.name} — 골지어스 기구 스토어`, description: p.summary };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p || p.status !== "active") notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 md:py-20">
      <Link href="/gym/shop" className="text-sm text-dim transition hover:text-ink">
        ← 기구 스토어
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* 이미지 */}
        <div>
          <div className="overflow-hidden rounded-2xl border border-line">
            <ProductImage
              src={p.images[0]}
              alt={p.name}
              label={p.category}
              className="aspect-[4/3] h-auto w-full"
            />
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {p.images.slice(1, 5).map((img) => (
                <div key={img} className="overflow-hidden rounded-xl border border-line">
                  <ProductImage
                    src={img}
                    alt={p.name}
                    label={p.category}
                    className="aspect-square h-auto w-full"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 정보 */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs tracking-wider" style={{ color: "var(--accent)" }}>
              {p.category}
            </span>
            {p.featured && (
              <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] tracking-wider text-dim">
                BEST
              </span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight">{p.name}</h1>
          <p className="mt-1 font-mono text-sm text-dim">{p.brand}</p>

          <p
            className="mt-5 text-2xl font-extrabold"
            style={p.price === null ? { color: "var(--accent)" } : undefined}
          >
            {formatPrice(p.price)}
          </p>
          {p.price !== null && (
            <p className="mt-1 text-xs text-dim">
              표시 가격은 단품 기준입니다. 수량·구성에 따라 견적가가 조정됩니다.
            </p>
          )}

          <p className="mt-6 text-base leading-relaxed text-dim">{p.summary}</p>

          {p.specs.length > 0 && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-line">
              <table className="w-full text-left text-sm">
                <tbody>
                  {p.specs.map((s) => (
                    <tr key={s.label} className="border-b border-line last:border-b-0">
                      <th className="w-32 bg-surface px-4 py-3 font-semibold text-dim">{s.label}</th>
                      <td className="px-4 py-3">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8">
            <AddToCartButton product={{ id: p.id, name: p.name, price: p.price }} />
          </div>

          <p className="mt-6 rounded-xl border border-line bg-surface p-4 text-xs leading-relaxed text-dim">
            골지어스 기구는 견적 확정 후 설치·배치 컨설팅과 함께 공급됩니다. 공간
            동선에 맞는 최적 배치까지 한 팀이 책임집니다.
          </p>
        </div>
      </div>
    </div>
  );
}
