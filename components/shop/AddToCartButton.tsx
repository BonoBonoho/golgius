"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/CartProvider";

export default function AddToCartButton({
  product,
}: {
  product: { id: string; name: string; price: number | null };
}) {
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    add(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 수량 */}
      <div className="flex items-center rounded-full border border-line">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="px-3.5 py-2.5 text-sm text-dim transition hover:text-ink"
          aria-label="수량 줄이기"
        >
          −
        </button>
        <span className="min-w-8 text-center font-mono text-sm font-semibold">{qty}</span>
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(999, q + 1))}
          className="px-3.5 py-2.5 text-sm text-dim transition hover:text-ink"
          aria-label="수량 늘리기"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="rounded-full px-6 py-3 text-sm font-semibold text-base transition hover:opacity-90"
        style={{ backgroundColor: "var(--accent)" }}
      >
        {added ? "✓ 담았습니다" : "바구니에 담기"}
      </button>

      <button
        type="button"
        onClick={() => {
          add(product, qty);
          router.push("/gym/shop/cart");
        }}
        className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink"
      >
        바로 견적 요청
      </button>
    </div>
  );
}
