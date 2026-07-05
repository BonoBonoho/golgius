"use client";

import Link from "next/link";
import { useCart } from "@/components/shop/CartProvider";

// 쇼핑몰 헤더의 장바구니 링크 + 담긴 수량 배지
export default function CartLink() {
  const { count } = useCart();
  return (
    <Link
      href="/gym/shop/cart"
      className="relative rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-[var(--accent)]"
    >
      견적 바구니
      {count > 0 && (
        <span
          className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[11px] font-bold text-base"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
