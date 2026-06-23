"use client";

import { useState } from "react";

type Status = { ok: boolean; message: string } | null;

const inputCls =
  "mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-3 text-sm outline-none transition focus:border-gold";
const fileCls =
  "mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-sm text-dim file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-base file:font-semibold";

export default function IntakeForm() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Status>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/intake", { method: "POST", body: new FormData(form) });
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
        <p className="mt-1 text-sm text-dim">제출하신 서류와 정보는 안전하게 보관되며 담당자만 확인합니다.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-surface p-7">
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {/* 필수 서류 */}
      <p className="text-sm font-bold">필수 서류</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-dim">사업자등록증</span>
          <input name="biz_file" type="file" accept="image/*,.pdf" required className={fileCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">통장사본 또는 카드 앞뒷면</span>
          <input name="bank_files" type="file" accept="image/*,.pdf" multiple required className={fileCls} />
          <span className="mt-1 block text-xs text-dim">여러 장이면 한 번에 선택하세요 (각 4MB 이하)</span>
        </label>
      </div>

      {/* 필수 정보 */}
      <p className="mt-7 text-sm font-bold">필수 정보</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-dim">담당자 성함</span>
          <input name="name" type="text" required minLength={2} placeholder="홍길동" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">담당자 휴대폰번호</span>
          <input name="phone" type="tel" required placeholder="010-0000-0000" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">사내 내선번호 (선택)</span>
          <input name="ext" type="text" placeholder="예: 1234" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">이메일주소</span>
          <input name="email" type="email" required placeholder="name@example.com" className={inputCls} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm text-dim">설치받으실 주소</span>
          <input name="address" type="text" required placeholder="예: 경기 남양주시 오남읍 양지로 1 대박프라자 2층" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">출금일 선택</span>
          <select name="withdrawal_day" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              선택하세요
            </option>
            <option value="10">10일</option>
            <option value="15">15일</option>
            <option value="20">20일</option>
            <option value="25">25일</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-dim">설치요청일</span>
          <input name="install_date" type="text" placeholder="예: 최대한 빠르게 / 2026-07-01" className={inputCls} />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-sm text-dim">추가 요청 (선택)</span>
        <textarea
          name="note"
          rows={3}
          placeholder="전달하실 내용이 있으면 적어주세요."
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
        {pending ? "제출 중…" : "제출하기"}
      </button>
      <p className="mt-3 text-center text-xs text-dim">
        제출하신 서류·정보는 견적·설치 목적에 한해 사용되며 담당자만 열람합니다.
      </p>
    </form>
  );
}
