"use client";

// 고객용 공통 헤더 — 모든 발주/디자인/서류 페이지 상단에 통일 적용.
// GOLGIUS 워드마크(→홈) + 서비스 네비. 현재 경로는 골드로 강조.

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/order/namecard", label: "명함 디자인" },
  { href: "/order", label: "발주 요청" },
  { href: "/order/design", label: "수건·운동복 디자인" },
  { href: "/intake", label: "서류 접수" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-base/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          GOLGIUS
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`transition ${active ? "font-semibold text-gold" : "text-dim hover:text-ink"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
