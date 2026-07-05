"use client";

// 견적 바구니 화면 — 품목 목록(수량 조절) + 견적 요청 폼

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useCart } from "@/components/shop/CartProvider";
import { formatPrice } from "@/components/shop/ProductImage";
import { submitShopQuote, type ShopQuoteState } from "@/app/actions/shop";
import { deriveSource } from "@/lib/attribution";

const inputCls =
  "mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]";

export default function CartView() {
  const cart = useCart();
  const [state, formAction, pending] = useActionState<ShopQuoteState, FormData>(
    submitShopQuote,
    { ok: false, message: "" }
  );
  const [source, setSource] = useState("direct");

  useEffect(() => {
    setSource(deriveSource());
  }, []);

  // 접수 성공 → 바구니 비움
  useEffect(() => {
    if (state.ok && state.message) cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok, state.message]);

  if (state.ok && state.message) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center">
        <div className="text-3xl" style={{ color: "var(--accent)" }} aria-hidden>
          ✓
        </div>
        <p className="mt-4 text-lg font-bold">{state.message}</p>
        <p className="mt-2 text-sm text-dim">
          견적서와 함께 설치·배치 안내를 드리겠습니다.
        </p>
        <Link
          href="/gym/shop"
          className="mt-6 inline-block rounded-full border border-line px-6 py-2.5 text-sm font-semibold text-dim transition hover:text-ink"
        >
          스토어로 돌아가기
        </Link>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center">
        <p className="font-bold">바구니가 비어 있습니다</p>
        <p className="mt-2 text-sm text-dim">기구를 담고 한 번에 견적을 요청하세요.</p>
        <Link
          href="/gym/shop"
          className="mt-6 inline-block rounded-full px-6 py-2.5 text-sm font-semibold text-base transition hover:opacity-90"
          style={{ backgroundColor: "var(--accent)" }}
        >
          기구 보러 가기
        </Link>
      </div>
    );
  }

  const estimated = cart.items.reduce((n, i) => n + (i.price ?? 0) * i.qty, 0);
  const hasQuoteOnly = cart.items.some((i) => i.price === null);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      {/* 품목 목록 */}
      <div className="space-y-3">
        {cart.items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5"
          >
            <div className="min-w-0">
              <Link href={`/gym/shop/${item.id}`} className="font-bold hover:underline">
                {item.name}
              </Link>
              <p className="mt-0.5 text-sm text-dim">
                {item.price !== null
                  ? `${formatPrice(item.price)} × ${item.qty} = ${formatPrice(item.price * item.qty)}`
                  : "견적 문의"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-full border border-line">
                <button
                  type="button"
                  onClick={() => cart.setQty(item.id, item.qty - 1)}
                  className="px-3 py-2 text-sm text-dim transition hover:text-ink"
                  aria-label="수량 줄이기"
                >
                  −
                </button>
                <span className="min-w-8 text-center font-mono text-sm font-semibold">
                  {item.qty}
                </span>
                <button
                  type="button"
                  onClick={() => cart.setQty(item.id, item.qty + 1)}
                  className="px-3 py-2 text-sm text-dim transition hover:text-ink"
                  aria-label="수량 늘리기"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => cart.remove(item.id)}
                className="text-sm text-dim transition hover:text-ink"
              >
                삭제
              </button>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-5">
          <span className="text-sm text-dim">합계 (표시가 기준)</span>
          <span className="text-lg font-extrabold">
            {estimated > 0 ? formatPrice(estimated) : "—"}
            {hasQuoteOnly && (
              <span className="ml-2 text-xs font-normal" style={{ color: "var(--accent)" }}>
                + 견적 문의 품목
              </span>
            )}
          </span>
        </div>
        <p className="px-1 text-xs text-dim">
          표시가는 참고용 단품 기준입니다. 수량·설치 조건을 반영한 최종 견적을 안내해 드립니다.
        </p>
      </div>

      {/* 견적 요청 폼 */}
      <form action={formAction} className="h-fit rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-lg font-extrabold">견적 요청</h2>
        <p className="mt-1 text-sm text-dim">담긴 {cart.count}개 품목 기준으로 견적을 보내드립니다.</p>

        {/* 허니팟 + 컨텍스트 */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <input type="hidden" name="cart" value={JSON.stringify(cart.items)} />
        <input type="hidden" name="source" value={source} />

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm text-dim">이름 / 업체명</span>
            <input name="name" required minLength={2} placeholder="홍길동 / 골지짐" className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm text-dim">연락처</span>
            <input name="phone" type="tel" required placeholder="010-0000-0000" className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm text-dim">이메일 (선택)</span>
            <input name="email" type="email" placeholder="name@example.com" className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm text-dim">설치 지역 (선택)</span>
            <input name="region" placeholder="예: 서울 강남구" className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm text-dim">요청 사항 (선택)</span>
            <textarea
              name="message"
              rows={3}
              placeholder="희망 설치일, 센터 평수, 예산 범위 등을 적어주세요."
              className={`${inputCls} resize-none`}
            />
          </label>
        </div>

        {!state.ok && state.message && (
          <p className="mt-4 text-sm" style={{ color: "#e2574a" }} role="alert">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-full px-6 py-3 text-sm font-semibold text-base transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {pending ? "전송 중…" : "견적 요청하기"}
        </button>
        <p className="mt-3 text-center text-xs text-dim">
          제출 시 견적 상담 목적의 연락처 수집·이용에 동의하는 것으로 간주됩니다.
        </p>
      </form>
    </div>
  );
}
