import Link from "next/link";
import type { Metadata } from "next";
import NamecardAgent from "@/components/namecard/NamecardAgent";

export const metadata: Metadata = {
  title: "명함 디자인 AI — 골지어스",
  description:
    "채팅으로 명함을 디자인하세요. AI가 실시간으로 시안을 그려주고, 마음에 들면 그대로 인쇄 발주까지 요청할 수 있습니다.",
};

export default function NamecardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            GOLGIUS
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/order/design"
              className="text-sm text-dim transition hover:text-ink"
            >
              수건·운동복 디자인
            </Link>
            <Link href="/order" className="text-sm text-dim transition hover:text-ink">
              ← 일반 발주 폼
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <p className="eyebrow">AI Design — Beta</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          채팅으로 만드는 명함
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-dim">
          이름과 원하는 분위기만 알려주세요. AI가 실시간으로 시안을 그려주고, 확정하면
          인쇄 규격(90×50mm)에 맞춘 파일로 발주까지 요청됩니다.
        </p>

        <div className="mt-8">
          <NamecardAgent />
        </div>
      </main>
    </div>
  );
}
