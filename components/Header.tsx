import Link from "next/link";
import { verticals, otherVertical, type VerticalKey } from "@/lib/verticals";
import Brandmark from "@/components/Brandmark";

export default function Header({ vertical }: { vertical: VerticalKey }) {
  const v = verticals[vertical];
  const other = verticals[otherVertical(vertical)];

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-base/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        {/* 워드마크 + 현재 버티컬 태그 */}
        <div className="flex items-center gap-3">
          <Link href={`/${vertical}`} aria-label="GOLGIUS 홈">
            <Brandmark size="md" />
          </Link>
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}
          >
            {v.label}
          </span>
        </div>

        {/* 내비게이션 (Phase 2에서 섹션 앵커 연결) */}
        <nav className="hidden items-center gap-7 text-sm text-dim md:flex">
          <a href="#cases" className="transition hover:text-ink">실적</a>
          <a href="#strengths" className="transition hover:text-ink">강점</a>
          {v.offerings.length > 0 && (
            <a href="#offerings" className="transition hover:text-ink">취급 품목</a>
          )}
          {vertical === "gym" && (
            <Link href="/gym/shop" className="transition hover:text-ink">기구 스토어</Link>
          )}
          <a href="#process" className="transition hover:text-ink">진행 과정</a>
          <Link href={`/${other.key}`} className="transition hover:text-ink">
            {other.label} 보기
          </Link>
        </nav>

        {/* CTA */}
        <a
          href="#contact"
          className="rounded-full px-4 py-2 text-sm font-semibold text-base transition hover:opacity-90"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {v.hero.cta}
        </a>
      </div>
    </header>
  );
}
