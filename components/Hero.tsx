import { verticals, type VerticalKey } from "@/lib/verticals";
import CountUp from "@/components/CountUp";

// Phase 1 스텁. Phase 2에서 본격 히어로로 확장됩니다.
export default function Hero({ vertical }: { vertical: VerticalKey }) {
  const v = verticals[vertical];

  return (
    <section className="relative overflow-hidden">
      {/* 상단 골드 헤어라인 — 명함의 절제된 라인 무드 */}
      <div className="h-px w-full" style={{ background: "var(--accent)" }} />

      <div className="mx-auto max-w-6xl px-5 py-24 md:py-32">
        <p className="eyebrow">{v.hero.eyebrow}</p>

        <h1 className="mt-5 max-w-3xl whitespace-pre-line text-4xl font-extrabold leading-[1.15] tracking-tight md:text-6xl">
          {v.hero.title}
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-dim md:text-lg">
          {v.hero.sub}
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <a
            href="#contact"
            className="rounded-full px-6 py-3 text-sm font-semibold text-base transition hover:opacity-90"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {v.hero.cta}
          </a>
          <a
            href="#strengths"
            className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink"
          >
            왜 골지어스인가
          </a>
        </div>

        {/* 실적 — 명함의 핵심 수치를 신뢰 앵커로 */}
        <div className="mt-16 flex flex-wrap gap-12 border-t border-line pt-8">
          {v.stats.map((s) => (
            <div key={s.label}>
              <div
                className="text-3xl font-extrabold md:text-4xl"
                style={{ color: "var(--accent)" }}
              >
                <CountUp value={s.value} />
              </div>
              <div className="mt-1 text-sm text-dim">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
