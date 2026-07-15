import type { Metadata } from "next";
import DesignStudio from "@/components/DesignStudio";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "디자인 스튜디오 — 골지어스",
  description: "운동복·수건에 로고를 직접 올려 색상·위치를 미리보고 그대로 발주를 요청하세요.",
};

export default function DesignPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-16">
        <p className="eyebrow">Design Studio</p>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          로고 올려 미리보고 발주하기
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-dim">
          제품과 색상을 고르고 로고를 올려 위치·크기를 조정하세요. 완성한 미리보기 이미지가
          발주 요청에 함께 전달됩니다.
        </p>

        <div className="mt-10">
          <DesignStudio />
        </div>
      </main>
    </div>
  );
}
