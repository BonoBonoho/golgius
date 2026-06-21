// 신규 리드 알림 — 모든 채널을 이 파일 한 곳에서 관리(스펙 §5, 규칙 5).
// 키 미설정 채널은 조용히 건너뛴다(no-op). 키 추가 시 자동 발송.
//
// 환경변수:
//   이메일(Resend):  RESEND_API_KEY, RESEND_FROM(선택), GOLGIUS_NOTIFY_EMAIL
//   문자(Solapi):    SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER, GOLGIUS_NOTIFY_PHONE
//
// 어떤 채널이 실패해도 다른 채널/접수에는 영향 없도록 Promise.allSettled 사용.

import { createHmac, randomBytes } from "crypto";
import type { Lead } from "@/lib/leads";
import { verticals } from "@/lib/verticals";

function env(k: string): string {
  return (process.env[k] ?? "").trim();
}

function digits(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

// ── 이메일 (Resend) ─────────────────────────────────────
async function resendSend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
}

async function sendEmail(lead: Lead): Promise<void> {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) return; // 미설정 → no-op
  const from = env("RESEND_FROM") || "골지어스 <onboarding@resend.dev>";
  const label = verticals[lead.vertical].label;
  const notifyTo = env("GOLGIUS_NOTIFY_EMAIL");

  const tasks: Promise<void>[] = [];

  // (a) 담당자에게 신규 리드 알림
  if (notifyTo) {
    const html = `
      <h2>신규 ${label} 문의</h2>
      <ul>
        <li><b>이름</b>: ${lead.name}</li>
        <li><b>연락처</b>: ${lead.phone}</li>
        <li><b>이메일</b>: ${lead.email || "-"}</li>
        <li><b>희망지역</b>: ${lead.region || "-"}</li>
        <li><b>분야</b>: ${label}</li>
        <li><b>내용</b>: ${lead.message || "-"}</li>
      </ul>`;
    tasks.push(
      resendSend(apiKey, from, notifyTo, `[골지어스] 신규 ${label} 문의 — ${lead.name}`, html)
    );
  }

  // (b) 고객에게 접수 확인 (이메일을 남긴 경우)
  if (lead.email) {
    const html = `
      <p>${lead.name}님, 골지어스에 ${label} 오픈 문의 주셔서 감사합니다.</p>
      <p>접수가 완료되었으며, 담당자가 빠르게 연락드리겠습니다.</p>`;
    tasks.push(
      resendSend(apiKey, from, lead.email, "[골지어스] 문의가 접수되었습니다", html)
    );
  }

  await Promise.allSettled(tasks);
}

// ── 문자 (Solapi) ───────────────────────────────────────
async function solapiSend(
  apiKey: string,
  apiSecret: string,
  message: { to: string; from: string; text: string }
): Promise<void> {
  const date = new Date().toISOString();
  const salt = randomBytes(32).toString("hex");
  const signature = createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  const res = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: {
      Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`solapi ${res.status}`);
}

async function sendSms(lead: Lead): Promise<void> {
  const apiKey = env("SOLAPI_API_KEY");
  const apiSecret = env("SOLAPI_API_SECRET");
  const sender = digits(env("SOLAPI_SENDER"));
  if (!apiKey || !apiSecret || !sender) return; // 미설정 → no-op

  const label = verticals[lead.vertical].label;
  const notifyPhone = digits(env("GOLGIUS_NOTIFY_PHONE"));
  const tasks: Promise<void>[] = [];

  // (a) 담당자에게 신규 리드 알림
  if (notifyPhone) {
    tasks.push(
      solapiSend(apiKey, apiSecret, {
        to: notifyPhone,
        from: sender,
        text: `[골지어스] 신규 ${label} 문의\n${lead.name} / ${lead.phone}${lead.region ? ` / ${lead.region}` : ""}`,
      })
    );
  }

  // (b) 고객에게 접수 확인
  tasks.push(
    solapiSend(apiKey, apiSecret, {
      to: digits(lead.phone),
      from: sender,
      text: `[골지어스] ${lead.name}님, ${label} 오픈 문의가 접수되었습니다. 담당자가 빠르게 연락드리겠습니다.`,
    })
  );

  await Promise.allSettled(tasks);
}

// ── 카카오 알림톡 (Phase 5에서 활성화) ──────────────────
// async function sendAlimtalk(lead: Lead): Promise<void> { ... }

export async function notifyNewLead(lead: Lead): Promise<void> {
  await Promise.allSettled([
    sendEmail(lead),
    sendSms(lead),
    // sendAlimtalk(lead),  // Phase 5
  ]);
}
