// 모델 산출 SVG는 신뢰 불가 입력 — 정화/검증 유틸.
// 클라이언트: sanitizeSvgForInline(DOMParser 기반 allowlist) 후 인라인 렌더.
// 서버(주문 라우트): svgViolations로 거부 판정(변환 대신 거부가 더 안전).

const ALLOWED_ELEMENTS = new Set([
  "svg",
  "g",
  "defs",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "path",
  "text",
  "tspan",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "image",
  "title",
  "desc",
]);

/** href/xlink:href로 허용되는 값: 내부 참조(#id), 로고 플레이스홀더, data 이미지 */
function isAllowedHref(v: string): boolean {
  return (
    v.startsWith("#") ||
    v === "asset:logo" ||
    /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/i.test(v)
  );
}

/** 서버/클라 공용 — 위반 목록 반환(빈 배열 = 통과). 거부 판정용 정규식 검사 */
export function svgViolations(svg: string): string[] {
  const problems: string[] = [];
  if (!/^\s*<svg[\s>]/i.test(svg)) problems.push("svg 루트가 아님");
  if (/<script/i.test(svg)) problems.push("script 요소");
  if (/<foreignObject/i.test(svg)) problems.push("foreignObject 요소");
  if (/<style/i.test(svg)) problems.push("style 블록");
  if (/\son\w+\s*=/i.test(svg)) problems.push("이벤트 핸들러 속성");
  if (/javascript:/i.test(svg)) problems.push("javascript: URL");

  // href 계열 전수 검사
  const hrefRe = /(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(svg)) !== null) {
    if (!isAllowedHref(m[1])) problems.push(`외부 참조: ${m[1].slice(0, 60)}`);
  }
  return problems;
}

/** 클라이언트 전용 — DOMParser allowlist 정화. 실패 시 null */
export function sanitizeSvgForInline(svg: string): string | null {
  if (typeof DOMParser === "undefined") return null;
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg") return null;
  if (doc.querySelector("parsererror")) return null;

  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (!ALLOWED_ELEMENTS.has(child.tagName.toLowerCase())) {
        child.remove();
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on")) {
          child.removeAttribute(attr.name);
        } else if (name === "href" || name === "xlink:href") {
          if (!isAllowedHref(attr.value)) child.removeAttribute(attr.name);
        } else if (attr.value.toLowerCase().includes("javascript:")) {
          child.removeAttribute(attr.name);
        }
      }
      walk(child);
    }
  };

  for (const attr of Array.from(root.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on")) root.removeAttribute(attr.name);
  }
  walk(root);

  return new XMLSerializer().serializeToString(root);
}

/** asset:logo 플레이스홀더를 실제 로고 dataURL로 치환 (클라 프리뷰·서버 PDF 공용) */
export function substituteLogo(svg: string, logoDataUrl: string | null): string {
  if (!logoDataUrl) {
    // 로고 없이 플레이스홀더가 남으면 빈 참조 — image 요소가 무시되도록 제거
    return svg.replaceAll('href="asset:logo"', 'href=""');
  }
  return svg.replaceAll("asset:logo", logoDataUrl);
}
