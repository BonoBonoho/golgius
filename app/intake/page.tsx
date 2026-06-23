import Link from "next/link";
import type { Metadata } from "next";
import IntakeForm from "@/components/IntakeForm";

export const metadata: Metadata = {
  title: "서류·정보 제출 — 골지어스",
  description: "견적·설치를 위한 서류와 정보를 안전하게 제출해 주세요.",
  robots: { index: false, follow: false },
};

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const { lead } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            GOLGIUS
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14">
        <p className="eyebrow">Document &amp; Info</p>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          견적·설치를 위한 서류·정보 제출
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-dim">
          담당자가 안내드린 페이지입니다. 아래 필수 서류와 정보를 입력해 주시면, 확인 후 견적·설치를
          빠르게 진행해 드립니다.
        </p>

        <div className="mt-10">
          <IntakeForm leadId={lead ?? ""} />
        </div>
      </main>
    </div>
  );
}
