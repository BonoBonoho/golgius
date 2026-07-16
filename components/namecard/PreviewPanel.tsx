"use client";

// 명함 라이브 프리뷰 — 실측 비율(92:52), 앞/뒤 전환, 줌, 재단선/안전선 오버레이.
// 모델 SVG는 sanitize 후 인라인 렌더(문서 폰트 상속을 위해 <img> 대신 인라인).

import { useMemo, useState } from "react";
import type { Design } from "./NamecardAgent";
import { sanitizeSvgForInline, substituteLogo } from "@/lib/design-agent/sanitize-svg";
import {
  PRODUCT_PRESETS,
  safeRect,
  workSize,
  type PresetKey,
  type ProductPreset,
} from "@/lib/design-agent/presets";

function GuideOverlay({ preset }: { preset: ProductPreset }) {
  const work = workSize(preset);
  const safe = safeRect(preset);
  const b = preset.bleedMm;
  return (
    <svg
      viewBox={`0 0 ${work.w} ${work.h}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      {/* 재단선 */}
      <rect
        x={b}
        y={b}
        width={preset.trimMm.w}
        height={preset.trimMm.h}
        fill="none"
        stroke="#ff5555"
        strokeWidth={0.25}
        strokeDasharray="1.5 1"
      />
      {/* 안전 영역 */}
      <rect
        x={safe.x}
        y={safe.y}
        width={safe.w}
        height={safe.h}
        fill="none"
        stroke="#4da3ff"
        strokeWidth={0.2}
        strokeDasharray="0.8 0.8"
      />
    </svg>
  );
}

function CardFace({
  preset,
  svg,
  logoDataUrl,
  showGuides,
}: {
  preset: ProductPreset;
  svg: string;
  logoDataUrl: string | null;
  showGuides: boolean;
}) {
  const work = workSize(preset);
  const html = useMemo(() => {
    const cleaned = sanitizeSvgForInline(substituteLogo(svg, logoDataUrl));
    return cleaned;
  }, [svg, logoDataUrl]);

  if (!html) {
    return (
      <div
        className="flex items-center justify-center rounded-md bg-white/5 font-mono text-xs text-dim"
        style={{ aspectRatio: `${work.w}/${work.h}` }}
      >
        시안을 표시할 수 없습니다
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-md shadow-2xl ring-1 ring-white/10 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {showGuides && <GuideOverlay preset={preset} />}
    </div>
  );
}

// 품목별 앞/뒷면 라벨
const FACE_LABEL: Record<PresetKey, { front: string; back: string }> = {
  namecard: { front: "앞면", back: "뒷면" },
  towel: { front: "앞면", back: "뒷면" },
  apparel: { front: "가슴(앞)", back: "등판(뒤)" },
};

export default function PreviewPanel({
  product = "namecard",
  design,
  logoDataUrl,
}: {
  product?: PresetKey;
  design: Design | null;
  logoDataUrl: string | null;
}) {
  const preset = PRODUCT_PRESETS[product];
  const faceLabel = FACE_LABEL[product];
  const work = workSize(preset);
  const [face, setFace] = useState<"front" | "back">("front");
  const [zoom, setZoom] = useState(1);
  const [showGuides, setShowGuides] = useState(true);

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      {/* 컨트롤 바 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">preview</span>
        <div className="ml-auto flex items-center gap-1.5 font-mono text-[0.7rem]">
          <button
            type="button"
            onClick={() => setFace("front")}
            className={`rounded-md border px-2.5 py-1 transition ${
              face === "front" ? "border-gold text-gold" : "border-line text-dim hover:text-ink"
            }`}
          >
            {faceLabel.front}
          </button>
          <button
            type="button"
            onClick={() => setFace("back")}
            className={`rounded-md border px-2.5 py-1 transition ${
              face === "back" ? "border-gold text-gold" : "border-line text-dim hover:text-ink"
            }`}
          >
            {faceLabel.back}
          </button>
          <span className="mx-1 h-4 w-px bg-line" />
          {[1, 1.5, 2].map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={`rounded-md border px-2 py-1 transition ${
                zoom === z ? "border-gold text-gold" : "border-line text-dim hover:text-ink"
              }`}
            >
              {z}x
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-line" />
          <button
            type="button"
            onClick={() => setShowGuides((v) => !v)}
            className={`rounded-md border px-2.5 py-1 transition ${
              showGuides ? "border-gold text-gold" : "border-line text-dim hover:text-ink"
            }`}
            title="빨강: 재단선 / 파랑: 안전 영역"
          >
            가이드
          </button>
        </div>
      </div>

      {/* 카드 */}
      <div className="mt-5 overflow-auto">
        <div
          className="mx-auto transition-[width] duration-200"
          style={{ width: `${Math.min(zoom * 100, 200)}%`, maxWidth: zoom === 1 ? "560px" : undefined }}
        >
          {design ? (
            <CardFace
              preset={preset}
              svg={face === "front" ? design.frontSvg : design.backSvg}
              logoDataUrl={logoDataUrl}
              showGuides={showGuides}
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-base/60"
              style={{ aspectRatio: `${work.w}/${work.h}` }}
            >
              <span className="font-mono text-xs text-dim">
                {preset.trimMm.w} × {preset.trimMm.h} mm — 시안이 여기 표시됩니다
              </span>
              <span className="font-mono text-[0.65rem] text-dim/60">
                채팅으로 정보를 알려주시면 바로 렌더링돼요
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 메타 */}
      {design && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <div className="flex items-center gap-1.5">
            {design.palette.slice(0, 6).map((c, i) => (
              <span
                key={`${c}-${i}`}
                className="h-4 w-4 rounded-full ring-1 ring-white/20"
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
          <span className="font-mono text-[0.68rem] text-dim">
            {design.fonts.join(" · ")}
          </span>
          <span className="ml-auto font-mono text-[0.65rem] text-dim/70">
            빨강 점선 밖 여백은 재단 시 잘려요 · 화면(RGB)과 인쇄(CMYK) 색상은 다소 차이날 수 있어요
          </span>
        </div>
      )}
    </div>
  );
}
