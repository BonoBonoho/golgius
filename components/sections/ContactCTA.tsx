import { verticals, type VerticalKey } from "@/lib/verticals";
import { site, telHref, mailHref } from "@/lib/site";
import ContactForm from "@/components/sections/ContactForm";

// 문의 CTA — #contact
export default function ContactCTA({ vertical }: { vertical: VerticalKey }) {
  const v = verticals[vertical];

  return (
    <section id="contact" className="scroll-mt-20 border-t border-line">
      {/* 상단 액센트 헤어라인으로 마무리 구간 강조 */}
      <div className="h-px w-full" style={{ background: "var(--accent)" }} />

      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-2">
          {/* 좌: 카피 + 연락처 */}
          <div>
            <p className="eyebrow">{v.contact.eyebrow}</p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              {v.contact.title}
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-dim">
              {v.contact.sub}
            </p>

            <dl className="mt-8 space-y-3 border-t border-line pt-8 text-sm">
              <div className="flex gap-4">
                <dt className="w-14 shrink-0 text-dim">전화</dt>
                <dd>
                  <a href={telHref} className="transition hover:opacity-80" style={{ color: "var(--accent)" }}>
                    {site.contact.phone}
                  </a>
                </dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-14 shrink-0 text-dim">이메일</dt>
                <dd>
                  <a href={mailHref} className="transition hover:opacity-80" style={{ color: "var(--accent)" }}>
                    {site.contact.email}
                  </a>
                </dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-14 shrink-0 text-dim">인스타</dt>
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
              <div className="flex gap-4">
                <dt className="w-14 shrink-0 text-dim">주소</dt>
                <dd className="text-dim">{site.contact.address}</dd>
              </div>
            </dl>
          </div>

          {/* 우: 문의 폼 */}
          <ContactForm
            vertical={vertical}
            cta={v.hero.cta}
            centerLabel={v.label}
            interests={v.offerings.map((o) => o.title)}
          />
        </div>
      </div>
    </section>
  );
}
