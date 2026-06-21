import { verticals, type VerticalKey } from "@/lib/verticals";

// 취급 품목 A-Z — "헬스장의 모든 것을 한 곳에서"
export default function Offerings({ vertical }: { vertical: VerticalKey }) {
  const v = verticals[vertical];
  const groups = v.offerings;
  if (!groups || groups.length === 0) return null;

  const totalItems = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section id="offerings" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <p className="eyebrow">A to Z</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          헬스장에 필요한 모든 것,<br className="hidden sm:block" /> 골지어스 한 곳에서
        </h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-dim">
          AI 경영 솔루션부터 기구·인테리어·IT·보안·F&B까지 — 오픈에 필요한 전 영역을 한 팀이 책임집니다.
        </p>

        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-y border-line py-5">
          <span className="text-sm text-dim">
            <span className="font-extrabold text-ink">{groups.length}</span>개 영역
          </span>
          <span className="text-sm text-dim">
            <span className="font-extrabold text-ink">{totalItems}</span>개 품목·서비스
          </span>
          <span className="text-sm text-dim">기획 · 시공 · 운영 일괄</span>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div
              key={g.tag}
              className="rounded-2xl border border-line bg-base p-6 transition hover:border-[var(--accent)]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-bold">{g.title}</h3>
                <span className="font-mono text-xs tracking-wider" style={{ color: "var(--accent)" }}>
                  {g.tag}
                </span>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {g.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-line px-3 py-1 text-xs text-dim"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
