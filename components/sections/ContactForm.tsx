"use client";

import { useActionState } from "react";
import { submitContact, type ContactState } from "@/app/actions/contact";
import type { VerticalKey } from "@/lib/verticals";

const initial: ContactState = { ok: false, message: "" };

const inputCls =
  "mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]";

export default function ContactForm({
  vertical,
  cta,
  centerLabel,
  interests,
}: {
  vertical: VerticalKey;
  cta: string;
  centerLabel: string; // "헬스장" | "병원"
  interests: string[]; // 관심 품목 체크 옵션
}) {
  const [state, action, pending] = useActionState(submitContact, initial);

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
      {/* 허니팟(봇 방지) — 사용자에게는 숨김 */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <label className="block">
        <span className="text-sm text-dim">{centerLabel} 이름 (선택)</span>
        <input
          name="center"
          type="text"
          placeholder={`예: 골지 ${centerLabel} 강남점`}
          className={inputCls}
        />
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

      {interests.length > 0 && (
        <fieldset className="mt-5">
          <legend className="text-sm text-dim">관심 품목 (복수 선택)</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {interests.map((item) => (
              <label
                key={item}
                className="cursor-pointer rounded-full border border-line px-3.5 py-1.5 text-xs text-dim transition has-[:checked]:border-[var(--accent)] has-[:checked]:text-ink hover:border-ink"
              >
                <input type="checkbox" name="interest" value={item} className="peer sr-only" />
                <span className="peer-checked:font-semibold">{item}</span>
              </label>
            ))}
          </div>
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
