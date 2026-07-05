import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import Brandmark from "@/components/Brandmark";
import Footer from "@/components/Footer";
import CartProvider from "@/components/shop/CartProvider";
import CartLink from "@/components/shop/CartLink";
import { verticals } from "@/lib/verticals";

// 기구 스토어 전용 셸 — 헬스 액센트 + 장바구니 컨텍스트
export default function ShopLayout({ children }: { children: ReactNode }) {
  const style = { "--accent": verticals.gym.accent } as CSSProperties;

  return (
    <div style={style} className="flex min-h-screen flex-col">
      <CartProvider>
        <header className="sticky top-0 z-50 border-b border-line bg-base/80 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <Link href="/gym" aria-label="GOLGIUS 헬스장">
                <Brandmark size="md" />
              </Link>
              <Link
                href="/gym/shop"
                className="rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}
              >
                기구 스토어
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/gym" className="hidden text-sm text-dim transition hover:text-ink sm:block">
                ← 헬스장 홈
              </Link>
              <CartLink />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <Footer />
      </CartProvider>
    </div>
  );
}
