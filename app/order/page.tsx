import Link from "next/link";
import type { Metadata } from "next";
import OrderForm from "@/components/OrderForm";

export const metadata: Metadata = {
  title: "단체복·수건 발주 — 골지어스",
  description: "운동복·수건 등 단체 제작 발주를 골지어스에 요청하세요. 시안 업로드 후 견적을 받아보실 수 있습니다.",
};

export default function OrderPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            GOLGIUS
          </Link>
          <Link href="/" className="text-sm text-dim transition hover:text-ink">
            ← 홈으로
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16">
        <p className="eyebrow">Order</p>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          단체복·수건 발주 요청
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-dim">
          운동복·수건 등 단체 제작이 필요하신가요? 품목과 수량, 로고 시안을 남겨주시면
          담당자가 견적을 빠르게 안내해 드립니다.
        </p>

        <Link
          href="/order/design"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-gold transition hover:border-gold"
        >
          로고 올려 미리보며 디자인하기 →
        </Link>

        <div className="mt-10">
          <OrderForm />
        </div>
      </main>
    </div>
  );
}
