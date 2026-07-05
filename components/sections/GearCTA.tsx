import Link from "next/link";

// 기구 스토어 진입 — 헬스장 페이지 CTA (ApparelCTA 패턴)
export default function GearCTA() {
  return (
    <section id="gear" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="flex flex-col gap-7 rounded-2xl border border-line bg-base p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <p className="eyebrow">Gear Store</p>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">
              헬스 기구 담아서 한번에 견적 받으세요
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim md:text-base">
              웨이트 머신부터 유산소·프리웨이트까지 — 골지어스가 검증한 기구를
              바구니에 담으면 설치·배치 컨설팅과 함께 견적을 보내드립니다.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href="/gym/shop"
              className="rounded-full px-6 py-3 text-sm font-semibold text-base transition hover:opacity-90"
              style={{ backgroundColor: "var(--accent)" }}
            >
              기구 스토어 가기
            </Link>
            <Link
              href="/gym/shop/cart"
              className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink"
            >
              견적 바구니
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
