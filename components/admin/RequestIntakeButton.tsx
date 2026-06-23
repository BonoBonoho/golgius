"use client";

import { useState, useTransition } from "react";
import { requestIntake } from "@/app/actions/intake-link";

export default function RequestIntakeButton({ leadId }: { leadId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onClick() {
    start(async () => {
      const r = await requestIntake(leadId);
      if (r.link) {
        try {
          await navigator.clipboard.writeText(r.link);
        } catch {
          // 클립보드 실패 무시 — 메시지로 안내
        }
      }
      setMsg(r.message || (r.ok ? "처리되었습니다." : "실패했습니다."));
      setTimeout(() => setMsg(null), 6000);
    });
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-md border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60"
        style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
      >
        {pending ? "처리 중…" : "서류 요청"}
      </button>
      {msg && <span className="max-w-[12rem] text-[11px] leading-snug text-dim">{msg}</span>}
    </span>
  );
}
