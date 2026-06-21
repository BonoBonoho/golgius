import Link from "next/link";
import { site } from "@/lib/site";

export default function Footer() {
  const c = site.contact;

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-lg font-extrabold tracking-tight">{site.name}</div>
            <p className="mt-1 text-sm text-dim">{site.tagline}</p>
            <p className="mt-4 max-w-sm text-sm text-dim">{site.description}</p>
            <Link
              href="/order"
              className="mt-4 inline-block text-sm font-semibold text-gold transition hover:opacity-80"
            >
              단체복·수건 발주 요청 →
            </Link>
          </div>

          <div className="text-sm">
            <p className="eyebrow mb-3">Contact</p>
            <dl className="space-y-1.5 text-dim">
              <div className="flex gap-2">
                <dt className="text-ink">대표</dt>
                <dd>{c.ceo}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink">전화</dt>
                <dd>{c.phone}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink">이메일</dt>
                <dd>{c.email}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink">인스타</dt>
                <dd>{c.instagram}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink">주소</dt>
                <dd>{c.address}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-10 border-t border-line pt-6 text-xs text-dim">
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
