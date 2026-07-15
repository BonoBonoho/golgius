// 수동 파일 발주 — 고객이 완성한 명함 파일(PDF 또는 앞/뒷면 이미지)로 발주.
// PDF면 그대로, 이미지면 인쇄용 PDF로 변환 → Storage → orders(product_type: namecard-upload).
// 이후 발주 워커 파이프라인은 AI 발주와 동일하게 동작(design_file을 성원애드피아에 첨부).

import { addOrder, isPersistent, uploadDesignBytes } from "@/lib/orders";
import { notifyNewOrder } from "@/lib/notify";
import { imagesToPrintPdf, type UploadImage } from "@/lib/design-agent/pdf";
import { checkRateLimit, clientIp } from "@/lib/design-agent/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 파일당 20MB
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const IMAGE_TYPES = /^image\/(png|jpeg)$/;
const PAPERS = new Set(["스노우지 250g", "스노우지 300g"]);
const QUANTITIES = new Set(["500", "1000", "2000"]);
const SIDES = new Set(["single", "double"]);
const COATINGS = new Set(["none", "matte", "gloss"]);

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!checkRateLimit(`order:${ip}`, 5, 60 * 60 * 1000)) {
    return json({ ok: false, message: "요청이 많아 잠시 후 다시 시도해 주세요." }, 429);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ ok: false, message: "잘못된 요청입니다." }, 400);
  }

  // 허니팟
  if (String(form.get("company") ?? "").length > 0) {
    return json({ ok: true, message: "접수되었습니다." });
  }

  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const memo = String(form.get("memo") ?? "").trim();
  const paper = String(form.get("paper") ?? "");
  const quantity = String(form.get("quantity") ?? "");
  const sides = String(form.get("sides") ?? "");
  const coating = String(form.get("coating") ?? "");

  if (name.length < 2) return json({ ok: false, message: "이름을 2자 이상 입력해 주세요." }, 400);
  if (!PHONE_RE.test(phone)) return json({ ok: false, message: "연락처를 정확히 입력해 주세요." }, 400);
  if (email && !EMAIL_RE.test(email)) return json({ ok: false, message: "이메일 형식이 올바르지 않습니다." }, 400);
  if (memo.length > 1000) return json({ ok: false, message: "요청 내용이 너무 깁니다." }, 400);
  if (!PAPERS.has(paper) || !QUANTITIES.has(quantity) || !SIDES.has(sides) || !COATINGS.has(coating)) {
    return json({ ok: false, message: "인쇄 옵션을 다시 선택해 주세요." }, 400);
  }

  // 파일: front(필수) + back(선택). PDF 1개면 그대로, 이미지면 PDF로 합침.
  const front = form.get("front");
  const back = form.get("back");
  if (!(front instanceof File) || front.size === 0) {
    return json({ ok: false, message: "명함 파일을 업로드해 주세요." }, 400);
  }
  const files = [front, back].filter((f): f is File => f instanceof File && f.size > 0);
  let total = 0;
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return json({ ok: false, message: "파일은 각 20MB 이하만 업로드할 수 있습니다." }, 400);
    }
    total += f.size;
  }
  if (total > MAX_TOTAL_BYTES) {
    return json({ ok: false, message: "전체 파일 용량이 너무 큽니다." }, 400);
  }

  const frontIsPdf = front.type === "application/pdf" || /\.pdf$/i.test(front.name);

  // 인쇄용 PDF 바이트 만들기
  let pdfBytes: Uint8Array;
  try {
    if (frontIsPdf) {
      // 완성 PDF는 그대로 사용(앞뒤 포함된 것으로 간주). 뒷면 파일은 무시.
      pdfBytes = new Uint8Array(await front.arrayBuffer());
    } else {
      // 이미지들 → 인쇄용 PDF (앞면, 있으면 뒷면 순)
      const images: UploadImage[] = [];
      for (const f of files) {
        if (!IMAGE_TYPES.test(f.type)) {
          return json(
            { ok: false, message: "이미지는 PNG/JPG만 가능합니다. 완성본은 PDF로 올려주세요." },
            400
          );
        }
        images.push({ bytes: new Uint8Array(await f.arrayBuffer()), type: f.type });
      }
      pdfBytes = await imagesToPrintPdf(images);
    }
  } catch (err) {
    console.error("[order-upload] pdf 생성 실패:", err);
    return json({ ok: false, message: "인쇄 파일 생성에 실패했습니다. 파일을 확인해 주세요." }, 500);
  }

  // Storage 업로드 (운영). 원본 파일도 함께 보관.
  const id = crypto.randomUUID();
  let pdfPath: string | null = null;
  if (isPersistent()) {
    try {
      pdfPath = await uploadDesignBytes(pdfBytes, "application/pdf", `namecard/${id}/print.pdf`);
      // 원본 보관 (관리자 확인/재사용용)
      let idx = 0;
      for (const f of files) {
        const ext = (f.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
        await uploadDesignBytes(
          new Uint8Array(await f.arrayBuffer()),
          f.type || "application/octet-stream",
          `namecard/${id}/source-${idx}.${ext || "bin"}`
        );
        idx += 1;
      }
    } catch (err) {
      console.error("[order-upload] 업로드 실패:", err);
      return json({ ok: false, message: "파일 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 500);
    }
  }

  try {
    const order = await addOrder({
      name,
      phone,
      email,
      productType: "namecard-upload",
      options: { color: "", size: "90x50", quantity, paper, sides, coating },
      message: ["직접 업로드", memo].filter(Boolean).join(" / "),
      designFile: pdfPath,
    });
    await notifyNewOrder(order);
    return json({
      ok: true,
      message: "명함 발주 요청이 접수됐어요. 담당자가 견적·일정 확인 후 연락드립니다.",
      orderId: order.id,
    });
  } catch (err) {
    console.error("[order-upload] 접수 실패:", err);
    return json({ ok: false, message: "접수 중 오류가 발생했습니다. 전화로 문의해 주세요." }, 500);
  }
}
