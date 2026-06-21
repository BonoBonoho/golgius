import { verticals, type VerticalKey } from "@/lib/verticals";

// 강점 — #strengths
export default function Strengths({ vertical }: { vertical: VerticalKey }) {
  const v = verticals[vertical];

  return (
    <section id="strengths" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <p className="eyebrow">Why Golgius</p>
        <h2 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          왜 골지어스인가
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {v.strengths.map((s) => (
            <div
              key={s.no}
              className="rounded-2xl border border-line bg-surface p-7 transition hover:border-[var(--accent)]"
            >
              <span
                className="font-mono text-sm font-semibold"
                style={{ color: "var(--accent)" }}
              >
                {s.no}
              </span>
              <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-dim">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
