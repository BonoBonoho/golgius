"use client";

// 수동 파일 발주 — 완성한 명함 파일(PDF 또는 앞/뒷면 이미지) 업로드 → 옵션·연락처 → 발주.
// PDF 1개면 그대로, 이미지면 서버가 인쇄 규격 PDF로 변환. /api/design-agent/order-upload

import { useRef, useState } from "react";

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

const ACCEPT = "image/png,image/jpeg,application/pdf";

type FaceState = { file: File | null; preview: string | null };

function FileDrop({
  label,
  hint,
  state,
  onPick,
}: {
  label: string;
  hint: string;
  state: FaceState;
  onPick: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const isPdf = state.file && /pdf$/i.test(state.file.type || state.file.name);
  return (
    <div>
      <p className="text-sm text-dim">{label}</p>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="mt-1.5 flex aspect-[92/52] w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-base transition hover:border-gold"
      >
        {state.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.preview} alt={label} className="h-full w-full object-contain" />
        ) : isPdf ? (
          <span className="font-mono text-xs text-gold">📄 {state.file?.name}</span>
        ) : (
          <span className="px-4 text-center font-mono text-[0.7rem] leading-relaxed text-dim">
            {hint}
            <br />
            PNG · JPG · PDF
          </span>
        )}
      </button>
      <input
        ref={ref}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function UploadOrder() {
  const [front, setFront] = useState<FaceState>({ file: null, preview: null });
  const [back, setBack] = useState<FaceState>({ file: null, preview: null });
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

  const pick = (setter: (s: FaceState) => void, prev: FaceState) => (f: File | null) => {
    if (prev.preview) URL.revokeObjectURL(prev.preview);
    if (!f) return setter({ file: null, preview: null });
    if (f.size > 20 * 1024 * 1024) {
      setResult({ ok: false, message: "파일은 각 20MB 이하만 가능합니다." });
      return;
    }
    const isImage = /^image\/(png|jpeg)$/.test(f.type);
    setter({ file: f, preview: isImage ? URL.createObjectURL(f) : null });
  };

  const frontIsPdf = front.file && (/pdf$/i.test(front.file.type) || /\.pdf$/i.test(front.file.name));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!front.file) {
      setResult({ ok: false, message: "명함 파일을 업로드해 주세요." });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("front", front.file);
      if (back.file && !frontIsPdf) fd.set("back", back.file);
      fd.set("paper", paper);
      fd.set("quantity", quantity);
      fd.set("sides", sides);
      fd.set("coating", coating);
      fd.set("name", name);
      fd.set("phone", phone);
      fd.set("email", email);
      fd.set("memo", memo);
      fd.set("company", company);
      const res = await fetch("/api/design-agent/order-upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; message: string };
      setResult(data);
    } catch {
      setResult({ ok: false, message: "전송에 실패했어요. 잠시 후 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  if (result?.ok) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center">
        <p className="eyebrow">order received</p>
        <h3 className="mt-3 text-xl font-bold">발주 요청이 접수됐어요</h3>
        <p className="mt-3 text-sm leading-relaxed text-dim">{result.message}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-6 md:p-8"
    >
      <p className="eyebrow">upload &amp; order</p>
      <h2 className="mt-2 text-xl font-bold">완성한 명함 파일로 발주</h2>
      <p className="mt-2 text-sm leading-relaxed text-dim">
        직접 디자인한 명함 파일을 올려 바로 발주하세요. 완성본 PDF 한 개(앞·뒤 포함) 또는 앞/뒷면
        이미지를 올리면 됩니다.
      </p>

      {/* 파일 업로드 */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <FileDrop
          label="앞면 (또는 완성 PDF) *"
          hint="파일을 선택하세요"
          state={front}
          onPick={pick((s) => setFront(s), front)}
        />
        {!frontIsPdf && (
          <FileDrop
            label="뒷면 (선택)"
            hint="양면이면 추가"
            state={back}
            onPick={pick((s) => setBack(s), back)}
          />
        )}
      </div>
      {frontIsPdf && (
        <p className="mt-2 font-mono text-[0.68rem] text-dim">
          PDF는 앞·뒤가 포함된 완성본으로 그대로 접수됩니다.
        </p>
      )}

      {/* 인쇄 옵션 */}
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

      {/* 연락처 */}
      <div className="mt-4 space-y-3">
        <label className="block text-sm text-dim">
          이름 *
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className={inputCls} />
        </label>
        <label className="block text-sm text-dim">
          연락처 *
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="010-0000-0000" className={inputCls} />
        </label>
        <label className="block text-sm text-dim">
          이메일
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </label>
        <label className="block text-sm text-dim">
          요청 사항
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} maxLength={1000} className={inputCls} />
        </label>
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
        인쇄 규격은 90×50mm(도련 포함 92×52mm)입니다. 이미지는 규격에 꽉 맞게 배치되며 가장자리 일부가
        재단될 수 있어요. 모니터(RGB)와 인쇄(CMYK) 색상은 다소 차이날 수 있습니다. 접수 후 담당자가
        확인해 연락드립니다.
      </p>

      {result && !result.ok && <p className="mt-3 text-sm text-red-400">⚠ {result.message}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-base transition hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "전송 중…" : "발주 요청 보내기"}
      </button>
    </form>
  );
}
