"use client";

// 디자인 스튜디오 진입 — 품목(명함/수건/단체복) 선택 + 방식(AI/업로드) 탭:
//  · AI 디자인: 채팅으로 시안을 만들어 발주 (NamecardAgent)
//  · 내 파일: 완성한 이미지/PDF를 올려 바로 발주 (UploadOrder)
// 명함은 성원애드피아 자동 발주, 수건·단체복은 견적 플로우로 접수된다.

import { useState } from "react";
import NamecardAgent from "./NamecardAgent";
import UploadOrder from "./UploadOrder";
import type { PresetKey } from "@/lib/design-agent/presets";

type Mode = "ai" | "upload";

const PRODUCTS: { key: PresetKey; label: string; sub: string }[] = [
  { key: "namecard", label: "명함", sub: "90×50mm · 인쇄 발주" },
  { key: "towel", label: "수건", sub: "80×40cm · 나염" },
  { key: "apparel", label: "단체복", sub: "가슴/등판 프린트" },
];

export default function NamecardTabs() {
  const [product, setProduct] = useState<PresetKey>("namecard");
  const [mode, setMode] = useState<Mode>("ai");

  const modeTab = (m: Mode, label: string, sub: string) => {
    const active = mode === m;
    return (
      <button
        type="button"
        onClick={() => setMode(m)}
        className={`flex-1 rounded-xl border px-4 py-3 text-left transition ${
          active ? "border-gold bg-surface" : "border-line bg-base hover:border-dim"
        }`}
      >
        <span className={`block text-sm font-semibold ${active ? "text-ink" : "text-dim"}`}>
          {label}
        </span>
        <span className="mt-0.5 block font-mono text-[0.66rem] text-dim">{sub}</span>
      </button>
    );
  };

  return (
    <div>
      {/* 품목 선택 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1">품목</span>
        {PRODUCTS.map((p) => {
          const active = product === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setProduct(p.key)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                active
                  ? "border-gold bg-surface font-semibold text-gold"
                  : "border-line text-dim hover:border-dim hover:text-ink"
              }`}
              title={p.sub}
            >
              {p.label}
            </button>
          );
        })}
        <span className="ml-1 font-mono text-[0.66rem] text-dim">
          {PRODUCTS.find((p) => p.key === product)?.sub}
        </span>
      </div>

      {/* 방식 선택 */}
      <div className="mt-4 flex gap-3">
        {modeTab("ai", "AI로 디자인", "채팅으로 시안 만들기")}
        {modeTab("upload", "내 파일로 발주", "완성한 이미지/PDF 업로드")}
      </div>

      {/* key={product}: 품목 전환 시 대화/폼 초기화 */}
      <div className="mt-6">
        {mode === "ai" ? (
          <NamecardAgent key={product} product={product} />
        ) : (
          <UploadOrder key={product} product={product} />
        )}
      </div>
    </div>
  );
}
