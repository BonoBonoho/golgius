// AI 디자인 확정 → 발주 요청 접수 (명함·수건·단체복).
// 서버가 단일 진실: SVG 검증 → 인쇄용 PDF 생성 → Storage 업로드 → orders insert → 알림.
// 명함(namecard-ai)만 성원애드피아 자동 발주 파이프라인 대상, 수건·단체복은 견적 플로우.

import { addOrder, isPersistent, uploadDesignBytes } from "@/lib/orders";
import { notifyNewOrder } from "@/lib/notify";
import { svgViolations, substituteLogo } from "@/lib/design-agent/sanitize-svg";
import { renderPrintPdf } from "@/lib/design-agent/pdf";
import {
  ALLOWED_FONTS,
  PRODUCT_PRESETS,
  isPresetKey,
} from "@/lib/design-agent/presets";
import { checkRateLimit, clientIp } from "@/lib/design-agent/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SVG_CHARS = 200_000;
const MAX_LOGO_CHARS = 3_000_000; // dataURL 기준 (~2MB 파일)
// 성원애드피아 일반지명함(GNC1001) 실제 옵션과 1:1 (worker/adpia/mapping.ts와 동기)
const PAPERS = new Set(["스노우지 250g", "스노우지 300g"]);
const QUANTITIES = new Set(["500", "1000", "2000"]);
const SIDES = new Set(["single", "double"]);
const COATINGS = new Set(["none", "matte", "gloss"]);

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

