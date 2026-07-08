"use client";

import { useActionState } from "react";
import { upsertProduct, type ProductFormState } from "@/app/actions/products";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_BODY_PARTS,
  PRODUCT_DRIVE_TYPES,
  type Product,
} from "@/lib/products";

const inputCls =
  "mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-sm outline-none transition focus:border-gold";

export default function ProductForm({ product }: { product?: Product }) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    upsertProduct,
    { ok: false, message: "" }
  );

  return (
    <form action={formAction} className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-lg font-extrabold">{product ? "상품 수정" : "새 상품 등록"}</h2>
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-dim">상품명 (영어)</span>
          <input name="name" required minLength={2} defaultValue={product?.name} placeholder="Power Rack PR-500" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">상품명 (한국어)</span>
          <input name="nameKo" defaultValue={product?.nameKo} placeholder="파워 랙" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">카테고리</span>
          <select name="category" required defaultValue={product?.category ?? ""} className={inputCls}>
            <option value="" disabled>선택하세요</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-dim">운동 부위</span>
          <select name="bodyPart" defaultValue={product?.bodyPart ?? ""} className={inputCls}>
            <option value="">선택 안 함</option>
            {PRODUCT_BODY_PARTS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-dim">세부 부위</span>
          <input name="bodyDetail" defaultValue={product?.bodyDetail} placeholder="가슴, 등, 대퇴/둔근…" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">구동 방식</span>
          <select name="driveType" defaultValue={product?.driveType ?? ""} className={inputCls}>
            <option value="">선택 안 함</option>
            {PRODUCT_DRIVE_TYPES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-dim">브랜드</span>
          <input name="brand" defaultValue={product?.brand ?? "MC"} placeholder="MC" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-dim">가격 (원, 비우면 &quot;견적 문의&quot;)</span>
          <input name="price" inputMode="numeric" defaultValue={product?.price ?? ""} placeholder="1850000" className={inputCls} />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-sm text-dim">요약 설명</span>
        <textarea name="summary" required rows={2} defaultValue={product?.summary} placeholder="상업용 풀사이즈 파워 랙…" className={`${inputCls} resize-none`} />
      </label>

      <label className="mt-4 block">
        <span className="text-sm text-dim">스펙 (한 줄에 하나, &quot;라벨: 값&quot; 형식)</span>
        <textarea
          name="specs"
          rows={4}
          defaultValue={product?.specs.map((s) => `${s.label}: ${s.value}`).join("\n")}
          placeholder={"크기: 1400 × 1500 × 2300mm\n최대 하중: 500kg"}
          className={`${inputCls} resize-none font-mono`}
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm text-dim">이미지 추가 (4MB 이하, 대표 이미지로 등록됨)</span>
        <input
          name="image"
          type="file"
          accept="image/*"
          className="mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-sm text-dim file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-base file:font-semibold"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" defaultChecked={product?.featured} className="accent-[var(--color-gold)]" />
          추천(BEST) 표시
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-dim">상태</span>
          <select name="status" defaultValue={product?.status ?? "active"} className="rounded-lg border border-line bg-base px-3 py-1.5 text-sm">
            <option value="active">공개</option>
            <option value="hidden">숨김</option>
          </select>
        </label>
      </div>

      {!state.ok && state.message && (
        <p className="mt-4 text-sm" style={{ color: "#e2574a" }} role="alert">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-base transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "저장 중…" : product ? "수정 저장" : "상품 등록"}
      </button>
    </form>
  );
}
