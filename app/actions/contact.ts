"use server";

import { addLead } from "@/lib/leads";
import type { VerticalKey } from "@/lib/verticals";

export interface ContactState {
  ok: boolean;
  message: string;
}

const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

export async function submitContact(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
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
  if (message.length > 1000) {
    return { ok: false, message: "문의 내용이 너무 깁니다(최대 1000자)." };
  }

  try {
    await addLead({ name, phone, message, vertical });
  } catch {
    return {
      ok: false,
      message: "접수 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 전화로 문의해 주세요.",
    };
  }

  return { ok: true, message: "접수되었습니다. 빠르게 연락드리겠습니다." };
}
