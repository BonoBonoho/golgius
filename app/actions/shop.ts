"use server";

// 기구 견적 요청 — 장바구니 품목을 기존 발주(orders) 파이프라인으로 접수.
// 어드민 /admin/orders 에서 다른 발주와 함께 관리, 알림도 동일 채널 사용.

import { addOrder } from "@/lib/orders";
import { notifyNewOrder } from "@/lib/notify";

export interface ShopQuoteState {
  ok: boolean;
  message: string;
}

const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CartLine {
  id: string;
  name: string;
  price: number | null;
  qty: number;
}

function parseCart(raw: string): CartLine[] {
  try {
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (i) =>
          i &&
          typeof i.id === "string" &&
          typeof i.name === "string" &&
          Number.isFinite(i.qty) &&
          i.qty > 0
      )
      .slice(0, 50)
      .map((i) => ({
        id: i.id.slice(0, 64),
        name: i.name.slice(0, 120),
        price: typeof i.price === "number" && Number.isFinite(i.price) ? i.price : null,
        qty: Math.min(Math.floor(i.qty), 999),
      }));
  } catch {
    return [];
  }
}

export async function submitShopQuote(
  _prev: ShopQuoteState,
  formData: FormData
): Promise<ShopQuoteState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim().slice(0, 80);
  const message = String(formData.get("message") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim().slice(0, 60) || "direct";
  const cart = parseCart(String(formData.get("cart") ?? "[]"));

  // 허니팟
  if (String(formData.get("company") ?? "").length > 0) {
    return { ok: true, message: "접수되었습니다." };
  }

  if (cart.length === 0) return { ok: false, message: "바구니가 비어 있습니다. 기구를 담아주세요." };
  if (name.length < 2) return { ok: false, message: "이름을 2자 이상 입력해 주세요." };
  if (!PHONE_RE.test(phone)) return { ok: false, message: "연락처를 정확히 입력해 주세요." };
  if (email && !EMAIL_RE.test(email)) return { ok: false, message: "이메일 형식이 올바르지 않습니다." };
  if (message.length > 1000) return { ok: false, message: "요청 내용이 너무 깁니다(최대 1000자)." };

  const totalQty = cart.reduce((n, i) => n + i.qty, 0);
  const estimated = cart.reduce((n, i) => n + (i.price ?? 0) * i.qty, 0);
  const hasQuoteOnly = cart.some((i) => i.price === null);

  const lines = cart.map(
    (i) => `- ${i.name} × ${i.qty}${i.price !== null ? ` (${(i.price * i.qty).toLocaleString("ko-KR")}원)` : " (견적 문의)"}`
  );
  const fullMessage = [
    "[기구 견적 바구니]",
    ...lines,
    `합계(표시가 기준): ${estimated > 0 ? `${estimated.toLocaleString("ko-KR")}원` : "-"}${hasQuoteOnly ? " + 견적 문의 품목" : ""}`,
    region ? `[설치 지역] ${region}` : "",
    source !== "direct" ? `[유입] ${source}` : "",
    message ? `[요청] ${message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const order = await addOrder({
      vertical: "gym",
      name,
      phone,
      email,
      productType: "기구",
      options: { quantity: String(totalQty) },
      message: fullMessage,
    });
    await notifyNewOrder(order);
  } catch {
    return {
      ok: false,
      message: "접수 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 전화로 문의해 주세요.",
    };
  }

  return { ok: true, message: "견적 요청이 접수되었습니다. 담당자가 빠르게 연락드리겠습니다." };
}
