"use server";

import { headers } from "next/headers";
import { isAuthed } from "@/lib/admin";
import { getLead } from "@/lib/leads";
import { sendIntakeLink } from "@/lib/notify";

export interface IntakeLinkResult {
  ok: boolean;
  link: string;
  sent: boolean;
  message: string;
}

export async function requestIntake(leadId: string): Promise<IntakeLinkResult> {
  if (!(await isAuthed())) {
    return { ok: false, link: "", sent: false, message: "권한이 없습니다." };
  }
  const lead = await getLead(leadId);
  if (!lead) {
    return { ok: false, link: "", sent: false, message: "리드를 찾을 수 없습니다." };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const link = `${proto}://${host}/intake?lead=${leadId}`;

  const sent = await sendIntakeLink(lead, link);

  return {
    ok: true,
    link,
    sent,
    message: sent
      ? "고객에게 문자/이메일로 발송했습니다. (링크도 복사됨)"
      : "알림 키 미설정 — 발송은 못 했어요. 복사된 링크를 직접 보내주세요.",
  };
}
