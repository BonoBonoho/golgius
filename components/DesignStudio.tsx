"use client";

import { useMemo, useRef, useState } from "react";

// 제품 목업 (100x100 viewBox, fill 색상 교체 가능)
const PRODUCTS = [
  { key: "tshirt", label: "운동복(티셔츠)", orderType: "운동복" },
  { key: "towel", label: "수건", orderType: "수건" },
] as const;
type ProductKey = (typeof PRODUCTS)[number]["key"];

const COLORS = ["#15151a", "#ffffff", "#1f3a5f", "#7a1f1f", "#1f5f3a", "#e0892b"];

function productSvg(type: ProductKey, color: string): string {
  const stroke = `stroke="#9a968e" stroke-width="0.7"`;
  if (type === "towel") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="16" y="18" width="68" height="64" rx="5" fill="${color}" ${stroke}/><rect x="16" y="68" width="68" height="6" fill="#00000022"/></svg>`;
  }
  // tshirt
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M36,16 L22,24 L11,36 L20,47 L27,42 L27,86 L73,86 L73,42 L80,47 L89,36 L78,24 L64,16 C58,24 42,24 36,16 Z" fill="${color}" ${stroke}/></svg>`;
}

const inputCls =
  "mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-3 text-sm outline-none transition focus:border-gold";

type Status = { ok: boolean; message: string } | null;

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

export default function DesignStudio() {
  const [product, setProduct] = useState<ProductKey>("tshirt");
  const [color, setColor] = useState(COLORS[0]);
  const [logo, setLogo] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0.5, y: 0.45 }); // stage 비율 좌표
  const [scale, setScale] = useState(0.25); // stage 폭 대비
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Status>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const productUrl = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(productSvg(product, color))}`,
    [product, color]
  );

  const orderType = PRODUCTS.find((p) => p.key === product)!.orderType;

  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(f);
  }

  function moveTo(clientX: number, clientY: number) {
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    setPos({ x, y });
  }

  async function buildComposite(): Promise<Blob | null> {
    const S = 600;
    const canvas = document.createElement("canvas");
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const prod = await loadImg(productUrl);
    ctx.drawImage(prod, 0, 0, S, S);
    if (logo) {
      const img = await loadImg(logo);
      const w = scale * S;
      const h = img.width ? (w * img.height) / img.width : w;
      ctx.drawImage(img, pos.x * S - w / 2, pos.y * S - h / 2, w, h);
    }
    return await new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    setResult(null);
    try {
      const fd = new FormData(form);
      const userMsg = String(fd.get("message") ?? "");
      fd.set("product_type", orderType);
      fd.set("color", color);
      const note = `[디자인 스튜디오] 제품:${orderType} / 색상:${color} / 로고위치:${Math.round(
        pos.x * 100
      )}%,${Math.round(pos.y * 100)}% / 크기:${Math.round(scale * 100)}%`;
      fd.set("message", `${note}${userMsg ? "\n" + userMsg : ""}`);

      const composite = await buildComposite();
      if (composite) fd.set("file", composite, "design-preview.png");

      const res = await fetch("/api/order", { method: "POST", body: fd });
      const data = (await res.json()) as Status;
      setResult(data);
      if (data?.ok) form.reset();
    } catch {
      setResult({ ok: false, message: "전송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." });
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
        <p className="mt-1 text-sm text-dim">미리보기 이미지가 함께 전달되었습니다.</p>
        <button
          onClick={() => setResult(null)}
          className="mt-5 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-dim transition hover:text-ink"
        >
          새 디자인 만들기
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* 미리보기 무대 */}
      <div>
        <div
          ref={stageRef}
          className="relative aspect-square w-full overflow-hidden rounded-2xl border border-line bg-base"
          onPointerMove={(e) => dragging.current && moveTo(e.clientX, e.clientY)}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => (dragging.current = false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productUrl} alt="제품 미리보기" className="pointer-events-none absolute inset-0 h-full w-full object-contain p-6" draggable={false} />
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt="로고"
              draggable={false}
              onPointerDown={(e) => {
                dragging.current = true;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
              }}
              style={{
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                width: `${scale * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
              className="absolute cursor-move touch-none select-none"
            />
          )}
          {!logo && (
            <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-dim">
              로고를 업로드하면 여기에 올려 배치할 수 있어요
            </p>
          )}
        </div>

        {/* 제품·색상·크기 컨트롤 */}
        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            {PRODUCTS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setProduct(p.key)}
                className="rounded-full border px-4 py-2 text-sm font-semibold transition"
                style={
                  product === p.key
                    ? { color: "var(--color-gold)", borderColor: "var(--color-gold)" }
                    : { color: "var(--color-dim)", borderColor: "var(--color-line)" }
                }
              >
                {p.label}
              </button>
            ))}
          </div>

          <div>
            <span className="text-sm text-dim">제품 색상</span>
            <div className="mt-2 flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`색상 ${c}`}
                  onClick={() => setColor(c)}
                  className="h-8 w-8 rounded-full border transition"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "var(--color-gold)" : "var(--color-line)",
                    borderWidth: color === c ? 2 : 1,
                  }}
                />
              ))}
            </div>
          </div>

          {logo && (
            <label className="block">
              <span className="text-sm text-dim">로고 크기</span>
              <input
                type="range"
                min={0.08}
                max={0.6}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>
          )}
        </div>
      </div>

      {/* 발주 정보 폼 */}
      <form onSubmit={onSubmit}>
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

        <label className="block">
          <span className="text-sm text-dim">로고·시안 업로드</span>
          <input
            type="file"
            accept="image/*"
            onChange={onLogoFile}
            className="mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-sm text-dim file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-base file:font-semibold"
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            <span className="text-sm text-dim">수량 (선택)</span>
            <input name="quantity" inputMode="numeric" placeholder="예: 100" className={inputCls} />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-sm text-dim">추가 요청 (선택)</span>
          <textarea
            name="message"
            rows={3}
            placeholder="납기 희망일, 인쇄 방식 등"
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
          {pending ? "전송 중…" : "이 디자인으로 견적 요청"}
        </button>
        <p className="mt-3 text-center text-xs text-dim">
          미리보기 이미지가 발주 요청에 자동 첨부됩니다.
        </p>
      </form>
    </div>
  );
}
