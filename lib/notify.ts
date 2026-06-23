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
import type { Order } from "@/lib/orders";
import type { Intake } from "@/lib/intakes";
import { verticals } from "@/lib/verticals";
import { getNotifyConfig, type NotifyConfig } from "@/lib/settings";

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

async function sendEmail(lead: Lead, cfg: NotifyConfig): Promise<void> {
  const apiKey = cfg.resendApiKey;
  if (!apiKey) return; // 미설정 → no-op
  const from = cfg.resendFrom || "골지어스 <onboarding@resend.dev>";
  const label = verticals[lead.vertical].label;
  const notifyTo = cfg.notifyEmail;

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

async function sendSms(lead: Lead, cfg: NotifyConfig): Promise<void> {
  const apiKey = cfg.solapiApiKey;
  const apiSecret = cfg.solapiApiSecret;
  const sender = digits(cfg.solapiSender);
  if (!apiKey || !apiSecret || !sender) return; // 미설정 → no-op

  const label = verticals[lead.vertical].label;
  const notifyPhone = digits(cfg.notifyPhone);
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
  const cfg = await getNotifyConfig();
  await Promise.allSettled([
    sendEmail(lead, cfg),
    sendSms(lead, cfg),
    // sendAlimtalk(lead, cfg),  // Phase 5
  ]);
}

// ── 신규 발주 알림 ──────────────────────────────────────
async function orderEmail(order: Order, cfg: NotifyConfig): Promise<void> {
  const apiKey = cfg.resendApiKey;
  const notifyTo = cfg.notifyEmail;
  if (!apiKey || !notifyTo) return;
  const from = cfg.resendFrom || "골지어스 <onboarding@resend.dev>";
  const o = order.options;
  const html = `
    <h2>신규 발주 요청</h2>
    <ul>
      <li><b>이름</b>: ${order.name}</li>
      <li><b>연락처</b>: ${order.phone}</li>
      <li><b>이메일</b>: ${order.email || "-"}</li>
      <li><b>품목</b>: ${order.productType}</li>
      <li><b>옵션</b>: 색 ${o.color || "-"} / 사이즈 ${o.size || "-"} / 수량 ${o.quantity || "-"}</li>
      <li><b>요청</b>: ${order.message || "-"}</li>
      <li><b>시안</b>: ${order.designFile ? "첨부됨(관리자에서 확인)" : "없음"}</li>
    </ul>`;
  await resendSend(apiKey, from, notifyTo, `[골지어스] 신규 발주 요청 — ${order.name}`, html);
}

async function orderSms(order: Order, cfg: NotifyConfig): Promise<void> {
  const { solapiApiKey, solapiApiSecret } = cfg;
  const sender = digits(cfg.solapiSender);
  const notifyPhone = digits(cfg.notifyPhone);
  if (!solapiApiKey || !solapiApiSecret || !sender || !notifyPhone) return;
  await solapiSend(solapiApiKey, solapiApiSecret, {
    to: notifyPhone,
    from: sender,
    text: `[골지어스] 신규 발주 요청\n${order.name} / ${order.phone} / ${order.productType}`,
  });
}

export async function notifyNewOrder(order: Order): Promise<void> {
  const cfg = await getNotifyConfig();
  await Promise.allSettled([orderEmail(order, cfg), orderSms(order, cfg)]);
}

// ── 신규 서류·정보 제출 알림 ────────────────────────────
async function intakeEmail(intake: Intake, cfg: NotifyConfig): Promise<void> {
  const apiKey = cfg.resendApiKey;
  const notifyTo = cfg.notifyEmail;
  if (!apiKey || !notifyTo) return;
  const from = cfg.resendFrom || "골지어스 <onboarding@resend.dev>";
  const html = `
    <h2>신규 서류·정보 제출</h2>
    <ul>
      <li><b>담당자</b>: ${intake.name} (${intake.phone})</li>
      <li><b>이메일</b>: ${intake.email}</li>
      <li><b>설치 주소</b>: ${intake.address}</li>
      <li><b>출금일</b>: ${intake.withdrawalDay}일</li>
      <li><b>설치요청일</b>: ${intake.installDate || "-"}</li>
      <li><b>서류</b>: 사업자등록증 ${intake.bizFile ? "O" : "X"} / 통장·카드 ${intake.bankFiles.length}건</li>
    </ul>
    <p>관리자에서 서류를 확인하세요.</p>`;
  await resendSend(apiKey, from, notifyTo, `[골지어스] 서류·정보 제출 — ${intake.name}`, html);
}

async function intakeSms(intake: Intake, cfg: NotifyConfig): Promise<void> {
  const { solapiApiKey, solapiApiSecret } = cfg;
  const sender = digits(cfg.solapiSender);
  const notifyPhone = digits(cfg.notifyPhone);
  if (!solapiApiKey || !solapiApiSecret || !sender || !notifyPhone) return;
  await solapiSend(solapiApiKey, solapiApiSecret, {
    to: notifyPhone,
    from: sender,
    text: `[골지어스] 서류·정보 제출\n${intake.name} / ${intake.phone}`,
  });
}

export async function notifyNewIntake(intake: Intake): Promise<void> {
  const cfg = await getNotifyConfig();
  await Promise.allSettled([intakeEmail(intake, cfg), intakeSms(intake, cfg)]);
}

// ── 고객에게 서류 요청 링크 발송 (담당자 버튼 → 고객 문자/이메일) ──
export async function sendIntakeLink(lead: Lead, link: string): Promise<boolean> {
  const cfg = await getNotifyConfig();
  let sent = false;

  // 문자 (Solapi) → 고객 휴대폰
  const sender = digits(cfg.solapiSender);
  if (cfg.solapiApiKey && cfg.solapiApiSecret && sender && lead.phone) {
    try {
      await solapiSend(cfg.solapiApiKey, cfg.solapiApiSecret, {
        to: digits(lead.phone),
        from: sender,
        text: `[골지어스] ${lead.name}님, 견적·설치를 위한 서류·정보 제출 페이지입니다.\n${link}`,
      });
      sent = true;
    } catch {
      // ignore
    }
  }

  // 이메일 (Resend) → 고객 이메일
  if (cfg.resendApiKey && lead.email) {
    const from = cfg.resendFrom || "골지어스 <onboarding@resend.dev>";
    try {
      await resendSend(
        cfg.resendApiKey,
        from,
        lead.email,
        "[골지어스] 서류·정보 제출 안내",
        `<p>${lead.name}님, 견적·설치를 위해 아래 페이지에서 서류와 정보를 제출해 주세요.</p>
         <p><a href="${link}">${link}</a></p>`
      );
      sent = true;
    } catch {
      // ignore
    }
  }

  return sent;
}
