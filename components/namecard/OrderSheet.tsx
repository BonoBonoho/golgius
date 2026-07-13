"use client";

// 발주 요청 시트 — 인쇄 옵션 + 연락처 입력 → /api/design-agent/order
// 결제 없음(견적 요청 기반). CMYK 색상차 안내 포함.

import { useState } from "react";
import type { Design } from "./NamecardAgent";

// 성원애드피아 일반지명함(GNC1001) 실제 옵션 기준
const PAPERS = ["스노우지 250g", "스노우지 300g"];
const QUANTITIES = ["500", "1000", "2000"];
const SIDES = [
  { value: "double", label: "양면" },
  { value: "single", label: "단면" },
];
const COATINGS = [
  { value: "matte", label: "무광 코팅" },
  { value: "gloss", label: "유광 코팅" },
  { value: "none", label: "코팅 없음" },
];

const inputCls =
  "mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-sm outline-none focus:border-gold";

export default function OrderSheet({
  design,
  logoDataUrl,
  onClose,
}: {
  design: Design;
  logoDataUrl: string | null;
  onClose: () => void;
}) {
  const [paper, setPaper] = useState(PAPERS[0]);
  const [quantity, setQuantity] = useState(QUANTITIES[0]);
  const [sides, setSides] = useState(SIDES[0].value);
  const [coating, setCoating] = useState(COATINGS[0].value);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [memo, setMemo] = useState("");
  const [company, setCompany] = useState(""); // 허니팟
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/design-agent/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          memo,
          company,
          options: { paper, quantity, sides, coating },
          design: {
            front_svg: design.frontSvg,
            back_svg: design.backSvg,
            palette: design.palette,
            fonts: design.fonts,
            summary: design.summary,
          },
          logo: logoDataUrl,
        }),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      setResult(data);
    } catch {
      setResult({ ok: false, message: "전송에 실패했어요. 잠시 후 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-surface p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {result?.ok ? (
          <div className="py-8 text-center">
            <p className="eyebrow">order received</p>
            <h3 className="mt-3 text-xl font-bold">발주 요청이 접수됐어요</h3>
            <p className="mt-3 text-sm leading-relaxed text-dim">{result.message}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-base transition hover:opacity-90"
            >
              닫기
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">place order</p>
                <h3 className="mt-2 text-lg font-bold">명함 발주 요청</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-dim hover:text-ink"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 font-mono text-[0.7rem] text-dim">
              시안: {design.summary || "채팅으로 만든 명함"}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="text-sm text-dim">
                용지
                <select value={paper} onChange={(e) => setPaper(e.target.value)} className={inputCls}>
                  {PAPERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-dim">
                수량
                <select value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls}>
                  {QUANTITIES.map((q) => (
                    <option key={q} value={q}>{q}매</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-dim">
                인쇄
                <select value={sides} onChange={(e) => setSides(e.target.value)} className={inputCls}>
                  {SIDES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-dim">
                코팅
                <select value={coating} onChange={(e) => setCoating(e.target.value)} className={inputCls}>
                  {COATINGS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm text-dim">
                이름 *
                <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className={inputCls} />
              </label>
              <label className="block text-sm text-dim">
                연락처 *
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="010-0000-0000"
                  className={inputCls}
                />
              </label>
              <label className="block text-sm text-dim">
                이메일
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </label>
              <label className="block text-sm text-dim">
                요청 사항
                <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} maxLength={1000} className={inputCls} />
              </label>
              {/* 허니팟 — 사람은 채우지 않음 */}
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                name="company"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden
              />
            </div>

            <p className="mt-4 rounded-lg border border-line bg-base/60 px-4 py-3 text-[0.72rem] leading-relaxed text-dim">
              모니터(RGB)와 실제 인쇄(CMYK) 색상은 다소 차이가 날 수 있어요. 접수 후
              담당자가 견적·일정을 확인해 연락드리며, 확정 전에는 인쇄가 진행되지
              않습니다.
            </p>

            {result && !result.ok && (
              <p className="mt-3 text-sm text-red-400">⚠ {result.message}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-base transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "전송 중…" : "발주 요청 보내기"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
