// 신규 고객(리드) 접수 시 외부 워크스페이스로 푸시하는 웹훅.
// 환경변수:
//   GOLGIUS_WEBHOOK_URL     수신 엔드포인트(Milestone X 등). 미설정 시 no-op.
//   GOLGIUS_WEBHOOK_SECRET  (선택) 검증용 — x-webhook-secret 헤더로 전송.
//
// 실패해도 접수 흐름에 영향 없도록 호출부에서 await 후 무시(best-effort).

import { toCustomer } from "@/lib/customers";
import type { Lead } from "@/lib/leads";

export async function sendCustomerWebhook(lead: Lead, event = "lead.created"): Promise<boolean> {
  const url = (process.env.GOLGIUS_WEBHOOK_URL ?? "").trim();
  if (!url) return false;
  const secret = (process.env.GOLGIUS_WEBHOOK_SECRET ?? "").trim();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-webhook-secret": secret } : {}),
      },
      body: JSON.stringify({
        event,
        source: "golgius",
        sentAt: new Date().toISOString(),
        data: toCustomer(lead),
      }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
