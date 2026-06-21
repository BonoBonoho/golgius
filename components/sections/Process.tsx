import { verticals, type VerticalKey } from "@/lib/verticals";

// 진행 과정 — #process
export default function Process({ vertical }: { vertical: VerticalKey }) {
  const v = verticals[vertical];

  return (
    <section id="process" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <p className="eyebrow">Process</p>
        <h2 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          오픈까지, 한 팀이 끝까지
        </h2>

        <ol className="mt-12 space-y-px overflow-hidden rounded-2xl border border-line">
          {v.process.map((step) => (
            <li
              key={step.no}
              className="flex flex-col gap-2 bg-base p-6 md:flex-row md:items-baseline md:gap-8"
            >
              <span
                className="font-mono text-sm font-semibold md:w-16 md:shrink-0"
                style={{ color: "var(--accent)" }}
              >
                {step.no}
              </span>
              <div className="md:flex md:flex-1 md:items-baseline md:gap-8">
                <h3 className="text-lg font-bold md:w-56 md:shrink-0">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-dim md:mt-0">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
