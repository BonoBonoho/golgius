import Link from "next/link";

// 단체복 디자인/발주 진입 — 헬스장 페이지의 자연스러운 CTA
export default function ApparelCTA() {
  return (
    <section id="apparel" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="flex flex-col gap-7 rounded-2xl border border-line bg-base p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <p className="eyebrow">Apparel</p>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">
              우리 센터 단체복, 직접 디자인하고 발주까지
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim md:text-base">
              운동복·수건에 로고를 올려 실시간으로 미리보고, 그대로 견적을 요청하세요.
              기획부터 제작까지 골지어스가 함께합니다.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href="/order/design"
              className="rounded-full px-6 py-3 text-sm font-semibold text-base transition hover:opacity-90"
              style={{ backgroundColor: "var(--accent)" }}
            >
              디자인 스튜디오
            </Link>
            <Link
              href="/order"
              className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink"
            >
              발주 요청
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
