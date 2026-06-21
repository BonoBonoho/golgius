"use client";

import { useMemo, useRef, useState } from "react";

// 디자인 대상(면/품목). 각 면은 독립적으로 로고를 배치한다.
const VIEWS = [
  { key: "tee-front", label: "티셔츠 앞" },
  { key: "tee-back", label: "티셔츠 뒤" },
  { key: "pants", label: "바지" },
  { key: "towel", label: "수건" },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

const COLORS = ["#15151a", "#ffffff", "#1f3a5f", "#7a1f1f", "#1f5f3a", "#e0892b"];

function productSvg(type: ViewKey, color: string): string {
  const s = `stroke="#9a968e" stroke-width="0.7"`;
  if (type === "towel") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="16" y="18" width="68" height="64" rx="5" fill="${color}" ${s}/><rect x="16" y="68" width="68" height="6" fill="#00000022"/></svg>`;
  }
  if (type === "pants") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M30,16 L70,16 L73,86 L55,86 L50,50 L45,86 L27,86 Z" fill="${color}" ${s}/><rect x="30" y="16" width="40" height="5" fill="#00000022"/></svg>`;
  }
  if (type === "tee-back") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M36,16 L22,24 L11,36 L20,47 L27,42 L27,86 L73,86 L73,42 L80,47 L89,36 L78,24 L64,16 C58,22 42,22 36,16 Z" fill="${color}" ${s}/></svg>`;
  }
  // tee-front (V넥)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M36,16 L22,24 L11,36 L20,47 L27,42 L27,86 L73,86 L73,42 L80,47 L89,36 L78,24 L64,16 L57,27 L50,30 L43,27 Z" fill="${color}" ${s}/></svg>`;
}

interface Design {
  logo: string | null;
  x: number;
  y: number;
  scale: number;
}
const blankDesign = (): Design => ({ logo: null, x: 0.5, y: 0.45, scale: 0.25 });

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

