import { verticals, type VerticalKey } from "@/lib/verticals";
import CountUp from "@/components/CountUp";
import PartnerMarquee from "@/components/sections/PartnerMarquee";

// 실적 — #cases
export default function Cases({ vertical }: { vertical: VerticalKey }) {
  const v = verticals[vertical];

  return (
    <section id="cases" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <p className="eyebrow">Work</p>
        <h2 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          숫자로 증명한 실적
        </h2>

        {/* 핵심 수치 */}
        <div className="mt-10 flex flex-wrap gap-12 border-y border-line py-8">
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

        {/* 함께 오픈한 센터 로고 마퀴 */}
        <PartnerMarquee vertical={vertical} />

        {/* 원스톱 — 맡기면 한 번에 끝 */}
        <div className="mt-16">
          <p className="eyebrow">All-in-one</p>
          <h3 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">
            맡기면, 한 번에 끝납니다
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim md:text-base">
            기획부터 시공·세팅·운영까지 한 팀이 맡습니다. 여러 업체 찾아다닐 필요 없이, 결정만 하세요.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {v.cases.map((c) => (
              <div key={c.name} className="rounded-2xl border border-line bg-surface p-7">
                <p className="font-mono text-xs tracking-wider" style={{ color: "var(--accent)" }}>
                  {c.meta}
                </p>
                <h4 className="mt-3 text-lg font-bold">{c.name}</h4>
                <p className="mt-2 text-sm leading-relaxed text-dim">{c.result}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
