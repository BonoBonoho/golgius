// 인쇄용 PDF 생성 — SVG(mm 좌표계) → 300dpi 래스터(resvg) → 실측 mm 페이지(pdf-lib).
// 성원애드피아 제출 규격: 도련 포함 작업 사이즈, 앞/뒷면 2페이지, RGB(인쇄소에서 CMYK 변환).
// 폰트는 assets/fonts의 로컬 파일만 사용 — 웹 프리뷰와 동일 세트(ALLOWED_FONTS).

import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { PDFDocument } from "pdf-lib";
import {
  PRODUCT_PRESETS,
  mmToPt,
  mmToPx,
  workSize,
  type ProductPreset,
} from "./presets";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const FONT_FILES = [
  "Pretendard-Regular.otf",
  "Pretendard-Bold.otf",
  "NotoSerifKR-Regular.otf",
  "NotoSerifKR-Bold.otf",
  "IBMPlexMono-Regular.ttf",
].map((f) => path.join(FONT_DIR, f));

function renderPng(svg: string, preset: ProductPreset): Buffer {
  const { w } = workSize(preset);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: Math.round(mmToPx(w, preset.dpi)) },
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
      defaultFontFamily: "Pretendard",
    },
    background: "#ffffff",
  });
  return resvg.render().asPng();
}

/** 앞/뒷면 SVG → 2페이지 인쇄용 PDF 바이트 */
export async function renderPrintPdf(
  frontSvg: string,
  backSvg: string,
  preset: ProductPreset = PRODUCT_PRESETS.namecard
): Promise<Uint8Array> {
  const { w, h } = workSize(preset);
  const pageW = mmToPt(w);
  const pageH = mmToPt(h);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`GOLGIUS ${preset.label} — ${preset.trimMm.w}x${preset.trimMm.h}mm`);
  pdf.setCreator("GOLGIUS design agent");

  for (const svg of [frontSvg, backSvg]) {
    const png = renderPng(svg, preset);
    const image = await pdf.embedPng(png);
    const page = pdf.addPage([pageW, pageH]);
    page.drawImage(image, { x: 0, y: 0, width: pageW, height: pageH });
  }

  return pdf.save();
}
