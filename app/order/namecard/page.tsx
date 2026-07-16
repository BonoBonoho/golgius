import type { Metadata } from "next";
import NamecardTabs from "@/components/namecard/NamecardTabs";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "AI 디자인 스튜디오 — 골지어스",
  description:
    "채팅으로 명함·수건·단체복을 디자인하세요. AI가 실시간으로 시안을 그려주고, 마음에 들면 그대로 발주까지 요청할 수 있습니다. 완성 파일 업로드 발주도 가능합니다.",
};

export default function NamecardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <p className="eyebrow">AI Design Studio — Beta</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          채팅으로 만드는 명함·수건·단체복
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-dim">
          원하는 분위기만 알려주세요. AI가 실시간으로 시안을 그려주고, 확정하면 인쇄
          규격에 맞춘 파일로 발주까지 요청됩니다. 직접 만든 파일 업로드 발주도 가능해요.
        </p>

        <div className="mt-8">
          <NamecardTabs />
        </div>
      </main>
    </div>
  );
}
