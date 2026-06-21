import { verticals, type VerticalKey } from "@/lib/verticals";

// 후기 — #reviews
export default function Reviews({ vertical }: { vertical: VerticalKey }) {
  const v = verticals[vertical];

  return (
    <section id="reviews" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <p className="eyebrow">Voices</p>
        <h2 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          먼저 연 분들의 이야기
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {v.reviews.map((r) => (
            <figure key={r.author} className="rounded-2xl border border-line bg-base p-7">
              <span
                className="font-mono text-2xl font-bold"
                style={{ color: "var(--accent)" }}
                aria-hidden
              >
                &ldquo;
              </span>
              <blockquote className="mt-2 text-base leading-relaxed">{r.quote}</blockquote>
              <figcaption className="mt-5 text-sm text-dim">
                <span className="font-semibold text-ink">{r.author}</span> · {r.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
