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

// 고객 업로드 이미지 → 인쇄용 PDF. 각 이미지를 작업 사이즈 페이지에 cover(꽉 채움).
// 비율이 다르면 넘치는 부분은 재단됨(안내 문구로 고지). png/jpeg만.
export type UploadImage = { bytes: Uint8Array; type: string };

export async function imagesToPrintPdf(
  images: UploadImage[],
  preset: ProductPreset = PRODUCT_PRESETS.namecard
): Promise<Uint8Array> {
  const { w, h } = workSize(preset);
  const pageW = mmToPt(w);
  const pageH = mmToPt(h);
  const pageRatio = pageW / pageH;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`GOLGIUS ${preset.label} — ${preset.trimMm.w}x${preset.trimMm.h}mm (업로드)`);
  pdf.setCreator("GOLGIUS");

  for (const img of images) {
    const embedded = /png/i.test(img.type)
      ? await pdf.embedPng(img.bytes)
      : await pdf.embedJpg(img.bytes);
    const page = pdf.addPage([pageW, pageH]);
    // cover: 페이지를 꽉 채우고 넘치는 부분은 잘림
    const imgRatio = embedded.width / embedded.height;
    let dw: number;
    let dh: number;
    if (imgRatio > pageRatio) {
      dh = pageH;
      dw = pageH * imgRatio;
    } else {
      dw = pageW;
      dh = pageW / imgRatio;
    }
    page.drawImage(embedded, {
      x: (pageW - dw) / 2,
      y: (pageH - dh) / 2,
      width: dw,
      height: dh,
    });
  }

  return pdf.save();
}
