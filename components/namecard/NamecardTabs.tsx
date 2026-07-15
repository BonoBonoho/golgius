"use client";

// 명함 발주 진입 — 두 방식 탭 전환:
//  · AI 디자인: 채팅으로 명함을 만들어 발주 (NamecardAgent)
//  · 내 파일: 완성한 이미지/PDF를 올려 바로 발주 (UploadOrder)

import { useState } from "react";
import NamecardAgent from "./NamecardAgent";
import UploadOrder from "./UploadOrder";

type Mode = "ai" | "upload";

export default function NamecardTabs() {
  const [mode, setMode] = useState<Mode>("ai");

  const tab = (m: Mode, label: string, sub: string) => {
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
      <div className="flex gap-3">
        {tab("ai", "AI로 디자인", "채팅으로 명함 만들기")}
        {tab("upload", "내 파일로 발주", "완성한 이미지/PDF 업로드")}
      </div>

      <div className="mt-6">{mode === "ai" ? <NamecardAgent /> : <UploadOrder />}</div>
    </div>
  );
}