const svgUrl = (type: ViewKey, color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(productSvg(type, color))}`;

export default function DesignStudio() {
  const [color, setColor] = useState(COLORS[0]);
  const [active, setActive] = useState<ViewKey>("tee-front");
  const [design, setDesign] = useState<Record<ViewKey, Design>>(() => ({
    "tee-front": blankDesign(),
    "tee-back": blankDesign(),
    pants: blankDesign(),
    towel: blankDesign(),
  }));
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Status>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const cur = design[active];
  const productUrl = useMemo(() => svgUrl(active, color), [active, color]);

  function updateActive(patch: Partial<Design>) {
    setDesign((d) => ({ ...d, [active]: { ...d[active], ...patch } }));
  }

  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => updateActive({ logo: String(reader.result) });
    reader.readAsDataURL(f);
  }

  function moveTo(clientX: number, clientY: number) {
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    updateActive({
      x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
    });
  }

  const designedViews = VIEWS.filter((v) => design[v.key].logo);

  async function buildComposite(): Promise<Blob | null> {
    const list = designedViews.length
      ? designedViews
      : [VIEWS.find((v) => v.key === active)!];
    const TILE = 560;
    const LABEL = 44;
    const canvas = document.createElement("canvas");
    canvas.width = TILE * list.length;
    canvas.height = TILE + LABEL;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#0b0b0d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      const d = design[v.key];
      const ox = i * TILE;
      const prod = await loadImg(svgUrl(v.key, color));
      ctx.drawImage(prod, ox, 0, TILE, TILE);
      if (d.logo) {
        const img = await loadImg(d.logo);
        const w = d.scale * TILE;
        const h = img.width ? (w * img.height) / img.width : w;
        ctx.drawImage(img, ox + d.x * TILE - w / 2, d.y * TILE - h / 2, w, h);
      }
      ctx.fillStyle = "#f4f2ed";
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(v.label, ox + TILE / 2, TILE + 30);
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
      const list = designedViews.length ? designedViews : [VIEWS.find((v) => v.key === active)!];
      fd.set("product_type", list.map((v) => v.label).join(", "));
      fd.set("color", color);
      const placements = list
        .map((v) => {
          const d = design[v.key];
          return `${v.label}: ${d.logo ? `로고 ${Math.round(d.x * 100)}%,${Math.round(d.y * 100)}% 크기${Math.round(d.scale * 100)}%` : "로고 없음"}`;
        })
        .join(" / ");
      const note = `[디자인 스튜디오] 색상:${color} / ${placements}`;
      fd.set("message", `${note}${userMsg ? "\n" + userMsg : ""}`);

      const composite = await buildComposite();
      if (composite) fd.set("file", composite, "design-preview.png");

      const res = await fetch("/api/order", { method: "POST", body: fd });
      const data = (await res.json()) as Status;
      setResult(data);
      if (data?.ok) {
        form.reset();
        setDesign({
          "tee-front": blankDesign(),
          "tee-back": blankDesign(),
          pants: blankDesign(),
          towel: blankDesign(),
        });
      }
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
        <p className="mt-1 text-sm text-dim">디자인한 면들의 미리보기가 함께 전달되었습니다.</p>
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
      {/* 미리보기 */}
      <div>
        {/* 면 선택 */}
        <div className="mb-3 flex flex-wrap gap-2">
          {VIEWS.map((v) => {
            const isActive = active === v.key;
            const hasLogo = !!design[v.key].logo;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setActive(v.key)}
                className="rounded-full border px-3.5 py-1.5 text-sm font-semibold transition"
                style={
                  isActive
                    ? { color: "var(--color-gold)", borderColor: "var(--color-gold)" }
                    : { color: "var(--color-dim)", borderColor: "var(--color-line)" }
                }
              >
                {v.label}
                {hasLogo && " ●"}
              </button>
            );
          })}
        </div>

        <div
          ref={stageRef}
          className="relative aspect-square w-full overflow-hidden rounded-2xl border border-line bg-base"
          onPointerMove={(e) => dragging.current && moveTo(e.clientX, e.clientY)}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => (dragging.current = false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productUrl} alt="제품 미리보기" className="pointer-events-none absolute inset-0 h-full w-full object-contain p-6" draggable={false} />
          {cur.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cur.logo}
              alt="로고"
              draggable={false}
              onPointerDown={(e) => {
                dragging.current = true;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
              }}
              style={{
                left: `${cur.x * 100}%`,
                top: `${cur.y * 100}%`,
                width: `${cur.scale * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
              className="absolute cursor-move touch-none select-none"
            />
          )}
          {!cur.logo && (
            <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-dim">
              로고를 업로드하면 이 면에 올려 배치할 수 있어요
            </p>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <span className="text-sm text-dim">제품 색상 (전체 공통)</span>
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

          {cur.logo && (
            <label className="block">
              <span className="text-sm text-dim">로고 크기 ({VIEWS.find((v) => v.key === active)!.label})</span>
              <input
                type="range"
                min={0.08}
                max={0.6}
                step={0.01}
                value={cur.scale}
                onChange={(e) => updateActive({ scale: Number(e.target.value) })}
                className="mt-2 w-full"
              />
            </label>
          )}
        </div>
      </div>

      {/* 발주 폼 */}
      <form onSubmit={onSubmit}>
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

        <label className="block">
          <span className="text-sm text-dim">
            로고·시안 업로드 — 현재 면: {VIEWS.find((v) => v.key === active)!.label}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={onLogoFile}
            className="mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-sm text-dim file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-base file:font-semibold"
          />
          <span className="mt-1.5 block text-xs text-dim">
            면을 바꿔가며 각각 로고를 올릴 수 있습니다. 디자인한 면은 칩에 ● 로 표시됩니다.
          </span>
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
          디자인한 면들을 한 장의 미리보기로 합쳐 발주 요청에 첨부합니다.
        </p>
      </form>
    </div>
  );
}
