"use client";

// 관리자 공통 네비 — 모든 admin 페이지 상단에 통일 적용.
// 관리 탭(리드/발주/서류/상품/설정) + 홈 링크. 현재 경로는 골드로 강조.

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "리드 관리" },
  { href: "/admin/orders", label: "발주 요청" },
  { href: "/admin/intakes", label: "서류 접수" },
  { href: "/admin/products", label: "기구 상품" },
  { href: "/admin/settings", label: "알림 설정" },
];

export default function AdminNav() {
  const pathname = usePathname();
  // 로그인·회원가입 화면에는 관리 네비를 숨긴다(인증 전).
  if (pathname === "/admin/login" || pathname === "/admin/signup") return null;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-base/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-lg font-extrabold tracking-tight">
            GOLGIUS
          </Link>
          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[0.65rem] text-dim">
            ADMIN
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {TABS.map((t) => {
            const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`transition ${active ? "font-semibold text-gold" : "text-dim hover:text-ink"}`}
              >
                {t.label}
              </Link>
            );
          })}
          <Link href="/" className="text-dim transition hover:text-ink">
            홈 →
          </Link>
        </nav>
      </div>
    </header>
  );
}
