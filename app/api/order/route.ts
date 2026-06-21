import { addOrder, uploadDesignFile, isPersistent } from "@/lib/orders";
import { notifyNewOrder } from "@/lib/notify";
import type { VerticalKey } from "@/lib/verticals";

export const dynamic = "force-dynamic";

const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BYTES = 4 * 1024 * 1024; // 4MB (서버리스 본문 한도 고려)

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ ok: false, message: "잘못된 요청입니다." }, 400);
  }

  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const productType = String(form.get("product_type") ?? "").trim();
  const color = String(form.get("color") ?? "").trim();
  const size = String(form.get("size") ?? "").trim();
  const quantity = String(form.get("quantity") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  const verticalRaw = String(form.get("vertical") ?? "");
  const vertical =
    verticalRaw === "gym" || verticalRaw === "hospital"
      ? (verticalRaw as VerticalKey)
      : undefined;

  // 허니팟
  if (String(form.get("company") ?? "").length > 0) {
    return json({ ok: true, message: "접수되었습니다." });
  }

  if (name.length < 2) return json({ ok: false, message: "이름을 2자 이상 입력해 주세요." }, 400);
  if (!PHONE_RE.test(phone)) return json({ ok: false, message: "연락처를 정확히 입력해 주세요." }, 400);
  if (email && !EMAIL_RE.test(email)) return json({ ok: false, message: "이메일 형식이 올바르지 않습니다." }, 400);
  if (!productType || productType.length > 80) return json({ ok: false, message: "품목을 선택해 주세요." }, 400);
  if (message.length > 1000) return json({ ok: false, message: "요청 내용이 너무 깁니다." }, 400);

  // 시안 파일(선택)
  let designFile: string | null = null;
  const file = form.get("file");
  if (file && file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) {
      return json({ ok: false, message: "파일은 4MB 이하만 업로드할 수 있습니다." }, 400);
    }
    if (isPersistent()) {
      try {
        designFile = await uploadDesignFile(file);
      } catch {
        return json({ ok: false, message: "파일 업로드에 실패했습니다." }, 500);
      }
    } else {
      designFile = file.name; // 로컬 폴백: 이름만 기록
    }
  }

  try {
    const order = await addOrder({
      vertical,
      name,
      phone,
      email,
      productType,
      options: { color, size, quantity },
      message,
      designFile,
    });
    await notifyNewOrder(order);
  } catch {
    return json({ ok: false, message: "접수 중 오류가 발생했습니다. 전화로 문의해 주세요." }, 500);
  }

  return json({ ok: true, message: "발주 요청이 접수되었습니다. 빠르게 연락드리겠습니다." });
}
