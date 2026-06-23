"use client";

import { useState, useTransition } from "react";
import { requestIntake } from "@/app/actions/intake-link";

export default function RequestIntakeButton({ leadId }: { leadId: string }) {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    start(async () => {
      const r = await requestIntake(leadId);
      setLink(r.link || null);
      setNote(r.message || null);
      setCopied(false);
      if (r.link) {
        try {
          await navigator.clipboard.writeText(r.link);
          setCopied(true);
        } catch {
          // 자동 복사 실패 — 사용자가 복사 버튼으로
        }
      }
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={generate}
        disabled={pending}
        className="rounded-md border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60"
        style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
      >
        {pending ? "생성 중…" : link ? "링크 재생성" : "서류 요청 링크"}
      </button>

      {link && (
        <div className="mt-2">
          <div className="flex items-center gap-1.5">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-line bg-base px-2 py-1 text-[11px] text-dim outline-none"
            />
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold text-base transition hover:opacity-90"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
          {note && <p className="mt-1 text-[11px] leading-snug text-dim">{note}</p>}
        </div>
      )}
    </div>
  );
}
