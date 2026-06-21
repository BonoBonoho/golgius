"use client";

import { useActionState, useEffect, useState } from "react";
import { submitContact, type ContactState } from "@/app/actions/contact";
import { deriveSource } from "@/lib/attribution";
import type { OfferingGroup, VerticalKey } from "@/lib/verticals";

const initial: ContactState = { ok: false, message: "" };

const inputCls =
  "mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]";

// 제출 값: "카테고리 · 세부품목" (어드민에서 맥락 확인용)
const itemKey = (group: string, item: string) => `${group} · ${item}`;

export default function ContactForm({
  vertical,
  cta,
  centerLabel,
  offerings,
}: {
  vertical: VerticalKey;
  cta: string;
  centerLabel: string;
  offerings: OfferingGroup[];
}) {
  const [state, action, pending] = useActionState(submitContact, initial);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [source, setSource] = useState("direct");
  useEffect(() => setSource(deriveSource()), []);

  const toggleOpen = (tag: string) => setOpen((o) => ({ ...o, [tag]: !o[tag] }));
  const togglePick = (key: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const countFor = (title: string) =>
    [...picked].filter((k) => k.startsWith(`${title} · `)).length;

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-7 text-center">
        <div className="text-2xl" style={{ color: "var(--accent)" }} aria-hidden>
          ✓
        </div>
        <p className="mt-3 font-bold">{state.message}</p>
        <p className="mt-1 text-sm text-dim">영업일 기준 빠르게 회신드리겠습니다.</p>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-2xl border border-line bg-surface p-7">
      <input type="hidden" name="vertical" value={vertical} />
      <input type="hidden" name="source" value={source} />
      {/* 허니팟(봇 방지) */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <label className="block">
        <span className="text-sm text-dim">{centerLabel} 이름 (선택)</span>
        <input name="center" type="text" placeholder={`예: 골지 ${centerLabel} 강남점`} className={inputCls} />
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-dim">이름</span>
          <input name="name" type="text" required minLength={2} placeholder="홍길동" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">연락처</span>
          <input name="phone" type="tel" required placeholder="010-0000-0000" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">이메일 (선택)</span>
          <input name="email" type="email" placeholder="name@example.com" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">희망 지역 (선택)</span>
          <input name="region" type="text" placeholder="예: 서울 강남구" className={inputCls} />
        </label>
      </div>

      {offerings.length > 0 && (
        <fieldset className="mt-5">
          <legend className="text-sm text-dim">관심 품목 (카테고리를 눌러 세부 선택)</legend>
          <div className="mt-2.5 space-y-2">
            {offerings.map((g) => {
              const n = countFor(g.title);
              const expanded = !!open[g.tag];
              return (
                <div
                  key={g.tag}
                  className="overflow-hidden rounded-xl border transition"
                  style={{ borderColor: n > 0 ? "var(--accent)" : "var(--color-line)" }}
                >
                  <button
                    type="button"
                    onClick={() => toggleOpen(g.tag)}
                    aria-expanded={expanded}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className={n > 0 ? "font-semibold text-ink" : "text-dim"}>{g.title}</span>
                      {n > 0 && (
                        <span
                          className="rounded-full px-1.5 text-xs font-semibold text-base"
                          style={{ backgroundColor: "var(--accent)" }}
                        >
                          {n}
                        </span>
                      )}
                    </span>
                    <span
                      className="text-dim transition-transform"
                      style={{ transform: expanded ? "rotate(180deg)" : "none" }}
                      aria-hidden
                    >
                      ▾
                    </span>
                  </button>
                  {expanded && (
                    <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
                      {g.items.map((item) => {
                        const key = itemKey(g.title, item);
                        const on = picked.has(key);
                        return (
                          <label
                            key={item}
                            className="cursor-pointer rounded-full border px-3 py-1 text-xs transition"
                            style={{
                              borderColor: on ? "var(--accent)" : "var(--color-line)",
                              color: on ? "var(--color-ink)" : "var(--color-dim)",
                            }}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={on}
                              onChange={() => togglePick(key)}
                            />
                            {item}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* 펼침 여부와 무관하게 선택 항목을 제출 */}
          {[...picked].map((v) => (
            <input key={v} type="hidden" name="interest" value={v} />
          ))}
        </fieldset>
      )}

      <label className="mt-5 block">
        <span className="text-sm text-dim">문의 내용 (선택)</span>
        <textarea
          name="message"
          rows={4}
          placeholder="입지·평수·예산 등 알고 계신 정보를 적어주시면 상담이 빨라집니다."
          className="mt-1.5 w-full resize-none rounded-lg border border-line bg-base px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
        />
      </label>

      {!state.ok && state.message && (
        <p className="mt-4 text-sm" style={{ color: "#e2574a" }} role="alert">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-full px-6 py-3 text-sm font-semibold text-base transition hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: "var(--accent)" }}
      >
        {pending ? "접수 중…" : cta}
      </button>

      <p className="mt-3 text-center text-xs text-dim">
        제출 시 상담 목적의 연락처 수집·이용에 동의하는 것으로 간주됩니다.
      </p>
    </form>
  );
}
