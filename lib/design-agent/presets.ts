// 인쇄물 제품 프리셋 — 규격의 단일 진실 소스.
// viewBox·프리뷰·PDF·시스템 프롬프트가 전부 여기서 파생된다.
// ⚠️ bleedMm은 성원애드피아 실규격 정찰 후 확정 (1mm 가정, 2mm일 수 있음).

export type ProductPreset = {
  key: string;
  label: string;
  /** 재단(완성) 사이즈 mm */
  trimMm: { w: number; h: number };
  /** 도련(사방) mm — 배경은 이 영역까지 채워야 함 */
  bleedMm: number;
  /** 안전 여백 mm — 텍스트/로고는 재단선에서 이만큼 안쪽 */
  safeMm: number;
  dpi: number;
};

export const PRODUCT_PRESETS = {
  namecard: {
    key: "namecard",
    label: "명함",
    trimMm: { w: 90, h: 50 },
    bleedMm: 1,
    safeMm: 3,
    dpi: 300,
  },
  // 확장 예정: flyer, poster, sticker …
} satisfies Record<string, ProductPreset>;

export type PresetKey = keyof typeof PRODUCT_PRESETS;

/** 작업(도련 포함) 사이즈 mm */
export function workSize(p: ProductPreset) {
  return { w: p.trimMm.w + p.bleedMm * 2, h: p.trimMm.h + p.bleedMm * 2 };
}

/** SVG 계약 viewBox — 1 unit = 1mm */
export function viewBoxOf(p: ProductPreset) {
  const { w, h } = workSize(p);
  return `0 0 ${w} ${h}`;
}

/** 텍스트/로고가 지켜야 할 안전 영역 (작업좌표계 기준) */
export function safeRect(p: ProductPreset) {
  const m = p.bleedMm + p.safeMm;
  const { w, h } = workSize(p);
  return { x: m, y: m, w: w - m * 2, h: h - m * 2 };
}

/** mm → px (dpi 기준) */
export function mmToPx(mm: number, dpi: number) {
  return (mm / 25.4) * dpi;
}

/** mm → PDF pt */
export function mmToPt(mm: number) {
  return (mm / 25.4) * 72;
}

/** 웹 프리뷰·서버 PDF 렌더가 공유하는 허용 폰트 (서버 TTF/OTF와 1:1) */
export const ALLOWED_FONTS = [
  "Pretendard",
  "Noto Serif KR",
  "IBM Plex Mono",
] as const;

export type AllowedFont = (typeof ALLOWED_FONTS)[number];
