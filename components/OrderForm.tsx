"use client";

import { useState } from "react";

type Status = { ok: boolean; message: string } | null;

const inputCls =
  "mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-3 text-sm outline-none transition focus:border-gold";

export default function OrderForm() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Status>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/order", { method: "POST", body: new FormData(form) });
      const data = (await res.json()) as { ok: boolean; message: string };
      setResult(data);
      if (data.ok) form.reset();
    } catch {
      setResult({ ok: false, message: "네트워크 오류입니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setPending(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <div className="text-2xl text-gold" aria-hidden>
          ✓
        </div>
        <p className="mt-3 font-bold">{result.message}</p>
        <button
          onClick={() => setResult(null)}
          className="mt-5 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-dim transition hover:text-ink"
        >
          추가 발주 요청
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-surface p-7">
      {/* 허니팟 */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-dim">이름 / 업체명</span>
          <input name="name" required minLength={2} placeholder="홍길동 / 골지짐" className={inputCls} />
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
          <span className="text-sm text-dim">품목</span>
          <select name="product_type" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              선택하세요
            </option>
            <option value="운동복">운동복</option>
            <option value="수건">수건</option>
            <option value="기타">기타</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-dim">색상 (선택)</span>
          <input name="color" placeholder="예: 블랙 / 네이비" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">사이즈 (선택)</span>
          <input name="size" placeholder="예: M, L, XL 혼합" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">수량 (선택)</span>
          <input name="quantity" inputMode="numeric" placeholder="예: 100" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">로고·시안 파일 (선택, 4MB 이하)</span>
          <input
            name="file"
            type="file"
            accept="image/*,.pdf,.ai,.psd"
            className="mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-sm text-dim file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-base file:font-semibold"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-sm text-dim">추가 요청 (선택)</span>
        <textarea
          name="message"
          rows={4}
          placeholder="납기 희망일, 인쇄 위치, 참고 사항 등을 적어주세요."
          className="mt-1.5 w-full resize-none rounded-lg border border-line bg-base px-4 py-3 text-sm outline-none transition focus:border-gold"
        />
      </label>

      {result && !result.ok && (
        <p className="mt-4 text-sm" style={{ color: "#e2574a" }} role="alert">
          {result.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-base transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "전송 중…" : "발주 견적 요청"}
      </button>
      <p className="mt-3 text-center text-xs text-dim">
        제출 시 견적 상담 목적의 연락처 수집·이용에 동의하는 것으로 간주됩니다.
      </p>
    </form>
  );
}
