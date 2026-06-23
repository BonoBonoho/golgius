"use server";

import { addLead } from "@/lib/leads";
import { notifyNewLead } from "@/lib/notify";
import { sendCustomerWebhook } from "@/lib/webhook";
import type { VerticalKey } from "@/lib/verticals";

export interface ContactState {
  ok: boolean;
  message: string;
}

const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContact(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const center = String(formData.get("center") ?? "").trim().slice(0, 80);
  const interests = formData
    .getAll("interest")
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, 50);
  const message = String(formData.get("message") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim().slice(0, 60) || "direct";
  const verticalRaw = String(formData.get("vertical") ?? "");
  const vertical: VerticalKey = verticalRaw === "hospital" ? "hospital" : "gym";

  // 봇 방지용 허니팟 — 채워져 있으면 성공처럼 응답하고 버린다
  if (String(formData.get("company") ?? "").length > 0) {
    return { ok: true, message: "접수되었습니다." };
  }

  if (name.length < 2) {
    return { ok: false, message: "이름을 2자 이상 입력해 주세요." };
  }
  if (!PHONE_RE.test(phone)) {
    return { ok: false, message: "연락처를 정확히 입력해 주세요." };
  }
  if (email && !EMAIL_RE.test(email)) {
    return { ok: false, message: "이메일 형식이 올바르지 않습니다." };
  }
  if (message.length > 1000) {
    return { ok: false, message: "문의 내용이 너무 깁니다(최대 1000자)." };
  }

  // 업체명·관심 품목을 문의 내용에 구조화해 담는다(스키마 변경 없이 어드민에서 확인)
  const fullMessage = [
    center ? `[업체명] ${center}` : "",
    interests.length ? `[관심 품목] ${interests.join(", ")}` : "",
    message,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const lead = await addLead({ name, phone, email, region, message: fullMessage, vertical, source });
    // 알림·웹훅은 접수 성공과 분리 — 실패해도 사용자에겐 성공 응답
    await Promise.allSettled([notifyNewLead(lead), sendCustomerWebhook(lead, "lead.created")]);
  } catch {
    return {
      ok: false,
      message: "접수 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 전화로 문의해 주세요.",
    };
  }

  return { ok: true, message: "접수되었습니다. 빠르게 연락드리겠습니다." };
}
