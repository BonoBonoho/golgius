import type { Metadata } from "next";
import CartView from "@/components/shop/CartView";

export const metadata: Metadata = {
  title: "견적 바구니 — 골지어스 기구 스토어",
  description: "담아둔 기구를 확인하고 한 번에 견적을 요청하세요.",
};

export default function CartPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 md:py-20">
      <p className="eyebrow">Quote Cart</p>
      <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
        견적 바구니
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-dim">
        담아둔 기구를 확인하고 견적을 요청하세요. 결제 없이 담당자가 최종 견적과
        설치 일정을 안내해 드립니다.
      </p>
      <div className="mt-10">
        <CartView />
      </div>
    </div>
  );
}
