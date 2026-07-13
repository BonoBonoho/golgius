// 골지어스 주문 옵션 → 성원애드피아 일반지명함(GNC1001) 폼 값 매핑.
// 2026-07 상품 페이지 정찰로 확보한 실제 select name/value. 사이트 개편 시 여기만 갱신.

export const ADPIA = {
  base: "https://www.swadpia.co.kr",
  productPath: "/goods/goods_view/CNC1000/GNC1001",
  cartPath: "/order/order_cart",
  loginPath: "/member/login",
} as const;

// select[name=...] → value
const PAPER_MAP: Record<string, string> = {
  "스노우지 250g": "SNW250W00", // 스노우지 백색 250g
  "스노우지 300g": "SNW300W00",
};
const QTY_MAP: Record<string, string> = {
  "500": "500",
  "1000": "1000",
  "2000": "2000",
};
const PRINT_MAP: Record<string, string> = {
  double: "CTN40", // 양면칼라
  single: "CTN10", // 단면칼라
};
// 코팅은 radio: paper_gloss(PAG10 무광 / PAG20 유광), paper_gloss2(PAG99 없음)
const GLOSS_MAP: Record<string, { name: string; value: string }[]> = {
  matte: [
    { name: "paper_gloss", value: "PAG10" },
    { name: "paper_gloss2", value: "PAG10" },
  ],
  gloss: [{ name: "paper_gloss", value: "PAG20" }],
  none: [{ name: "paper_gloss2", value: "PAG99" }],
};

export type MappedOptions = {
  paper_code: string;
  print_color_type: string;
  size_type: string; // SZT10 = 규격사이즈
  paper_size: string; // N0100 = 90mm*50mm
  paper_qty: string;
  order_count: string;
  gloss: { name: string; value: string }[]; // radio 후보(순서대로 시도)
};

/** 매핑 불가 옵션이면 Error — 실행 전에 실패시켜 오발주를 차단 */
export function mapOptions(options: Record<string, string | null>): MappedOptions {
  const paper = PAPER_MAP[options.paper ?? ""];
  const qty = QTY_MAP[options.quantity ?? ""];
  const print = PRINT_MAP[options.sides ?? ""];
  const gloss = GLOSS_MAP[options.coating ?? ""];
  const missing = [
    !paper && `용지(${options.paper})`,
    !qty && `수량(${options.quantity})`,
    !print && `인쇄(${options.sides})`,
    !gloss && `코팅(${options.coating})`,
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`unmapped option: ${missing.join(", ")}`);
  }
  return {
    paper_code: paper,
    print_color_type: print,
    size_type: "SZT10",
    paper_size: "N0100",
    paper_qty: qty,
    order_count: "1",
    gloss,
  };
}