type OrderBody = {
  product?: string;
  name?: string;
  phone?: string;
  email?: string;
  memo?: string;
  company?: string;
  options?: {
    paper?: string;
    quantity?: string;
    sides?: string;
    coating?: string;
    color?: string;
  };
  design?: {
    front_svg?: string;
    back_svg?: string;
    palette?: string[];
    fonts?: string[];
    summary?: string;
  };
  logo?: string | null;
};

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!checkRateLimit(`order:${ip}`, 5, 60 * 60 * 1000)) {
    return json({ ok: false, message: "요청이 많아 잠시 후 다시 시도해 주세요." }, 429);
  }

  let body: OrderBody;
  try {
    body = (await req.json()) as OrderBody;
  } catch {
    return json({ ok: false, message: "잘못된 요청입니다." }, 400);
  }

  // 허니팟
  if ((body.company ?? "").length > 0) {
    return json({ ok: true, message: "접수되었습니다." });
  }

  const name = (body.name ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const email = (body.email ?? "").trim();
  const memo = (body.memo ?? "").trim();

  if (name.length < 2) return json({ ok: false, message: "이름을 2자 이상 입력해 주세요." }, 400);
  if (!PHONE_RE.test(phone)) return json({ ok: false, message: "연락처를 정확히 입력해 주세요." }, 400);
  if (email && !EMAIL_RE.test(email)) return json({ ok: false, message: "이메일 형식이 올바르지 않습니다." }, 400);
  if (memo.length > 1000) return json({ ok: false, message: "요청 내용이 너무 깁니다." }, 400);

  const product = isPresetKey(body.product ?? "") ? (body.product as keyof typeof PRODUCT_PRESETS) : "namecard";
  const preset = PRODUCT_PRESETS[product];
  const isNamecard = product === "namecard";

  const opt = body.options ?? {};
  if (isNamecard) {
    // 성원애드피아 옵션과 1:1 — 자동 발주 대상이라 엄격 검증
    if (
      !PAPERS.has(opt.paper ?? "") ||
      !QUANTITIES.has(opt.quantity ?? "") ||
      !SIDES.has(opt.sides ?? "") ||
      !COATINGS.has(opt.coating ?? "")
    ) {
      return json({ ok: false, message: "인쇄 옵션을 다시 선택해 주세요." }, 400);
    }
  } else {
    // 수건·단체복은 견적형 — 수량 텍스트만 필수
    const q = (opt.quantity ?? "").trim();
    if (q.length < 1 || q.length > 40) {
      return json({ ok: false, message: "수량을 입력해 주세요." }, 400);
    }
    if ((opt.color ?? "").length > 40) {
      return json({ ok: false, message: "색상 입력이 너무 깁니다." }, 400);
    }
  }

  const design = body.design ?? {};
  const frontSvg = design.front_svg ?? "";
  const backSvg = design.back_svg ?? "";
  if (
    !frontSvg ||
    !backSvg ||
    frontSvg.length > MAX_SVG_CHARS ||
    backSvg.length > MAX_SVG_CHARS
  ) {
    return json({ ok: false, message: "시안 데이터가 올바르지 않습니다." }, 400);
  }
  const violations = [...svgViolations(frontSvg), ...svgViolations(backSvg)];
  if (violations.length > 0) {
    console.warn("[design-agent/order] svg 거부:", violations);
    return json({ ok: false, message: "시안에 허용되지 않는 요소가 있습니다. 시안을 다시 생성해 주세요." }, 400);
  }
  const fonts = Array.isArray(design.fonts) ? design.fonts : [];
  if (!fonts.every((f) => (ALLOWED_FONTS as readonly string[]).includes(f))) {
    return json({ ok: false, message: "허용되지 않은 폰트가 포함됐습니다." }, 400);
  }

  const logo = body.logo ?? null;
  if (logo) {
    if (
      logo.length > MAX_LOGO_CHARS ||
      !/^data:image\/(png|jpeg|svg\+xml);base64,/.test(logo)
    ) {
      return json({ ok: false, message: "로고 파일이 올바르지 않습니다." }, 400);
    }
  }

  // PDF 생성 (로고 치환 포함) — 품목 프리셋 규격으로
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await renderPrintPdf(
      substituteLogo(frontSvg, logo),
      substituteLogo(backSvg, logo),
      preset
    );
  } catch (err) {
    console.error("[design-agent/order] pdf 생성 실패:", err);
    return json({ ok: false, message: "인쇄 파일 생성에 실패했습니다. 시안을 다시 생성해 주세요." }, 500);
  }

  // Storage 업로드 (운영) — 로컬 폴백 시 경로 없이 접수만
  const id = crypto.randomUUID();
  let pdfPath: string | null = null;
  let designJsonPath: string | null = null;
  if (isPersistent()) {
    try {
      pdfPath = await uploadDesignBytes(pdfBytes, "application/pdf", `${product}/${id}/print.pdf`);
      const designJson = JSON.stringify({
        preset: product,
        front_svg: frontSvg,
        back_svg: backSvg,
        palette: design.palette ?? [],
        fonts,
        summary: design.summary ?? "",
        logo,
      });
      designJsonPath = await uploadDesignBytes(
        new TextEncoder().encode(designJson),
        "application/json",
        `${product}/${id}/design.json`
      );
    } catch (err) {
      console.error("[design-agent/order] 업로드 실패:", err);
      return json({ ok: false, message: "파일 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 500);
    }
  }

  try {
    const order = await addOrder({
      name,
      phone,
      email,
      productType: `${product}-ai`,
      options: isNamecard
        ? {
            color: "",
            size: `${preset.trimMm.w}x${preset.trimMm.h}`,
            quantity: opt.quantity,
            paper: opt.paper,
            sides: opt.sides,
            coating: opt.coating,
            designJson: designJsonPath,
          }
        : {
            color: (opt.color ?? "").trim(),
            size: `${preset.trimMm.w}x${preset.trimMm.h}`,
            quantity: (opt.quantity ?? "").trim(),
            designJson: designJsonPath,
          },
      message: [design.summary, memo].filter(Boolean).join(" / "),
      designFile: pdfPath,
    });
    await notifyNewOrder(order);
    return json({
      ok: true,
      message: `${preset.label} 발주 요청이 접수됐어요. 담당자가 견적·일정 확인 후 연락드립니다.`,
      orderId: order.id,
    });
  } catch (err) {
    console.error("[design-agent/order] 접수 실패:", err);
    return json({ ok: false, message: "접수 중 오류가 발생했습니다. 전화로 문의해 주세요." }, 500);
  }
}
