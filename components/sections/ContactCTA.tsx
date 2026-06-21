import { verticals, type VerticalKey } from "@/lib/verticals";
import { site, telHref, mailHref } from "@/lib/site";

// 문의 CTA — #contact
export default function ContactCTA({ vertical }: { vertical: VerticalKey }) {
  const v = verticals[vertical];

  return (
    <section id="contact" className="scroll-mt-20 border-t border-line">
      {/* 상단 액센트 헤어라인으로 마무리 구간 강조 */}
      <div className="h-px w-full" style={{ background: "var(--accent)" }} />

      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="eyebrow">{v.contact.eyebrow}</p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              {v.contact.title}
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-dim">
              {v.contact.sub}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href={telHref}
                className="rounded-full px-6 py-3 text-sm font-semibold text-base transition hover:opacity-90"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {v.hero.cta}
              </a>
              <a
                href={mailHref}
                className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink"
              >
                이메일로 문의
              </a>
            </div>
          </div>

          {/* 연락처 카드 */}
          <div className="rounded-2xl border border-line bg-surface p-7">
            <p className="eyebrow">Contact</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-dim">대표</dt>
                <dd>{site.contact.ceo}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-dim">전화</dt>
                <dd>
                  <a href={telHref} className="transition hover:opacity-80" style={{ color: "var(--accent)" }}>
                    {site.contact.phone}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-dim">이메일</dt>
                <dd>
                  <a href={mailHref} className="transition hover:opacity-80" style={{ color: "var(--accent)" }}>
                    {site.contact.email}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-dim">인스타</dt>
                <dd>
                  <a
                    href={site.contact.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition hover:opacity-80"
                    style={{ color: "var(--accent)" }}
                  >
                    {site.contact.instagram}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-dim">주소</dt>
                <dd className="text-right">{site.contact.address}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
