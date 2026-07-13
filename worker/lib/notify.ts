// 관리자 알림 — 메인 앱 lib/notify.ts의 축약판(이메일/Resend만).
// 키는 app_settings(resend_api_key, resend_from, notify_email) 또는 동명 env.

import { loadSettings } from "./supabase.js";

export async function notifyAdmin(subject: string, html: string): Promise<void> {
  try {
    const s = await loadSettings();
    const apiKey = s.resend_api_key || process.env.RESEND_API_KEY || "";
    const from = s.resend_from || process.env.RESEND_FROM || "골지어스 <onboarding@resend.dev>";
    const to = s.notify_email || process.env.GOLGIUS_NOTIFY_EMAIL || "";
    if (!apiKey || !to) {
      console.log(`[notify] (no-op) ${subject}`);
      return;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) throw new Error(`resend ${res.status}`);
  } catch (e) {
    console.error("[notify] 실패:", (e as Error).message);
  }
}
